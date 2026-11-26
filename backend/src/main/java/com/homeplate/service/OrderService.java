package com.homeplate.service;

import com.homeplate.config.ApiException;
import com.homeplate.dto.Dtos;
import com.homeplate.entity.*;
import com.homeplate.entity.Enums.OrderStatus;
import com.homeplate.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

/** Daily-menu ordering, totals, payments and the order lifecycle. */
@Service
public class OrderService {
    private final FoodOrderRepository orders;
    private final KitchenRepository kitchens;
    private final MenuItemRepository menu;
    private final OfferRepository offers;
    private final ReviewRepository reviews;
    private final CustomRequestRepository requests;
    private final SettingsService settings;
    private final KitchenService kitchenService;
    private final NotificationService notify;

    /** In-app (bell) notifications. */
    @org.springframework.beans.factory.annotation.Autowired
    private InboxService inbox;

    @org.springframework.beans.factory.annotation.Autowired @org.springframework.context.annotation.Lazy
    private DailyMenuService dailyMenu;

    public OrderService(FoodOrderRepository orders, KitchenRepository kitchens, MenuItemRepository menu,
                        OfferRepository offers, ReviewRepository reviews, CustomRequestRepository requests,
                        SettingsService settings, KitchenService kitchenService, NotificationService notify) {
        this.orders = orders;
        this.kitchens = kitchens;
        this.menu = menu;
        this.offers = offers;
        this.reviews = reviews;
        this.requests = requests;
        this.settings = settings;
        this.kitchenService = kitchenService;
        this.notify = notify;
    }

    // ------------------------------------------------------------------ totals

    public record Totals(BigDecimal foodTotal, BigDecimal deliveryCharge, BigDecimal platformFee,
                         BigDecimal discount, BigDecimal total, String couponCode, String couponMessage) {}

    /** Active, unexpired offers that customers can use. */
    public List<Offer> liveOffers() {
        LocalDate today = LocalDate.now();
        return offers.findByActiveTrue().stream()
                .filter(o -> o.getValidTill() == null || !o.getValidTill().isBefore(today))
                .sorted(Comparator.comparing(Offer::getMinOrder, Comparator.nullsFirst(BigDecimal::compareTo)))
                .toList();
    }

    /** Discount an offer gives on this food total (zero when the minimum order isn't met). */
    public static BigDecimal discountFor(Offer o, BigDecimal foodTotal) {
        if (o.getMinOrder() != null && foodTotal.compareTo(o.getMinOrder()) < 0) return BigDecimal.ZERO;
        BigDecimal d = foodTotal.multiply(o.getDiscountPercent()).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        if (o.getMaxDiscount() != null && d.compareTo(o.getMaxDiscount()) > 0) d = o.getMaxDiscount();
        return d;
    }

    /**
     * couponCode: a code -> apply that coupon; blank/null -> automatically apply the best available offer;
     * "NONE" -> no discount (customer removed the offer).
     */
    public Totals computeTotals(BigDecimal foodTotal, String couponCode) {
        PlatformSettings s = settings.get();
        BigDecimal delivery = foodTotal.compareTo(s.getFreeDeliveryAbove()) >= 0 ? BigDecimal.ZERO : s.getDeliveryCharge();
        BigDecimal fee = s.getPlatformFee();
        BigDecimal discount = BigDecimal.ZERO;
        String applied = null;
        String msg = null;
        if (couponCode == null || couponCode.isBlank()) {
            Offer best = null; BigDecimal bestD = BigDecimal.ZERO;
            for (Offer o : liveOffers()) {
                BigDecimal d = discountFor(o, foodTotal);
                if (d.compareTo(bestD) > 0) { best = o; bestD = d; }
            }
            if (best != null) {
                discount = bestD;
                applied = best.getCode();
                msg = "Best offer applied automatically - you save Rs." + bestD.setScale(0, RoundingMode.HALF_UP);
            }
        } else if (!"NONE".equalsIgnoreCase(couponCode.trim())) {
            Optional<Offer> o = offers.findByCodeIgnoreCase(couponCode.trim());
            if (o.isEmpty() || !o.get().isActive()
                    || (o.get().getValidTill() != null && o.get().getValidTill().isBefore(LocalDate.now()))) {
                msg = "Coupon is invalid or expired";
            } else if (foodTotal.compareTo(o.get().getMinOrder()) < 0) {
                msg = "Add items worth Rs." + o.get().getMinOrder().subtract(foodTotal).setScale(0, RoundingMode.UP) + " more to use this coupon";
            } else {
                discount = foodTotal.multiply(o.get().getDiscountPercent()).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
                if (o.get().getMaxDiscount() != null && discount.compareTo(o.get().getMaxDiscount()) > 0) discount = o.get().getMaxDiscount();
                applied = o.get().getCode();
                msg = "Coupon applied! You saved Rs." + discount.setScale(0, RoundingMode.HALF_UP);
            }
        }
        BigDecimal total = foodTotal.add(delivery).add(fee).subtract(discount).max(BigDecimal.ZERO);
        return new Totals(foodTotal, delivery, fee, discount, total, applied, msg);
    }

    public Totals previewTotals(Dtos.QuoteTotalsRequest req) {
        BigDecimal food = BigDecimal.ZERO;
        for (Dtos.CartLine line : req.items()) {
            MenuItem item = menu.findById(line.menuItemId()).orElseThrow(() -> ApiException.notFound("Menu item not found"));
            food = food.add(effectivePrice(item).multiply(BigDecimal.valueOf(line.quantity())));
        }
        return computeTotals(food, req.couponCode());
    }

    private BigDecimal effectivePrice(MenuItem i) {
        return i.getOfferPrice() != null ? i.getOfferPrice() : i.getPrice();
    }

    private void applyCommission(FoodOrder o) {
        BigDecimal pct = settings.get().getCommissionPercent();
        BigDecimal commission = o.getFoodTotal().multiply(pct).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        o.setCommission(commission);
        // Self delivery: kitchen keeps the delivery charge. Coupon discounts are funded by the platform.
        o.setKitchenEarning(o.getFoodTotal().subtract(commission).add(o.getDeliveryCharge()));
    }

    // ------------------------------------------------------------------ place / pay

    @Transactional
    public FoodOrder place(User customer, Dtos.PlaceOrderRequest req) {
        Kitchen k = kitchens.findById(req.kitchenId()).orElseThrow(() -> ApiException.notFound("Kitchen not found"));
        if (!kitchenService.isVisible(k)) throw ApiException.badRequest("This kitchen is not available right now");
        if (!k.isAcceptingOrders()) throw ApiException.badRequest(k.getName() + " is not accepting orders right now");
        if (!dailyMenu.ready(k)) {
            throw ApiException.badRequest(k.getName() + "'s menu for today is awaiting HomePlate verification. Ordering opens once it is verified.");
        }
        if (k.getMaxDailyOrders() != null && kitchenService.todaysOrderCount(k.getId()) >= k.getMaxDailyOrders()) {
            throw ApiException.badRequest(k.getName() + " has reached today's order limit. Try another kitchen.");
        }
        Double distance = Geo.distanceKm(req.latitude(), req.longitude(), k.getLatitude(), k.getLongitude());
        if (distance != null && distance > Optional.ofNullable(k.getDeliveryRadiusKm()).orElse(5.0)) {
            throw ApiException.badRequest("Your address is " + distance + " km away. " + k.getName()
                    + " delivers within " + k.getDeliveryRadiusKm() + " km only.");
        }

        FoodOrder o = new FoodOrder();
        o.setCustomer(customer);
        o.setKitchen(k);
        o.setOrderType(Enums.OrderType.DAILY_MENU);
        BigDecimal food = BigDecimal.ZERO;
        for (Dtos.CartLine line : req.items()) {
            MenuItem item = menu.findById(line.menuItemId()).orElseThrow(() -> ApiException.notFound("Menu item not found"));
            if (!item.getKitchen().getId().equals(k.getId())) throw ApiException.badRequest("All items must be from the same kitchen");
            if (!item.isAvailable()) throw ApiException.badRequest(item.getName() + " is not available now");
            if (item.getQuantityAvailable() != null && item.getQuantityAvailable() < line.quantity()) {
                throw ApiException.badRequest("Only " + item.getQuantityAvailable() + " portions of " + item.getName() + " left");
            }
            OrderItem oi = new OrderItem();
            oi.setOrder(o);
            oi.setMenuItemId(item.getId());
            oi.setName(item.getName());
            oi.setImageUrl(item.getImageUrl());
            oi.setVeg(item.isVeg());
            oi.setUnitPrice(effectivePrice(item));
            oi.setQuantity(line.quantity());
            oi.setLineTotal(effectivePrice(item).multiply(BigDecimal.valueOf(line.quantity())));
            o.getItems().add(oi);
            food = food.add(oi.getLineTotal());
            if (item.getQuantityAvailable() != null) {
                item.setQuantityAvailable(item.getQuantityAvailable() - line.quantity());
                if (item.getQuantityAvailable() <= 0) item.setAvailable(false);
            }
            if (o.getMealSlot() == null) o.setMealSlot(item.getMealType());
        }
        Totals t = computeTotals(food, req.couponCode());
        o.setFoodTotal(t.foodTotal());
        o.setDeliveryCharge(t.deliveryCharge());
        o.setPlatformFee(t.platformFee());
        o.setDiscount(t.discount());
        o.setTotalAmount(t.total());
        o.setCouponCode(t.couponCode());
        if (t.couponCode() != null) offers.findByCodeIgnoreCase(t.couponCode())
                .ifPresent(of -> of.setUsageCount(java.util.Optional.ofNullable(of.getUsageCount()).orElse(0) + 1));
        if (t.couponCode() != null) offers.findByCodeIgnoreCase(t.couponCode()).ifPresent(of -> of.setUsageCount(of.getUsageCount() + 1));
        applyCommission(o);
        if (req.mealSlot() != null) o.setMealSlot(req.mealSlot());
        o.setDeliveryAddress(req.deliveryAddress());
        o.setDeliveryArea(req.deliveryArea());
        o.setDeliveryLatitude(req.latitude());
        o.setDeliveryLongitude(req.longitude());
        o.setDistanceKm(distance);
        o.setNotes(req.notes());
        o.setPaymentMethod(req.paymentMethod());
        int eta = Optional.ofNullable(k.getAvgPrepMinutes()).orElse(30) + (distance == null ? 15 : (int) Math.ceil(distance * 4) + 5);
        o.setEstimatedDeliveryAt(LocalDateTime.now().plusMinutes(eta));
        if (req.paymentMethod() == Enums.PaymentMethod.COD) {
            o.setStatus(OrderStatus.PLACED);
            o.setPaymentStatus(Enums.PaymentStatus.COD_PENDING);
        } else {
            o.setStatus(OrderStatus.PAYMENT_PENDING);
            o.setPaymentStatus(Enums.PaymentStatus.PENDING);
        }
        o = orders.save(o);
        o.setOrderNumber(String.format("HP%06d", 100000 + o.getId()));
        if (o.getStatus() == OrderStatus.PLACED) notifyKitchenNewOrder(o);
        return o;
    }

    /**
     * Mock payment confirmation. Replace the body with Razorpay / Stripe signature verification later;
     * the rest of the order lifecycle stays the same.
     */
    @Transactional
    public FoodOrder pay(User customer, Long orderId, Enums.PaymentMethod method) {
        FoodOrder o = customerOrder(customer, orderId);
        if (o.getStatus() != OrderStatus.PAYMENT_PENDING) throw ApiException.badRequest("This order is already paid");
        o.setPaymentMethod(method);
        if (method == Enums.PaymentMethod.COD) {
            o.setPaymentStatus(Enums.PaymentStatus.COD_PENDING);
        } else {
            o.setPaymentStatus(Enums.PaymentStatus.PAID);
            o.setPaymentReference("PAY-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        }
        if (o.getOrderType() == Enums.OrderType.CUSTOM_REQUEST) {
            // The kitchen already committed through its quotation, so the order is confirmed straight away.
            o.setStatus(OrderStatus.CONFIRMED);
            o.setConfirmedAt(LocalDateTime.now());
            requests.findById(o.getCustomRequestId()).ifPresent(r -> r.setStatus(Enums.RequestStatus.CONFIRMED));
        } else {
            o.setStatus(OrderStatus.PLACED);
        }
        notifyKitchenNewOrder(o);
        return o;
    }

    private void notifyKitchenNewOrder(FoodOrder o) {
        notify.sendSms(o.getKitchen().getOwner().getPhone(),
                "HomePlate: New order " + o.getOrderNumber() + " for Rs." + o.getTotalAmount() + ". Open your dashboard to accept.");
        inbox.push(o.getKitchen().getOwner(), "ORDER", "New order " + o.getOrderNumber(),
                "Rs." + o.getTotalAmount() + " - " + o.getItems().size() + " item(s). Accept it from your live order board.", "/kitchen/orders");
        boolean confirmed = o.getStatus() == OrderStatus.CONFIRMED;
        inbox.push(o.getCustomer(), "ORDER", confirmed ? "Order confirmed" : "Order placed",
                o.getOrderNumber() + " from " + o.getKitchen().getName()
                        + (confirmed ? " is confirmed and will be cooked fresh." : " was sent to the kitchen. You'll be notified when they accept it."),
                "/orders/" + o.getId());
    }

    private static String statusMessage(FoodOrder o, OrderStatus s) {
        String k = o.getKitchen().getName();
        return switch (s) {
            case CONFIRMED -> k + " accepted your order. Cooking starts soon.";
            case PREPARING -> k + " is cooking your food now.";
            case READY -> "Your food is packed and ready to leave " + k + ".";
            case OUT_FOR_DELIVERY -> "Your order is on the way! Track it live.";
            case DELIVERED -> "Delivered. Enjoy your meal - tap to rate " + k + ".";
            case REJECTED -> k + " couldn't take this order" + (o.getCancelReason() == null ? "." : ": " + o.getCancelReason()) + " Any payment is refunded.";
            case CANCELLED -> "Order cancelled" + (o.getCancelReason() == null ? "." : ": " + o.getCancelReason());
            default -> "Order status: " + s.name().replace('_', ' ').toLowerCase();
        };
    }

    /** Live location from the kitchen's delivery person (self-delivery), shown on the customer's tracking map. */
    @Transactional
    public FoodOrder updateRiderLocation(Kitchen kitchen, Long orderId, double lat, double lng) {
        FoodOrder o = orders.findById(orderId).orElseThrow(() -> ApiException.notFound("Order not found"));
        if (!o.getKitchen().getId().equals(kitchen.getId())) throw ApiException.forbidden("Not your order");
        if (o.getStatus() != OrderStatus.OUT_FOR_DELIVERY) throw ApiException.badRequest("Live location is shared only while the order is out for delivery");
        o.setRiderLatitude(lat);
        o.setRiderLongitude(lng);
        o.setRiderUpdatedAt(LocalDateTime.now());
        return o;
    }

    // ------------------------------------------------------------------ lifecycle

    private static final Map<OrderStatus, Set<OrderStatus>> KITCHEN_TRANSITIONS = Map.of(
            OrderStatus.PLACED, EnumSet.of(OrderStatus.CONFIRMED, OrderStatus.REJECTED),
            OrderStatus.CONFIRMED, EnumSet.of(OrderStatus.PREPARING, OrderStatus.CANCELLED),
            OrderStatus.PREPARING, EnumSet.of(OrderStatus.READY),
            OrderStatus.READY, EnumSet.of(OrderStatus.OUT_FOR_DELIVERY),
            OrderStatus.OUT_FOR_DELIVERY, EnumSet.of(OrderStatus.DELIVERED));

    @Transactional
    public FoodOrder kitchenUpdateStatus(Kitchen kitchen, Long orderId, OrderStatus next, String reason) {
        FoodOrder o = orders.findById(orderId).orElseThrow(() -> ApiException.notFound("Order not found"));
        if (!o.getKitchen().getId().equals(kitchen.getId())) throw ApiException.forbidden("Not your order");
        Set<OrderStatus> allowed = KITCHEN_TRANSITIONS.getOrDefault(o.getStatus(), Set.of());
        if (!allowed.contains(next)) {
            throw ApiException.badRequest("Cannot move order from " + o.getStatus() + " to " + next);
        }
        LocalDateTime now = LocalDateTime.now();
        o.setStatus(next);
        switch (next) {
            case CONFIRMED -> o.setConfirmedAt(now);
            case PREPARING -> o.setPreparingAt(now);
            case READY -> o.setReadyAt(now);
            case OUT_FOR_DELIVERY -> o.setOutForDeliveryAt(now);
            case DELIVERED -> {
                o.setDeliveredAt(now);
                if (o.getPaymentStatus() == Enums.PaymentStatus.COD_PENDING) o.setPaymentStatus(Enums.PaymentStatus.PAID);
            }
            case REJECTED, CANCELLED -> {
                o.setCancelReason(reason);
                restoreStock(o);
                if (o.getPaymentStatus() == Enums.PaymentStatus.PAID) o.setPaymentStatus(Enums.PaymentStatus.REFUNDED);
            }
            default -> {}
        }
        notify.sendSms(o.getCustomer().getPhone(), "HomePlate: Your order " + o.getOrderNumber() + " is now "
                + next.name().replace('_', ' ').toLowerCase() + ".");
        inbox.push(o.getCustomer(), "ORDER", o.getOrderNumber() + " - " + next.name().replace('_', ' ').toLowerCase(),
                statusMessage(o, next), "/orders/" + o.getId());
        if (next == OrderStatus.OUT_FOR_DELIVERY && o.getKitchen().getLatitude() != null) {
            // Start the live marker at the kitchen until the delivery person's phone sends its first position.
            o.setRiderLatitude(o.getKitchen().getLatitude());
            o.setRiderLongitude(o.getKitchen().getLongitude());
            o.setRiderUpdatedAt(now);
        }
        return o;
    }

    @Transactional
    public FoodOrder customerCancel(User customer, Long orderId, String reason) {
        FoodOrder o = customerOrder(customer, orderId);
        if (o.getStatus() != OrderStatus.PLACED && o.getStatus() != OrderStatus.PAYMENT_PENDING) {
            throw ApiException.badRequest("Order can't be cancelled once the kitchen has accepted it. Please contact the kitchen.");
        }
        o.setStatus(OrderStatus.CANCELLED);
        o.setCancelReason(reason == null ? "Cancelled by customer" : reason);
        restoreStock(o);
        if (o.getPaymentStatus() == Enums.PaymentStatus.PAID) o.setPaymentStatus(Enums.PaymentStatus.REFUNDED);
        if (o.getCustomRequestId() != null) {
            requests.findById(o.getCustomRequestId()).ifPresent(r -> r.setStatus(Enums.RequestStatus.CANCELLED));
        }
        inbox.push(o.getKitchen().getOwner(), "ORDER", o.getOrderNumber() + " cancelled by customer", o.getCancelReason(), "/kitchen/orders");
        return o;
    }

    private void restoreStock(FoodOrder o) {
        for (OrderItem oi : o.getItems()) {
            if (oi.getMenuItemId() == null) continue;
            menu.findById(oi.getMenuItemId()).ifPresent(m -> {
                if (m.getQuantityAvailable() != null) {
                    m.setQuantityAvailable(m.getQuantityAvailable() + oi.getQuantity());
                    m.setAvailable(true);
                }
            });
        }
    }

    public FoodOrder customerOrder(User customer, Long orderId) {
        FoodOrder o = orders.findById(orderId).orElseThrow(() -> ApiException.notFound("Order not found"));
        if (!o.getCustomer().getId().equals(customer.getId())) throw ApiException.forbidden("Not your order");
        return o;
    }

    @Transactional
    public Review review(User customer, Long orderId, Dtos.ReviewRequest req) {
        FoodOrder o = customerOrder(customer, orderId);
        if (o.getStatus() != OrderStatus.DELIVERED) throw ApiException.badRequest("You can review after the order is delivered");
        if (o.isReviewed()) throw ApiException.badRequest("You have already reviewed this order");
        Review r = new Review();
        r.setKitchen(o.getKitchen());
        r.setCustomerId(customer.getId());
        r.setCustomerName(customer.getFullName());
        r.setOrderId(o.getId());
        r.setRating(req.rating());
        r.setComment(req.comment());
        reviews.save(r);
        o.setReviewed(true);
        recalcRating(o.getKitchen());
        return r;
    }

    public void recalcRating(Kitchen k) {
        List<Review> all = reviews.findByKitchenIdOrderByCreatedAtDesc(k.getId());
        double avg = all.stream().mapToInt(Review::getRating).average().orElse(0);
        k.setRating(Math.round(avg * 10.0) / 10.0);
        k.setRatingCount(all.size());
        kitchens.save(k);
    }
}
