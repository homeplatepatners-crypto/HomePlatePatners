package com.homeplate.service;

import com.homeplate.config.ApiException;
import com.homeplate.entity.*;
import com.homeplate.entity.MealSubscription.Status;
import com.homeplate.repository.MealPlanRepository;
import com.homeplate.repository.MealSubscriptionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;

/**
 * Regular / monthly meal subscriptions between customers and kitchens.
 * The customer pays the plan price up-front (mock gateway); HomePlate keeps the commission %.
 */
@Service
public class MealSubscriptionService {
    private final MealPlanRepository plans;
    private final MealSubscriptionRepository subs;
    private final KitchenService kitchenService;
    private final SettingsService settings;
    private final InboxService inbox;
    private final NotificationService notify;

    public MealSubscriptionService(MealPlanRepository plans, MealSubscriptionRepository subs, KitchenService kitchenService,
                                   SettingsService settings, InboxService inbox, NotificationService notify) {
        this.plans = plans;
        this.subs = subs;
        this.kitchenService = kitchenService;
        this.settings = settings;
        this.inbox = inbox;
        this.notify = notify;
    }

    public record PlanInput(String name, String description, Enums.MealType mealSlot, Boolean veg, Integer durationDays,
                            String deliveryDays, BigDecimal price, Boolean active) {}

    public record SubscribeInput(Long planId, LocalDate startDate, String deliveryAddress, Double latitude, Double longitude,
                                 String notes, Enums.PaymentMethod paymentMethod) {}

    // ---------------------------------------------------------------- kitchen side

    @Transactional
    public MealPlan savePlan(Kitchen k, Long id, PlanInput in) {
        MealPlan p = id == null ? new MealPlan() : ownPlan(k, id);
        if (in.name() == null || in.name().isBlank()) throw ApiException.badRequest("Enter a plan name");
        if (in.price() == null || in.price().compareTo(BigDecimal.valueOf(100)) < 0) throw ApiException.badRequest("Enter a valid plan price (min Rs.100)");
        int days = in.durationDays() == null ? 30 : in.durationDays();
        if (days < 5 || days > 90) throw ApiException.badRequest("Plan length must be between 5 and 90 days");
        p.setKitchen(k);
        p.setName(in.name().trim());
        p.setDescription(in.description());
        p.setMealSlot(in.mealSlot() == null ? Enums.MealType.LUNCH : in.mealSlot());
        p.setVeg(!Boolean.FALSE.equals(in.veg()));
        p.setDurationDays(days);
        p.setDeliveryDays(in.deliveryDays() == null || in.deliveryDays().isBlank() ? "MON,TUE,WED,THU,FRI,SAT" : in.deliveryDays());
        p.setPrice(in.price());
        if (in.active() != null) p.setActive(in.active());
        return plans.save(p);
    }

    @Transactional
    public void deletePlan(Kitchen k, Long id) { plans.delete(ownPlan(k, id)); }

    private MealPlan ownPlan(Kitchen k, Long id) {
        MealPlan p = plans.findById(id).orElseThrow(() -> ApiException.notFound("Plan not found"));
        if (!p.getKitchen().getId().equals(k.getId())) throw ApiException.forbidden("Not your plan");
        return p;
    }

    /** Subscribers with a flag for whether a meal is due today. */
    public List<Map<String, Object>> kitchenSubscribers(Kitchen k) {
        List<Map<String, Object>> out = new ArrayList<>();
        for (MealSubscription s : subs.findByKitchenIdOrderByCreatedAtDesc(k.getId())) {
            refreshStatus(s);
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("subscription", s);
            m.put("mealToday", mealDueOn(s, LocalDate.now()));
            m.put("mealsLeft", mealsBetween(s, LocalDate.now(), s.getEndDate()));
            out.add(m);
        }
        return out;
    }

    // ---------------------------------------------------------------- customer side

    public List<MealPlan> plansFor(Long kitchenId) { return plans.findByKitchenIdAndActiveTrueOrderByPriceAsc(kitchenId); }

    public List<MealPlan> plansForKitchenAll(Kitchen k) { return plans.findByKitchenIdOrderByPriceAsc(k.getId()); }

    @Transactional
    public MealSubscription subscribe(User customer, SubscribeInput in) {
        MealPlan p = plans.findById(in.planId()).orElseThrow(() -> ApiException.notFound("Plan not found"));
        Kitchen k = p.getKitchen();
        if (!p.isActive()) throw ApiException.badRequest("This plan is no longer available");
        if (!kitchenService.isVisible(k)) throw ApiException.badRequest(k.getName() + " is not taking subscriptions right now");
        LocalDate start = in.startDate() == null ? LocalDate.now().plusDays(1) : in.startDate();
        if (start.isBefore(LocalDate.now().plusDays(1))) throw ApiException.badRequest("Subscriptions start from tomorrow at the earliest");
        if (start.isAfter(LocalDate.now().plusDays(30))) throw ApiException.badRequest("Choose a start date within the next 30 days");
        if (in.deliveryAddress() == null || in.deliveryAddress().isBlank()) throw ApiException.badRequest("Enter your delivery address");
        Double d = Geo.distanceKm(in.latitude(), in.longitude(), k.getLatitude(), k.getLongitude());
        double radius = Optional.ofNullable(k.getDeliveryRadiusKm()).orElse(5.0);
        if (d != null && d > radius) throw ApiException.badRequest("Your address is " + d + " km away - " + k.getName() + " delivers within " + radius + " km.");
        boolean dup = subs.findByCustomerIdOrderByCreatedAtDesc(customer.getId()).stream()
                .anyMatch(s -> s.getKitchen().getId().equals(k.getId()) && s.getPlanId().equals(p.getId())
                        && (s.getStatus() == Status.ACTIVE || s.getStatus() == Status.PAUSED) && !s.getEndDate().isBefore(LocalDate.now()));
        if (dup) throw ApiException.badRequest("You already have an active subscription to this plan");

        MealSubscription s = new MealSubscription();
        s.setCustomer(customer);
        s.setKitchen(k);
        s.setPlanId(p.getId());
        s.setPlanName(p.getName());
        s.setMealSlot(p.getMealSlot());
        s.setVeg(p.isVeg());
        s.setDeliveryDays(p.getDeliveryDays());
        s.setStartDate(start);
        s.setEndDate(start.plusDays(p.getDurationDays() - 1L));
        s.setAmount(p.getPrice());
        BigDecimal commission = p.getPrice().multiply(settings.get().getCommissionPercent()).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        s.setCommission(commission);
        s.setKitchenEarning(p.getPrice().subtract(commission));
        s.setPaymentMethod(in.paymentMethod() == null ? Enums.PaymentMethod.UPI : in.paymentMethod());
        s.setPaymentReference("MSUB-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase()); // mock gateway
        s.setDeliveryAddress(in.deliveryAddress().trim());
        s.setDeliveryLatitude(in.latitude());
        s.setDeliveryLongitude(in.longitude());
        s.setNotes(in.notes());
        s.setStatus(Status.ACTIVE);
        s = subs.save(s);
        inbox.push(customer, "SUBSCRIPTION", "Subscribed to " + p.getName(),
                k.getName() + " will deliver your " + p.getMealSlot().name().toLowerCase() + " from " + start + ".", "/subscriptions");
        inbox.push(k.getOwner(), "SUBSCRIPTION", "New subscriber: " + customer.getFullName(),
                p.getName() + " from " + start + " (" + mealsBetween(s, start, s.getEndDate()) + " meals).", "/kitchen/meal-plans");
        notify.sendSms(k.getOwner().getPhone(), "HomePlate: New meal subscription from " + customer.getFullName() + " - " + p.getName() + " starting " + start + ".");
        return s;
    }

    public List<Map<String, Object>> customerSubscriptions(User customer) {
        List<Map<String, Object>> out = new ArrayList<>();
        for (MealSubscription s : subs.findByCustomerIdOrderByCreatedAtDesc(customer.getId())) {
            refreshStatus(s);
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("subscription", s);
            m.put("mealsLeft", mealsBetween(s, LocalDate.now().isBefore(s.getStartDate()) ? s.getStartDate() : LocalDate.now(), s.getEndDate()));
            m.put("totalMeals", mealsBetween(s, s.getStartDate(), s.getEndDate()));
            out.add(m);
        }
        return out;
    }

    @Transactional
    public MealSubscription changeStatus(User customer, Long id, String action) {
        MealSubscription s = subs.findById(id).orElseThrow(() -> ApiException.notFound("Subscription not found"));
        if (!s.getCustomer().getId().equals(customer.getId())) throw ApiException.forbidden("Not your subscription");
        refreshStatus(s);
        switch (action) {
            case "pause" -> {
                if (s.getStatus() != Status.ACTIVE) throw ApiException.badRequest("Only active subscriptions can be paused");
                s.setStatus(Status.PAUSED);
                s.setPausedFrom(LocalDate.now());
            }
            case "resume" -> {
                if (s.getStatus() != Status.PAUSED) throw ApiException.badRequest("This subscription is not paused");
                // Paused days are added back to the end date so no meals are lost.
                long paused = Math.max(0, java.time.temporal.ChronoUnit.DAYS.between(s.getPausedFrom(), LocalDate.now()));
                s.setEndDate(s.getEndDate().plusDays(paused));
                s.setPausedFrom(null);
                s.setStatus(Status.ACTIVE);
            }
            case "cancel" -> {
                if (s.getStatus() == Status.CANCELLED || s.getStatus() == Status.COMPLETED) throw ApiException.badRequest("Subscription already ended");
                s.setStatus(Status.CANCELLED);
            }
            default -> throw ApiException.badRequest("Unknown action");
        }
        inbox.push(s.getKitchen().getOwner(), "SUBSCRIPTION", s.getCustomer().getFullName() + " " + action + (action.endsWith("e") ? "d" : "ed") + " a subscription",
                s.getPlanName(), "/kitchen/meal-plans");
        return subs.save(s);
    }

    public List<MealSubscription> all() {
        List<MealSubscription> list = subs.findAllByOrderByCreatedAtDesc();
        list.forEach(this::refreshStatus);
        return list;
    }

    // ---------------------------------------------------------------- helpers

    private void refreshStatus(MealSubscription s) {
        if (s.getStatus() == Status.ACTIVE && s.getEndDate() != null && s.getEndDate().isBefore(LocalDate.now())) {
            s.setStatus(Status.COMPLETED);
            subs.save(s);
        }
    }

    private static boolean deliversOn(MealSubscription s, LocalDate d) {
        String day = d.getDayOfWeek().name().substring(0, 3);
        return s.getDeliveryDays() == null || s.getDeliveryDays().contains(day);
    }

    public static boolean mealDueOn(MealSubscription s, LocalDate d) {
        return s.getStatus() == Status.ACTIVE && !d.isBefore(s.getStartDate()) && !d.isAfter(s.getEndDate()) && deliversOn(s, d);
    }

    public static int mealsBetween(MealSubscription s, LocalDate from, LocalDate to) {
        if (from == null || to == null || from.isAfter(to)) return 0;
        int n = 0;
        for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) if (deliversOn(s, d)) n++;
        return n;
    }
}
