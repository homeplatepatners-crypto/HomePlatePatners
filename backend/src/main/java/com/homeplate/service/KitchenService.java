package com.homeplate.service;

import com.homeplate.config.ApiException;
import com.homeplate.entity.*;
import com.homeplate.repository.*;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.TextStyle;
import java.util.*;
import java.util.stream.Collectors;

/** Customer facing kitchen discovery, details and the transparent trust profile. */
@Service
public class KitchenService {
    private final KitchenRepository kitchens;
    private final MenuItemRepository menu;
    private final ReviewRepository reviews;
    private final CookingVideoRepository videos;
    private final ComplaintRepository complaints;
    private final FoodOrderRepository orders;
    private final SubscriptionService subscriptions;
    private final SettingsService settings;

    @org.springframework.beans.factory.annotation.Autowired @org.springframework.context.annotation.Lazy
    private DailyMenuService dailyMenu;

    public KitchenService(KitchenRepository kitchens, MenuItemRepository menu, ReviewRepository reviews,
                          CookingVideoRepository videos, ComplaintRepository complaints, FoodOrderRepository orders,
                          SubscriptionService subscriptions, SettingsService settings) {
        this.kitchens = kitchens;
        this.menu = menu;
        this.reviews = reviews;
        this.videos = videos;
        this.complaints = complaints;
        this.orders = orders;
        this.subscriptions = subscriptions;
        this.settings = settings;
    }

    public boolean isVisible(Kitchen k) {
        return k.getStatus() == Enums.KitchenStatus.ACTIVE && subscriptions.isValid(k.getId());
    }

    public boolean isOpenNow(Kitchen k) {
        LocalDateTime now = LocalDateTime.now();
        String day = now.getDayOfWeek().getDisplayName(TextStyle.SHORT, Locale.ENGLISH).toUpperCase();
        boolean workingDay = k.getWorkingDays() == null || k.getWorkingDays().toUpperCase().contains(day);
        LocalTime t = now.toLocalTime();
        boolean inHours = k.getOpenTime() == null || k.getCloseTime() == null
                || (!t.isBefore(k.getOpenTime()) && t.isBefore(k.getCloseTime()));
        return workingDay && inHours;
    }

    public long todaysOrderCount(Long kitchenId) {
        LocalDateTime start = LocalDate.now().atStartOfDay();
        return orders.findByKitchenIdAndCreatedAtBetween(kitchenId, start, start.plusDays(1)).stream()
                .filter(o -> o.getStatus() != Enums.OrderStatus.CANCELLED && o.getStatus() != Enums.OrderStatus.REJECTED)
                .count();
    }

    public List<Map<String, Object>> discover(Double lat, Double lng, Double radiusKm, String foodType,
                                              Double minRating, Boolean openOnly, Boolean budget,
                                              String cuisine, String q, String sort) {
        double maxRadius = settings.get().getDiscoveryRadiusKm();
        double radius = radiusKm == null ? maxRadius : Math.min(radiusKm, maxRadius);
        String query = q == null ? "" : q.trim().toLowerCase();

        List<Map<String, Object>> out = new ArrayList<>();
        for (Kitchen k : kitchens.findByStatus(Enums.KitchenStatus.ACTIVE)) {
            if (!subscriptions.isValid(k.getId())) continue;
            Double d = Geo.distanceKm(lat, lng, k.getLatitude(), k.getLongitude());
            if (d != null) {
                double serviceRadius = Math.min(radius, Optional.ofNullable(k.getDeliveryRadiusKm()).orElse(maxRadius));
                if (d > serviceRadius) continue;
            }
            if ("VEG".equalsIgnoreCase(foodType) && k.getFoodType() != Enums.FoodType.VEG) continue;
            if ("NON_VEG".equalsIgnoreCase(foodType) && k.getFoodType() == Enums.FoodType.VEG) continue;
            if (minRating != null && Optional.ofNullable(k.getRating()).orElse(0.0) < minRating) continue;
            if (cuisine != null && !cuisine.isBlank()
                    && (k.getCuisines() == null || !k.getCuisines().toLowerCase().contains(cuisine.toLowerCase()))) continue;

            List<MenuItem> items = menu.findByKitchenIdAndAvailableTrueOrderByMealTypeAscIdAsc(k.getId());
            if (!query.isEmpty()) {
                boolean match = k.getName().toLowerCase().contains(query)
                        || (k.getCuisines() != null && k.getCuisines().toLowerCase().contains(query))
                        || (k.getArea() != null && k.getArea().toLowerCase().contains(query))
                        || items.stream().anyMatch(i -> i.getName().toLowerCase().contains(query));
                if (!match) continue;
            }
            Map<String, Object> card = card(k, d, items);
            if (Boolean.TRUE.equals(openOnly) && !Boolean.TRUE.equals(card.get("acceptingNow"))) continue;
            if (Boolean.TRUE.equals(budget)) {
                BigDecimal min = (BigDecimal) card.get("minPrice");
                if (min == null || min.compareTo(new BigDecimal("100")) > 0) continue;
            }
            out.add(card);
        }
        Comparator<Map<String, Object>> cmp = switch (sort == null ? "distance" : sort) {
            case "rating" -> Comparator.comparing((Map<String, Object> m) -> (Double) m.get("rating")).reversed();
            case "price" -> Comparator.comparing(m -> Optional.ofNullable((BigDecimal) m.get("minPrice")).orElse(BigDecimal.valueOf(9999)));
            default -> Comparator.comparing(m -> Optional.ofNullable((Double) m.get("distanceKm")).orElse(999.0));
        };
        out.sort(cmp);
        return out;
    }

    public Map<String, Object> card(Kitchen k, Double distance, List<MenuItem> items) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", k.getId());
        m.put("name", k.getName());
        m.put("ownerName", k.getOwner().getFullName());
        m.put("coverImage", k.getCoverImage());
        m.put("area", k.getArea());
        m.put("city", k.getCity());
        m.put("cuisines", splitList(k.getCuisines()));
        m.put("foodType", k.getFoodType());
        m.put("rating", Optional.ofNullable(k.getRating()).orElse(0.0));
        m.put("ratingCount", Optional.ofNullable(k.getRatingCount()).orElse(0));
        m.put("distanceKm", distance);
        int prep = Optional.ofNullable(k.getAvgPrepMinutes()).orElse(30);
        m.put("etaMinutes", distance == null ? prep + 15 : prep + (int) Math.ceil(distance * 4) + 5);
        m.put("openTime", k.getOpenTime());
        m.put("closeTime", k.getCloseTime());
        boolean open = isOpenNow(k);
        m.put("openNow", open);
        m.put("acceptingOrders", k.isAcceptingOrders());
        boolean menuReady = dailyMenu.ready(k);
        m.put("menuReady", menuReady);
        m.put("menuStatus", dailyMenu.status(k));
        m.put("acceptingNow", open && k.isAcceptingOrders() && menuReady);
        m.put("todaySpecial", k.getTodaySpecial());
        m.put("verified", k.getIdProofStatus() == Enums.DocumentStatus.VERIFIED);
        m.put("fssaiVerified", k.getFssaiStatus() == Enums.DocumentStatus.VERIFIED);
        m.put("lastVideoVerifiedOn", videos.findFirstByKitchenIdAndStatusOrderByPreparationDateDesc(k.getId(), Enums.VideoStatus.APPROVED)
                .map(CookingVideo::getPreparationDate).orElse(null));
        m.put("minPrice", items.stream().map(i -> i.getOfferPrice() != null ? i.getOfferPrice() : i.getPrice())
                .min(BigDecimal::compareTo).orElse(null));
        m.put("itemCount", items.size());
        m.put("deliveryRadiusKm", k.getDeliveryRadiusKm());
        m.put("latitude", k.getLatitude());
        m.put("longitude", k.getLongitude());
        return m;
    }

    public Map<String, Object> details(Long id, Double lat, Double lng) {
        Kitchen k = kitchens.findById(id).orElseThrow(() -> ApiException.notFound("Kitchen not found"));
        if (!isVisible(k)) throw ApiException.notFound("This kitchen is not available right now");
        List<MenuItem> items = menu.findByKitchenIdAndAvailableTrueOrderByMealTypeAscIdAsc(id).stream()
                .filter(i -> (i.getAvailableFrom() == null || !i.getAvailableFrom().isAfter(LocalDate.now()))
                        && (i.getAvailableTo() == null || !i.getAvailableTo().isBefore(LocalDate.now())))
                .toList();
        Double d = Geo.distanceKm(lat, lng, k.getLatitude(), k.getLongitude());
        Map<String, Object> m = card(k, d, items);
        m.put("description", k.getDescription());
        m.put("gallery", splitList(k.getGalleryImages()));
        m.put("address", k.getAddress());
        m.put("workingDays", splitList(k.getWorkingDays()));
        m.put("breakfastAvailable", k.isBreakfastAvailable());
        m.put("lunchAvailable", k.isLunchAvailable());
        m.put("dinnerAvailable", k.isDinnerAvailable());
        m.put("selfDelivery", k.isSelfDelivery());
        m.put("ownerPhone", k.getOwner().getPhone());
        m.put("withinDeliveryRange", d == null || d <= Optional.ofNullable(k.getDeliveryRadiusKm()).orElse(5.0));
        m.put("menu", items);
        m.put("reviews", reviews.findByKitchenIdOrderByCreatedAtDesc(id).stream().limit(20).toList());
        m.put("trust", trustProfile(k));
        return m;
    }

    /** Transparent trust profile: documents, videos, ratings and complaint history. */
    public Map<String, Object> trustProfile(Kitchen k) {
        Map<String, Object> t = new LinkedHashMap<>();
        t.put("identityVerified", k.getIdProofStatus() == Enums.DocumentStatus.VERIFIED);
        t.put("fssaiVerified", k.getFssaiStatus() == Enums.DocumentStatus.VERIFIED);
        t.put("fssaiNumber", maskFssai(k.getFssaiNumber()));
        t.put("phoneVerified", k.isPhoneVerified());
        List<CookingVideo> vids = videos.findByKitchenIdOrderByCreatedAtDesc(k.getId());
        LocalDate since = LocalDate.now().minusDays(30);
        t.put("videosApprovedLast30Days", vids.stream().filter(v -> v.getStatus() == Enums.VideoStatus.APPROVED
                && v.getPreparationDate() != null && v.getPreparationDate().isAfter(since)).count());
        t.put("lastVideoSubmittedOn", vids.stream().findFirst().map(CookingVideo::getPreparationDate).orElse(null));
        t.put("lastVideoStatus", vids.stream().findFirst().map(CookingVideo::getStatus).orElse(null));
        List<Complaint> cs = complaints.findByKitchenIdOrderByCreatedAtDesc(k.getId());
        t.put("complaintsTotal", cs.size());
        t.put("complaintsResolved", cs.stream().filter(c -> c.getStatus() == Enums.ComplaintStatus.RESOLVED
                || c.getStatus() == Enums.ComplaintStatus.CLOSED).count());
        t.put("rating", k.getRating());
        t.put("ratingCount", k.getRatingCount());
        t.put("ordersCompleted", orders.findByKitchenIdOrderByCreatedAtDesc(k.getId()).stream()
                .filter(o -> o.getStatus() == Enums.OrderStatus.DELIVERED).count());
        t.put("lastInspectionAt", k.getLastInspectionAt());
        t.put("memberSince", k.getApprovedAt() != null ? k.getApprovedAt() : k.getCreatedAt());
        return t;
    }

    public List<Map<String, Object>> todaysSpecials(Double lat, Double lng) {
        double radius = settings.get().getDiscoveryRadiusKm();
        List<Map<String, Object>> out = new ArrayList<>();
        for (MenuItem i : menu.findByTodaySpecialTrueAndAvailableTrue()) {
            Kitchen k = i.getKitchen();
            if (!isVisible(k)) continue;
            Double d = Geo.distanceKm(lat, lng, k.getLatitude(), k.getLongitude());
            if (d != null && d > Math.min(radius, Optional.ofNullable(k.getDeliveryRadiusKm()).orElse(radius))) continue;
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("item", i);
            m.put("kitchenId", k.getId());
            m.put("kitchenName", k.getName());
            m.put("area", k.getArea());
            m.put("distanceKm", d);
            m.put("rating", k.getRating());
            out.add(m);
        }
        out.sort(Comparator.comparing(m -> Optional.ofNullable((Double) m.get("distanceKm")).orElse(999.0)));
        return out;
    }

    public static List<String> splitList(String s) {
        if (s == null || s.isBlank()) return List.of();
        return Arrays.stream(s.split("[,|]")).map(String::trim).filter(x -> !x.isEmpty()).collect(Collectors.toList());
    }

    private String maskFssai(String n) {
        if (n == null || n.length() < 6) return n;
        return n.substring(0, 4) + "******" + n.substring(n.length() - 4);
    }

    public static String dayCode(DayOfWeek d) {
        return d.getDisplayName(TextStyle.SHORT, Locale.ENGLISH).toUpperCase();
    }

    /**
     * Dish search for the "Request a dish" page: which nearby kitchens have it available today,
     * and which have it on their menu but can't serve it now (with the reason).
     */
    public Map<String, Object> searchDishes(String q, Double lat, Double lng) {
        List<Map<String, Object>> available = new ArrayList<>(), unavailable = new ArrayList<>();
        String term = q == null ? "" : q.trim();
        if (term.length() >= 2) {
            double maxRadius = settings.get().getDiscoveryRadiusKm();
            for (MenuItem i : menu.findTop200ByNameContainingIgnoreCaseOrCategoryContainingIgnoreCase(term, term)) {
                Kitchen k = i.getKitchen();
                if (!isVisible(k)) continue;
                Double d = Geo.distanceKm(lat, lng, k.getLatitude(), k.getLongitude());
                double radius = Math.min(maxRadius, Optional.ofNullable(k.getDeliveryRadiusKm()).orElse(maxRadius));
                if (d != null && d > radius) continue;
                String reason = null;
                if (!i.isAvailable()) reason = "Not on today's menu";
                else if (i.getQuantityAvailable() != null && i.getQuantityAvailable() <= 0) reason = "Sold out today";
                else if (!dailyMenu.ready(k)) reason = "Today's menu awaiting verification";
                else if (!k.isAcceptingOrders()) reason = "Kitchen paused orders";
                else if (!isOpenNow(k)) reason = "Kitchen closed now";
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("itemId", i.getId());
                m.put("name", i.getName());
                m.put("price", i.getOfferPrice() != null ? i.getOfferPrice() : i.getPrice());
                m.put("veg", i.isVeg());
                m.put("imageUrl", i.getImageUrl());
                m.put("mealType", i.getMealType());
                m.put("kitchenId", k.getId());
                m.put("kitchenName", k.getName());
                m.put("distanceKm", d);
                m.put("reason", reason);
                (reason == null ? available : unavailable).add(m);
            }
        }
        Comparator<Map<String, Object>> byDist = Comparator.comparing(m -> Optional.ofNullable((Double) m.get("distanceKm")).orElse(999.0));
        available.sort(byDist);
        unavailable.sort(byDist);
        return Map.of("query", term, "available", available.stream().limit(8).toList(), "unavailable", unavailable.stream().limit(8).toList());
    }
}
