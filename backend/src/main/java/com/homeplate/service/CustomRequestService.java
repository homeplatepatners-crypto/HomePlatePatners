package com.homeplate.service;

import com.homeplate.config.ApiException;
import com.homeplate.dto.Dtos;
import com.homeplate.entity.*;
import com.homeplate.entity.Enums.RequestStatus;
import com.homeplate.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;

/**
 * "Request your homemade food" workflow:
 * Submitted -> Kitchen offers -> Offer selected -> Payment pending -> Confirmed -> (order lifecycle).
 */
@Service
public class CustomRequestService {
    private final CustomRequestRepository requests;
    private final QuotationRepository quotes;
    private final KitchenRepository kitchens;
    private final FoodOrderRepository orders;
    private final SettingsService settings;
    private final KitchenService kitchenService;
    private final OrderService orderService;
    private final NotificationService notify;

    @org.springframework.beans.factory.annotation.Autowired
    private InboxService inbox;

    public CustomRequestService(CustomRequestRepository requests, QuotationRepository quotes, KitchenRepository kitchens,
                                FoodOrderRepository orders, SettingsService settings, KitchenService kitchenService,
                                OrderService orderService, NotificationService notify) {
        this.requests = requests;
        this.quotes = quotes;
        this.kitchens = kitchens;
        this.orders = orders;
        this.settings = settings;
        this.kitchenService = kitchenService;
        this.orderService = orderService;
        this.notify = notify;
    }

    /** Validates the cutoff rules. Returns null when allowed, otherwise the reason. */
    public String cutoffViolation(LocalDate date, Enums.MealType slot) {
        LocalDate today = LocalDate.now();
        if (date.isBefore(today)) return "Required date can't be in the past";
        if (date.isAfter(today.plusDays(7))) return "Requests can be placed up to 7 days in advance";
        if (!date.equals(today)) return null;
        PlatformSettings s = settings.get();
        LocalTime now = LocalTime.now();
        return switch (slot) {
            case BREAKFAST -> "Breakfast requests must be placed by the previous day";
            case LUNCH -> now.isBefore(s.getCustomLunchCutoff()) ? null
                    : "Custom lunch requests must be submitted before " + s.getCustomLunchCutoff()
                      + ". You can still order from today's available menu, or request lunch for tomorrow.";
            case SNACKS, DINNER -> now.isBefore(s.getCustomDinnerCutoff()) ? null
                    : "Custom " + slot.name().toLowerCase() + " requests must be submitted before " + s.getCustomDinnerCutoff() + ".";
        };
    }

    @Transactional
    public CustomRequest create(User customer, Dtos.CustomRequestPayload p) {
        String violation = cutoffViolation(p.requiredDate(), p.mealSlot());
        if (violation != null) throw ApiException.badRequest(violation);
        CustomRequest r = new CustomRequest();
        r.setCustomer(customer);
        r.setDishName(p.dishName());
        r.setQuantity(p.quantity());
        r.setServings(p.servings() == null ? 1 : p.servings());
        r.setSpiceLevel(p.spiceLevel());
        r.setVeg(p.veg());
        r.setCuisineStyle(p.cuisineStyle());
        r.setRequiredDate(p.requiredDate());
        r.setMealSlot(p.mealSlot());
        r.setPreferredTime(p.preferredTime());
        r.setInstructions(p.instructions());
        r.setBudget(p.budget());
        r.setDeliveryAddress(p.deliveryAddress());
        r.setDeliveryArea(p.deliveryArea());
        r.setLatitude(p.latitude());
        r.setLongitude(p.longitude());
        r = requests.save(r);
        r.setRequestNumber(String.format("CR%05d", 10000 + r.getId()));
        List<Kitchen> eligible = eligibleKitchens(r);
        for (Kitchen k : eligible) {
            notify.sendSms(k.getOwner().getPhone(), "HomePlate: New custom request near you - " + r.getDishName()
                    + " (" + r.getQuantity() + ") for " + r.getMealSlot().name().toLowerCase() + ". Send your quote!");
            inbox.push(k.getOwner(), "REQUEST", "New dish request: " + r.getDishName(),
                    r.getQuantity() + " for " + r.getMealSlot().name().toLowerCase() + " on " + r.getRequiredDate() + ". Send your quote.", "/kitchen/requests");
        }
        inbox.push(customer, "REQUEST", "Request " + r.getRequestNumber() + " sent",
                eligible.isEmpty() ? "No kitchen near you can take this right now - we'll keep it open for new kitchens."
                        : "Sent to " + eligible.size() + " nearby kitchen(s). You'll be notified as offers come in.", "/my-requests/" + r.getId());
        return r;
    }

    public List<Kitchen> eligibleKitchens(CustomRequest r) {
        List<Kitchen> out = new ArrayList<>();
        for (Kitchen k : kitchens.findByStatus(Enums.KitchenStatus.ACTIVE)) {
            if (isEligible(k, r)) out.add(k);
        }
        return out;
    }

    private boolean isEligible(Kitchen k, CustomRequest r) {
        if (!kitchenService.isVisible(k)) return false;
        if (!r.isVeg() && k.getFoodType() == Enums.FoodType.VEG) return false;
        Double d = Geo.distanceKm(r.getLatitude(), r.getLongitude(), k.getLatitude(), k.getLongitude());
        return d == null || d <= Optional.ofNullable(k.getDeliveryRadiusKm()).orElse(5.0);
    }

    /** Open requests a kitchen can respond to, each with that kitchen's own quote (if any). */
    public List<Map<String, Object>> openForKitchen(Kitchen k) {
        List<Map<String, Object>> out = new ArrayList<>();
        List<CustomRequest> open = requests.findByStatusInAndRequiredDateGreaterThanEqualOrderByCreatedAtDesc(
                List.of(RequestStatus.SUBMITTED, RequestStatus.OFFERS_RECEIVED), LocalDate.now());
        for (CustomRequest r : open) {
            if (!isEligible(k, r)) continue;
            Optional<Quotation> mine = quotes.findByRequestIdAndKitchenId(r.getId(), k.getId());
            out.add(requestView(r, k, mine.orElse(null)));
        }
        return out;
    }

    /** Requests this kitchen quoted on (history). */
    public List<Map<String, Object>> quotedByKitchen(Kitchen k) {
        List<Map<String, Object>> out = new ArrayList<>();
        for (Quotation q : quotes.findByKitchenIdOrderByCreatedAtDesc(k.getId())) {
            CustomRequest r = q.getRequest();
            if ((r.getStatus() == RequestStatus.SUBMITTED || r.getStatus() == RequestStatus.OFFERS_RECEIVED)
                    && !r.getRequiredDate().isBefore(LocalDate.now())) continue; // still open -> shown in open list
            out.add(requestView(r, k, q));
        }
        return out;
    }

    private Map<String, Object> requestView(CustomRequest r, Kitchen k, Quotation mine) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("request", r);
        m.put("customerName", r.getCustomer().getFullName());
        m.put("distanceKm", Geo.distanceKm(r.getLatitude(), r.getLongitude(), k.getLatitude(), k.getLongitude()));
        m.put("myQuote", mine);
        m.put("offerCount", quotes.findByRequestIdOrderByPriceAsc(r.getId()).stream()
                .filter(q -> q.getStatus() != Enums.QuotationStatus.DECLINED).count());
        return m;
    }

    @Transactional
    public Quotation quote(Kitchen k, Long requestId, Dtos.QuoteRequest req) {
        CustomRequest r = requests.findById(requestId).orElseThrow(() -> ApiException.notFound("Request not found"));
        if (r.getStatus() != RequestStatus.SUBMITTED && r.getStatus() != RequestStatus.OFFERS_RECEIVED) {
            throw ApiException.badRequest("This request is no longer accepting offers");
        }
        if (!isEligible(k, r)) throw ApiException.forbidden("This request is outside your delivery area");
        Quotation q = quotes.findByRequestIdAndKitchenId(requestId, k.getId()).orElseGet(Quotation::new);
        q.setRequest(r);
        q.setKitchen(k);
        q.setPrice(req.price());
        q.setPrepTimeMinutes(req.prepTimeMinutes());
        q.setNote(req.note());
        q.setUnavailableItems(req.unavailableItems() == null || req.unavailableItems().isBlank() ? null : req.unavailableItems().trim());
        q.setStatus(Enums.QuotationStatus.PENDING);
        q.setDistanceKm(Geo.distanceKm(r.getLatitude(), r.getLongitude(), k.getLatitude(), k.getLongitude()));
        q.setCreatedAt(LocalDateTime.now());
        q = quotes.save(q);
        r.setStatus(RequestStatus.OFFERS_RECEIVED);
        r.setOfferCount((int) quotes.findByRequestIdOrderByPriceAsc(r.getId()).stream()
                .filter(x -> x.getStatus() != Enums.QuotationStatus.DECLINED).count());
        notify.sendSms(r.getCustomer().getPhone(), "HomePlate: " + k.getName() + " offered to cook your "
                + r.getDishName() + " for Rs." + req.price() + ". Compare offers in the app.");
        inbox.push(r.getCustomer(), "OFFER", "New offer for " + r.getDishName(),
                k.getName() + " can cook it for Rs." + req.price() + (req.prepTimeMinutes() == null ? "" : ", ready in " + req.prepTimeMinutes() + " min") + ".",
                "/my-requests/" + r.getId());
        return q;
    }

    @Transactional
    public void decline(Kitchen k, Long requestId) {
        CustomRequest r = requests.findById(requestId).orElseThrow(() -> ApiException.notFound("Request not found"));
        Quotation q = quotes.findByRequestIdAndKitchenId(requestId, k.getId()).orElseGet(Quotation::new);
        q.setRequest(r);
        q.setKitchen(k);
        q.setPrice(BigDecimal.ZERO);
        q.setPrepTimeMinutes(0);
        q.setStatus(Enums.QuotationStatus.DECLINED);
        quotes.save(q);
        r.setOfferCount((int) quotes.findByRequestIdOrderByPriceAsc(r.getId()).stream()
                .filter(x -> x.getStatus() != Enums.QuotationStatus.DECLINED).count());
    }

    public Map<String, Object> customerView(User customer, Long requestId) {
        CustomRequest r = ownRequest(customer, requestId);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("request", r);
        List<Map<String, Object>> offers = new ArrayList<>();
        for (Quotation q : quotes.findByRequestIdOrderByPriceAsc(requestId)) {
            if (q.getStatus() == Enums.QuotationStatus.DECLINED) continue;
            Map<String, Object> o = new LinkedHashMap<>();
            o.put("quotation", q);
            o.put("kitchen", kitchenService.card(q.getKitchen(), q.getDistanceKm(), List.of()));
            offers.add(o);
        }
        m.put("offers", offers);
        m.put("order", r.getOrderId() == null ? null : orders.findById(r.getOrderId()).orElse(null));
        m.put("eligibleKitchens", eligibleKitchens(r).size());
        return m;
    }

    @Transactional
    public FoodOrder selectOffer(User customer, Long requestId, Long quotationId) {
        CustomRequest r = ownRequest(customer, requestId);
        if (r.getStatus() != RequestStatus.OFFERS_RECEIVED) throw ApiException.badRequest("Offer can't be selected now");
        Quotation chosen = quotes.findById(quotationId).orElseThrow(() -> ApiException.notFound("Offer not found"));
        if (!chosen.getRequest().getId().equals(requestId) || chosen.getStatus() != Enums.QuotationStatus.PENDING) {
            throw ApiException.badRequest("Invalid offer");
        }
        for (Quotation q : quotes.findByRequestIdOrderByPriceAsc(requestId)) {
            if (q.getStatus() == Enums.QuotationStatus.DECLINED) continue;
            q.setStatus(q.getId().equals(quotationId) ? Enums.QuotationStatus.SELECTED : Enums.QuotationStatus.NOT_SELECTED);
        }
        Kitchen k = chosen.getKitchen();
        FoodOrder o = new FoodOrder();
        o.setCustomer(customer);
        o.setKitchen(k);
        o.setOrderType(Enums.OrderType.CUSTOM_REQUEST);
        o.setCustomRequestId(r.getId());
        OrderItem item = new OrderItem();
        item.setOrder(o);
        item.setName(r.getDishName() + " (" + r.getQuantity() + (r.getSpiceLevel() != null ? ", " + r.getSpiceLevel() : "") + ")");
        item.setVeg(r.isVeg());
        item.setUnitPrice(chosen.getPrice());
        item.setQuantity(1);
        item.setLineTotal(chosen.getPrice());
        o.getItems().add(item);
        OrderService.Totals t = orderService.computeTotals(chosen.getPrice(), "NONE");
        o.setFoodTotal(t.foodTotal());
        o.setDeliveryCharge(t.deliveryCharge());
        o.setPlatformFee(t.platformFee());
        o.setDiscount(BigDecimal.ZERO);
        o.setTotalAmount(t.total());
        BigDecimal pct = settings.get().getCommissionPercent();
        BigDecimal commission = t.foodTotal().multiply(pct).divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
        o.setCommission(commission);
        o.setKitchenEarning(t.foodTotal().subtract(commission).add(t.deliveryCharge()));
        o.setDeliveryAddress(r.getDeliveryAddress());
        o.setDeliveryArea(r.getDeliveryArea());
        o.setDeliveryLatitude(r.getLatitude());
        o.setDeliveryLongitude(r.getLongitude());
        o.setDistanceKm(chosen.getDistanceKm());
        o.setMealSlot(r.getMealSlot());
        o.setNotes(r.getInstructions());
        o.setStatus(Enums.OrderStatus.PAYMENT_PENDING);
        o.setPaymentStatus(Enums.PaymentStatus.PENDING);
        LocalTime slotTime = r.getPreferredTime() != null ? r.getPreferredTime()
                : switch (r.getMealSlot()) { case BREAKFAST -> LocalTime.of(8, 30); case LUNCH -> LocalTime.of(13, 0);
                    case SNACKS -> LocalTime.of(17, 0); case DINNER -> LocalTime.of(20, 0); };
        o.setEstimatedDeliveryAt(r.getRequiredDate().atTime(slotTime));
        o = orders.save(o);
        o.setOrderNumber(String.format("HP%06d", 100000 + o.getId()));
        r.setSelectedQuotationId(quotationId);
        r.setOrderId(o.getId());
        r.setStatus(RequestStatus.OFFER_SELECTED);
        notify.sendSms(k.getOwner().getPhone(), "HomePlate: Your offer for " + r.getDishName() + " was selected! Awaiting customer payment.");
        inbox.push(k.getOwner(), "OFFER", "Your offer was selected!", r.getDishName() + " for " + r.getRequiredDate() + " - waiting for customer payment.", "/kitchen/requests");
        return o;
    }

    @Transactional
    public CustomRequest cancel(User customer, Long requestId) {
        CustomRequest r = ownRequest(customer, requestId);
        if (r.getStatus() != RequestStatus.SUBMITTED && r.getStatus() != RequestStatus.OFFERS_RECEIVED) {
            throw ApiException.badRequest("Request can't be cancelled after selecting an offer. Cancel the order instead.");
        }
        r.setStatus(RequestStatus.CANCELLED);
        return r;
    }

    public List<Map<String, Object>> customerRequests(User customer) {
        List<Map<String, Object>> out = new ArrayList<>();
        for (CustomRequest r : requests.findByCustomerIdOrderByCreatedAtDesc(customer.getId())) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("request", r);
            List<Quotation> qs = quotes.findByRequestIdOrderByPriceAsc(r.getId()).stream()
                    .filter(q -> q.getStatus() != Enums.QuotationStatus.DECLINED).toList();
            m.put("offerCount", qs.size());
            m.put("lowestOffer", qs.stream().map(Quotation::getPrice).min(BigDecimal::compareTo).orElse(null));
            m.put("fastestPrepMinutes", qs.stream().map(Quotation::getPrepTimeMinutes).filter(java.util.Objects::nonNull).min(Integer::compareTo).orElse(null));
            if (r.getSelectedQuotationId() != null) {
                quotes.findById(r.getSelectedQuotationId()).ifPresent(sel -> {
                    m.put("selectedPrepMinutes", sel.getPrepTimeMinutes());
                    m.put("selectedKitchen", sel.getKitchen().getName());
                });
            }
            m.put("order", r.getOrderId() == null ? null : orders.findById(r.getOrderId()).orElse(null));
            out.add(m);
        }
        return out;
    }

    private CustomRequest ownRequest(User customer, Long id) {
        CustomRequest r = requests.findById(id).orElseThrow(() -> ApiException.notFound("Request not found"));
        if (!r.getCustomer().getId().equals(customer.getId())) throw ApiException.forbidden("Not your request");
        return r;
    }
}
