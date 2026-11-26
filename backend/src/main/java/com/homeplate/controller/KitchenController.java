package com.homeplate.controller;

import com.homeplate.config.ApiException;
import com.homeplate.dto.Dtos;
import com.homeplate.entity.*;
import com.homeplate.repository.*;
import com.homeplate.security.CurrentUser;
import com.homeplate.service.*;
import jakarta.validation.Valid;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;

/** Kitchen owner portal API. */
@RestController
@RequestMapping("/api/kitchen")
public class KitchenController {
    private final CurrentUser current;
    private final KitchenRepository kitchens;
    private final UserRepository users;
    private final MenuItemRepository menu;
    private final FoodOrderRepository orders;
    private final CookingVideoRepository videos;
    private final ReviewRepository reviews;
    private final ComplaintRepository complaints;
    private final SubscriptionPlanRepository plans;
    private final SubscriptionService subscriptions;
    private final OrderService orderService;
    private final CustomRequestService requestService;
    private final StatsService stats;
    private final KitchenService kitchenService;
    private final NotificationService notify;

    @org.springframework.beans.factory.annotation.Autowired
    private com.homeplate.service.DailyMenuService dailyMenu;

    public KitchenController(CurrentUser current, KitchenRepository kitchens, UserRepository users, MenuItemRepository menu,
                             FoodOrderRepository orders, CookingVideoRepository videos, ReviewRepository reviews,
                             ComplaintRepository complaints, SubscriptionPlanRepository plans,
                             SubscriptionService subscriptions, OrderService orderService,
                             CustomRequestService requestService, StatsService stats, KitchenService kitchenService,
                             NotificationService notify) {
        this.current = current;
        this.kitchens = kitchens;
        this.users = users;
        this.menu = menu;
        this.orders = orders;
        this.videos = videos;
        this.reviews = reviews;
        this.complaints = complaints;
        this.plans = plans;
        this.subscriptions = subscriptions;
        this.orderService = orderService;
        this.requestService = requestService;
        this.stats = stats;
        this.kitchenService = kitchenService;
        this.notify = notify;
    }

    /** Editable kitchen fields (onboarding steps 2-5 and profile page). */
    public record KitchenProfile(
            String ownerName, String email,
            String name, String description, String coverImage, String galleryImages, String cuisines,
            Enums.FoodType foodType,
            String state, String district, String city, String area, String address, String pincode,
            Double latitude, Double longitude, Double deliveryRadiusKm,
            String idProofType, String idProofNumber, String idProofUrl, String idProofBackUrl,
            String fssaiNumber, String fssaiType, String fssaiCertificateUrl,
            LocalTime openTime, LocalTime closeTime, String workingDays,
            Boolean breakfastAvailable, Boolean lunchAvailable, Boolean dinnerAvailable,
            Integer maxDailyOrders, Boolean selfDelivery, Integer avgPrepMinutes, String todaySpecial,
            Integer onboardingStep) {}

    @GetMapping("/me")
    public Map<String, Object> me() {
        Kitchen k = current.kitchen();
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("kitchen", k);
        m.put("subscription", subscriptions.summary(k.getId()));
        m.put("trust", kitchenService.trustProfile(k));
        return m;
    }

    @PutMapping({"/onboarding", "/profile"})
    @Transactional
    public Kitchen updateProfile(@RequestBody KitchenProfile p) {
        Kitchen k = current.kitchen();
        User owner = k.getOwner();
        if (p.ownerName() != null && !p.ownerName().isBlank()) owner.setFullName(p.ownerName());
        if (p.email() != null) owner.setEmail(p.email());
        users.save(owner);
        if (p.name() != null && !p.name().isBlank()) k.setName(p.name());
        if (p.description() != null) k.setDescription(p.description());
        if (p.coverImage() != null) k.setCoverImage(p.coverImage());
        if (p.galleryImages() != null) k.setGalleryImages(p.galleryImages());
        if (p.cuisines() != null) k.setCuisines(p.cuisines());
        if (p.foodType() != null) k.setFoodType(p.foodType());
        if (p.state() != null) k.setState(p.state());
        if (p.district() != null) k.setDistrict(p.district());
        if (p.city() != null) k.setCity(p.city());
        if (p.area() != null) k.setArea(p.area());
        if (p.address() != null) k.setAddress(p.address());
        if (p.pincode() != null) k.setPincode(p.pincode());
        if (p.latitude() != null) k.setLatitude(p.latitude());
        if (p.longitude() != null) k.setLongitude(p.longitude());
        if (p.deliveryRadiusKm() != null) k.setDeliveryRadiusKm(Math.max(1, Math.min(10, p.deliveryRadiusKm())));
        boolean docsChanged = false;
        if (p.idProofType() != null) k.setIdProofType(p.idProofType());
        if (p.idProofNumber() != null) k.setIdProofNumber(com.homeplate.service.DocumentRules.normalise(p.idProofNumber()));
        if (p.idProofBackUrl() != null && !p.idProofBackUrl().equals(k.getIdProofBackUrl())) {
            k.setIdProofBackUrl(p.idProofBackUrl());
            k.setIdProofStatus(Enums.DocumentStatus.PENDING);
            docsChanged = true;
        }
        if (p.idProofUrl() != null && !p.idProofUrl().equals(k.getIdProofUrl())) {
            k.setIdProofUrl(p.idProofUrl());
            k.setIdProofStatus(Enums.DocumentStatus.PENDING);
            docsChanged = true;
        }
        if (p.fssaiNumber() != null) k.setFssaiNumber(p.fssaiNumber());
        if (p.fssaiType() != null) k.setFssaiType(p.fssaiType());
        if (p.fssaiCertificateUrl() != null && !p.fssaiCertificateUrl().equals(k.getFssaiCertificateUrl())) {
            k.setFssaiCertificateUrl(p.fssaiCertificateUrl());
            k.setFssaiStatus(Enums.DocumentStatus.PENDING);
            docsChanged = true;
        }
        if (p.openTime() != null) k.setOpenTime(p.openTime());
        if (p.closeTime() != null) k.setCloseTime(p.closeTime());
        if (p.workingDays() != null) k.setWorkingDays(p.workingDays());
        if (p.breakfastAvailable() != null) k.setBreakfastAvailable(p.breakfastAvailable());
        if (p.lunchAvailable() != null) k.setLunchAvailable(p.lunchAvailable());
        if (p.dinnerAvailable() != null) k.setDinnerAvailable(p.dinnerAvailable());
        if (p.maxDailyOrders() != null) k.setMaxDailyOrders(p.maxDailyOrders());
        if (p.selfDelivery() != null) k.setSelfDelivery(p.selfDelivery());
        if (p.avgPrepMinutes() != null) k.setAvgPrepMinutes(p.avgPrepMinutes());
        if (p.todaySpecial() != null) k.setTodaySpecial(p.todaySpecial());
        if (p.onboardingStep() != null && p.onboardingStep() > Optional.ofNullable(k.getOnboardingStep()).orElse(1)) {
            k.setOnboardingStep(p.onboardingStep());
        }
        if (docsChanged && k.getStatus() == Enums.KitchenStatus.DOCS_REQUESTED) k.setAdminRemarks(k.getAdminRemarks());
        return kitchens.save(k);
    }

    @PostMapping("/onboarding/submit")
    @Transactional
    public Kitchen submit() {
        Kitchen k = current.kitchen();
        if (k.getStatus() != Enums.KitchenStatus.PENDING && k.getStatus() != Enums.KitchenStatus.DOCS_REQUESTED
                && k.getStatus() != Enums.KitchenStatus.REJECTED) {
            throw ApiException.badRequest("Application already submitted");
        }
        List<String> missing = new ArrayList<>();
        if (blank(k.getDescription())) missing.add("kitchen description");
        if (blank(k.getAddress()) || blank(k.getArea())) missing.add("address");
        if (k.getLatitude() == null) missing.add("GPS location");
        missing.addAll(com.homeplate.service.DocumentRules.problems(k));
        if (blank(k.getCoverImage())) missing.add("kitchen photo");
        if (!missing.isEmpty()) throw ApiException.badRequest("Please complete: " + String.join(", ", missing));
        k.setStatus(Enums.KitchenStatus.UNDER_REVIEW);
        k.setSubmittedAt(LocalDateTime.now());
        k.setOnboardingStep(6);
        notify.sendSms(k.getOwner().getPhone(), "HomePlate: Your kitchen application was submitted. We will review it within 48 hours.");
        return kitchens.save(k);
    }

    @PostMapping("/activate")
    @Transactional
    public Map<String, Object> activate() {
        Kitchen k = current.kitchen();
        if (k.getStatus() != Enums.KitchenStatus.APPROVED) throw ApiException.badRequest("Kitchen must be approved by admin first");
        k.setStatus(Enums.KitchenStatus.ACTIVE);
        kitchens.save(k);
        Subscription s = subscriptions.startTrial(k);
        return Map.of("kitchen", k, "subscription", s);
    }

    @PatchMapping("/accepting")
    @Transactional
    public Kitchen setAccepting(@RequestBody Map<String, Boolean> body) {
        Kitchen k = current.kitchen();
        k.setAcceptingOrders(Boolean.TRUE.equals(body.get("accepting")));
        return kitchens.save(k);
    }

    @GetMapping("/dashboard")
    public Map<String, Object> dashboard() {
        return stats.kitchenDashboard(current.kitchen());
    }

    // ---------------- menu
    @GetMapping("/menu")
    public List<MenuItem> menu() {
        return menu.findByKitchenIdOrderByMealTypeAscIdAsc(current.kitchen().getId());
    }

    @PostMapping("/menu")
    @Transactional
    public MenuItem addItem(@RequestBody MenuItem in) {
        MenuItem m = new MenuItem();
        m.setKitchen(current.kitchen());
        copy(in, m);
        dailyMenu.menuChanged(current.kitchen());
        return menu.save(m);
    }

    @PutMapping("/menu/{id}")
    @Transactional
    public MenuItem updateItem(@PathVariable Long id, @RequestBody MenuItem in) {
        MenuItem m = ownItem(id);
        copy(in, m);
        dailyMenu.menuChanged(current.kitchen());
        return menu.save(m);
    }

    @PatchMapping("/menu/{id}/availability")
    @Transactional
    public MenuItem toggle(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        MenuItem m = ownItem(id);
        if (body.containsKey("available")) m.setAvailable(Boolean.TRUE.equals(body.get("available")));
        if (body.containsKey("quantityAvailable") && body.get("quantityAvailable") != null) {
            m.setQuantityAvailable(((Number) body.get("quantityAvailable")).intValue());
        }
        return menu.save(m);
    }

    @DeleteMapping("/menu/{id}")
    @Transactional
    public Map<String, Object> deleteItem(@PathVariable Long id) {
        menu.delete(ownItem(id));
        dailyMenu.menuChanged(current.kitchen());
        return Map.of("deleted", true);
    }

    private MenuItem ownItem(Long id) {
        MenuItem m = menu.findById(id).orElseThrow(() -> ApiException.notFound("Item not found"));
        if (!m.getKitchen().getId().equals(current.kitchen().getId())) throw ApiException.forbidden("Not your item");
        return m;
    }

    private void copy(MenuItem in, MenuItem m) {
        if (blank(in.getName())) throw ApiException.badRequest("Item name is required");
        if (in.getPrice() == null || in.getPrice().compareTo(BigDecimal.ONE) < 0) throw ApiException.badRequest("Enter a valid price");
        if (in.getOfferPrice() != null && in.getOfferPrice().compareTo(in.getPrice()) >= 0) {
            throw ApiException.badRequest("Offer price must be lower than the regular price");
        }
        m.setName(in.getName());
        m.setDescription(in.getDescription());
        m.setImageUrl(in.getImageUrl());
        m.setPrice(in.getPrice());
        m.setOfferPrice(in.getOfferPrice());
        m.setVeg(in.isVeg());
        m.setMealType(in.getMealType() == null ? Enums.MealType.LUNCH : in.getMealType());
        m.setCategory(in.getCategory());
        m.setQuantityAvailable(in.getQuantityAvailable());
        m.setAvailable(in.isAvailable());
        m.setTodaySpecial(in.isTodaySpecial());
        m.setAvailableFrom(in.getAvailableFrom());
        m.setAvailableTo(in.getAvailableTo());
        m.setServingSize(in.getServingSize());
    }

    // ---------------- custom requests
    @GetMapping("/requests")
    public List<Map<String, Object>> openRequests() {
        return requestService.openForKitchen(current.kitchen());
    }

    @GetMapping("/requests/history")
    public List<Map<String, Object>> requestHistory() {
        return requestService.quotedByKitchen(current.kitchen());
    }

    @PostMapping("/requests/{id}/quote")
    public Quotation quote(@PathVariable Long id, @Valid @RequestBody Dtos.QuoteRequest req) {
        return requestService.quote(current.kitchen(), id, req);
    }

    @PostMapping("/requests/{id}/decline")
    public Map<String, Object> decline(@PathVariable Long id) {
        requestService.decline(current.kitchen(), id);
        return Map.of("declined", true);
    }

    // ---------------- orders
    @GetMapping("/orders")
    public List<FoodOrder> orders() {
        return orders.findByKitchenIdOrderByCreatedAtDesc(current.kitchen().getId());
    }

    @PatchMapping("/orders/{id}/status")
    public FoodOrder updateStatus(@PathVariable Long id, @Valid @RequestBody Dtos.StatusUpdate req) {
        return orderService.kitchenUpdateStatus(current.kitchen(), id, req.status(), req.reason());
    }

    /** Delivery person's live GPS position (sent every few seconds while the order is out for delivery). */
    @PostMapping("/orders/{id}/location")
    public Map<String, Object> riderLocation(@PathVariable Long id, @RequestBody Map<String, Double> body) {
        Double lat = body.get("lat"), lng = body.get("lng");
        if (lat == null || lng == null) throw ApiException.badRequest("lat and lng are required");
        FoodOrder o = orderService.updateRiderLocation(current.kitchen(), id, lat, lng);
        return Map.of("ok", true, "updatedAt", o.getRiderUpdatedAt().toString());
    }

    // ---------------- cooking videos
    @GetMapping("/videos")
    public List<CookingVideo> videos() {
        return videos.findByKitchenIdOrderByCreatedAtDesc(current.kitchen().getId());
    }

    @PostMapping("/videos")
    @Transactional
    public CookingVideo submitVideo(@Valid @RequestBody Dtos.VideoSubmitRequest req) {
        if (req.preparationDate().isAfter(LocalDate.now())) throw ApiException.badRequest("Preparation date can't be in the future");
        CookingVideo v = new CookingVideo();
        v.setKitchen(current.kitchen());
        v.setVideoUrl(req.videoUrl());
        v.setThumbnailUrl(req.thumbnailUrl());
        v.setPreparationDate(req.preparationDate());
        v.setDescription(req.description());
        v.setDurationSeconds(req.durationSeconds());
        return videos.save(v);
    }

    // ---------------- earnings & subscription
    @GetMapping("/earnings")
    public Map<String, Object> earnings() {
        return stats.kitchenEarnings(current.kitchen());
    }

    @GetMapping("/subscription")
    public Map<String, Object> subscription() {
        Map<String, Object> m = new LinkedHashMap<>(subscriptions.summary(current.kitchen().getId()));
        m.put("plans", plans.findByActiveTrueOrderByPriceAsc());
        return m;
    }

    @PostMapping("/subscription")
    public Subscription subscribe(@Valid @RequestBody Dtos.SubscribeRequest req) {
        return subscriptions.subscribe(current.kitchen(), req.planId(), req.paymentMethod());
    }

    // ---------------- reviews & complaints
    @GetMapping("/reviews")
    public List<Review> reviews() {
        return reviews.findByKitchenIdOrderByCreatedAtDesc(current.kitchen().getId());
    }

    @PostMapping("/reviews/{id}/reply")
    @Transactional
    public Review reply(@PathVariable Long id, @Valid @RequestBody Dtos.ReplyRequest req) {
        Review r = reviews.findById(id).orElseThrow(() -> ApiException.notFound("Review not found"));
        if (!r.getKitchen().getId().equals(current.kitchen().getId())) throw ApiException.forbidden("Not your review");
        r.setKitchenReply(req.reply());
        return reviews.save(r);
    }

    @GetMapping("/complaints")
    public List<Complaint> complaints() {
        return complaints.findByKitchenIdOrderByCreatedAtDesc(current.kitchen().getId());
    }

    private static boolean blank(String s) { return s == null || s.isBlank(); }
}
