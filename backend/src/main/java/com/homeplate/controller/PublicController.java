package com.homeplate.controller;

import com.homeplate.entity.PlatformSettings;
import com.homeplate.entity.SubscriptionPlan;
import com.homeplate.repository.ReviewRepository;
import com.homeplate.repository.SubscriptionPlanRepository;
import com.homeplate.service.KitchenService;
import com.homeplate.service.SettingsService;
import org.springframework.web.bind.annotation.*;

import java.time.LocalTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Endpoints that work without login (customer discovery). */
@RestController
@RequestMapping("/api/public")
public class PublicController {
    private final KitchenService kitchens;
    private final SettingsService settings;
    private final SubscriptionPlanRepository plans;
    private final ReviewRepository reviews;

    @org.springframework.beans.factory.annotation.Autowired
    private com.homeplate.service.OrderService orderService;

    public PublicController(KitchenService kitchens, SettingsService settings, SubscriptionPlanRepository plans,
                            ReviewRepository reviews) {
        this.kitchens = kitchens;
        this.settings = settings;
        this.plans = plans;
        this.reviews = reviews;
    }

    @GetMapping("/kitchens")
    public List<Map<String, Object>> discover(@RequestParam(required = false) Double lat,
                                              @RequestParam(required = false) Double lng,
                                              @RequestParam(required = false) Double radius,
                                              @RequestParam(required = false) String foodType,
                                              @RequestParam(required = false) Double minRating,
                                              @RequestParam(required = false) Boolean openNow,
                                              @RequestParam(required = false) Boolean budget,
                                              @RequestParam(required = false) String cuisine,
                                              @RequestParam(required = false) String q,
                                              @RequestParam(required = false) String sort) {
        return kitchens.discover(lat, lng, radius, foodType, minRating, openNow, budget, cuisine, q, sort);
    }

    @GetMapping("/kitchens/{id}")
    public Map<String, Object> kitchen(@PathVariable Long id,
                                       @RequestParam(required = false) Double lat,
                                       @RequestParam(required = false) Double lng) {
        return kitchens.details(id, lat, lng);
    }

    @GetMapping("/specials")
    public List<Map<String, Object>> specials(@RequestParam(required = false) Double lat,
                                              @RequestParam(required = false) Double lng) {
        return kitchens.todaysSpecials(lat, lng);
    }

    @GetMapping("/reviews/recent")
    public Object recentReviews() {
        return reviews.findTop12ByOrderByCreatedAtDesc();
    }

    @GetMapping("/config")
    public Map<String, Object> config() {
        PlatformSettings s = settings.get();
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("discoveryRadiusKm", s.getDiscoveryRadiusKm());
        m.put("customLunchCutoff", s.getCustomLunchCutoff());
        m.put("customDinnerCutoff", s.getCustomDinnerCutoff());
        m.put("deliveryCharge", s.getDeliveryCharge());
        m.put("platformFee", s.getPlatformFee());
        m.put("freeDeliveryAbove", s.getFreeDeliveryAbove());
        m.put("freeTrialDays", s.getFreeTrialDays());
        m.put("supportPhone", s.getSupportPhone());
        m.put("supportEmail", s.getSupportEmail());
        m.put("serverTime", LocalTime.now().withNano(0));
        m.put("lunchCutoffPassed", !LocalTime.now().isBefore(s.getCustomLunchCutoff()));
        m.put("cuisines", List.of("Kongu", "Chettinad", "Madurai", "Kerala", "Andhra", "North Indian", "South Indian", "Tiffin"));
        m.put("areas", List.of(
                Map.of("name", "SITRA", "lat", 11.0335, "lng", 77.0310),
                Map.of("name", "Saravanampatti", "lat", 11.0790, "lng", 76.9990),
                Map.of("name", "Peelamedu", "lat", 11.0270, "lng", 77.0060),
                Map.of("name", "Gandhipuram", "lat", 11.0168, "lng", 76.9674),
                Map.of("name", "Kalapatti", "lat", 11.0610, "lng", 77.0400),
                Map.of("name", "Hope College", "lat", 11.0265, "lng", 77.0185),
                Map.of("name", "Singanallur", "lat", 10.9990, "lng", 77.0320),
                Map.of("name", "Vilankurichi", "lat", 11.0640, "lng", 77.0170),
                Map.of("name", "RS Puram", "lat", 11.0080, "lng", 76.9500),
                Map.of("name", "Ganapathy", "lat", 11.0400, "lng", 76.9750)));
        return m;
    }

    @GetMapping("/plans")
    public List<SubscriptionPlan> plans() {
        return plans.findByActiveTrueOrderByPriceAsc();
    }

    /** Offers & coupons customers can use right now. */
    @GetMapping("/offers")
    public List<com.homeplate.entity.Offer> offers() { return orderService.liveOffers(); }

    /** Search dishes in nearby kitchens: available today vs. on menus but unavailable. */
    @GetMapping("/dishes/search")
    public Map<String, Object> searchDishes(@RequestParam String q, @RequestParam(required = false) Double lat,
                                            @RequestParam(required = false) Double lng) {
        return kitchens.searchDishes(q, lat, lng);
    }
}
