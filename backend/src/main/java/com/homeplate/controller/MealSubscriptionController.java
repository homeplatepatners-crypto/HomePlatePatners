package com.homeplate.controller;

import com.homeplate.entity.MealPlan;
import com.homeplate.entity.MealSubscription;
import com.homeplate.security.CurrentUser;
import com.homeplate.service.MealSubscriptionService;
import com.homeplate.service.MealSubscriptionService.PlanInput;
import com.homeplate.service.MealSubscriptionService.SubscribeInput;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Meal plans & subscriptions. Secured by path prefix: /api/public, /api/kitchen, /api/customer, /api/admin. */
@RestController
public class MealSubscriptionController {
    private final MealSubscriptionService service;
    private final CurrentUser current;

    public MealSubscriptionController(MealSubscriptionService service, CurrentUser current) {
        this.service = service;
        this.current = current;
    }

    // public
    @GetMapping("/api/public/kitchens/{id}/meal-plans")
    public List<MealPlan> plans(@PathVariable Long id) { return service.plansFor(id); }

    // kitchen
    @GetMapping("/api/kitchen/meal-plans")
    public Map<String, Object> kitchenPlans() {
        var k = current.kitchen();
        return Map.of("plans", service.plansForKitchenAll(k), "subscribers", service.kitchenSubscribers(k));
    }

    @PostMapping("/api/kitchen/meal-plans")
    public MealPlan create(@RequestBody PlanInput in) { return service.savePlan(current.kitchen(), null, in); }

    @PutMapping("/api/kitchen/meal-plans/{id}")
    public MealPlan update(@PathVariable Long id, @RequestBody PlanInput in) { return service.savePlan(current.kitchen(), id, in); }

    @DeleteMapping("/api/kitchen/meal-plans/{id}")
    public Map<String, Object> delete(@PathVariable Long id) { service.deletePlan(current.kitchen(), id); return Map.of("deleted", true); }

    // customer
    @GetMapping("/api/customer/meal-subscriptions")
    public List<Map<String, Object>> mine() { return service.customerSubscriptions(current.user()); }

    @PostMapping("/api/customer/meal-subscriptions")
    public MealSubscription subscribe(@RequestBody SubscribeInput in) { return service.subscribe(current.user(), in); }

    @PostMapping("/api/customer/meal-subscriptions/{id}/{action}")
    public MealSubscription change(@PathVariable Long id, @PathVariable String action) { return service.changeStatus(current.user(), id, action); }

    // admin
    @GetMapping("/api/admin/meal-subscriptions")
    public List<MealSubscription> all() { return service.all(); }
}
