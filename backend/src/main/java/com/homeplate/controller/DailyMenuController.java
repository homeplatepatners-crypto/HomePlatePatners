package com.homeplate.controller;

import com.homeplate.entity.Enums;
import com.homeplate.entity.Kitchen;
import com.homeplate.repository.KitchenRepository;
import com.homeplate.repository.MenuItemRepository;
import com.homeplate.security.CurrentUser;
import com.homeplate.service.DailyMenuService;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/** Daily menu: kitchen publishes (/api/kitchen/...), admin verifies (/api/admin/...). Paths are secured by role prefix. */
@RestController
public class DailyMenuController {
    private final DailyMenuService daily;
    private final KitchenRepository kitchens;
    private final MenuItemRepository menu;
    private final CurrentUser current;

    public DailyMenuController(DailyMenuService daily, KitchenRepository kitchens, MenuItemRepository menu, CurrentUser current) {
        this.daily = daily;
        this.kitchens = kitchens;
        this.menu = menu;
        this.current = current;
    }

    @GetMapping("/api/kitchen/menu/status")
    public Map<String, Object> status() { return daily.summary(current.kitchen()); }

    @PostMapping("/api/kitchen/menu/publish")
    public Map<String, Object> publish() { return daily.publish(current.kitchen()); }

    /** Today's menus for all active kitchens, pending ones first. */
    @GetMapping("/api/admin/menus")
    public List<Map<String, Object>> todaysMenus() {
        List<Map<String, Object>> out = new ArrayList<>();
        for (Kitchen k : kitchens.findByStatus(Enums.KitchenStatus.ACTIVE)) {
            Map<String, Object> m = new LinkedHashMap<>(daily.summary(k));
            m.put("kitchenId", k.getId());
            m.put("kitchenName", k.getName());
            m.put("ownerName", k.getOwner().getFullName());
            m.put("area", k.getArea());
            m.put("items", menu.findByKitchenIdOrderByMealTypeAscIdAsc(k.getId()).stream().filter(i -> i.isAvailable()).toList());
            out.add(m);
        }
        List<String> order = List.of(DailyMenuService.PENDING, DailyMenuService.REJECTED, DailyMenuService.NOT_PUBLISHED, DailyMenuService.VERIFIED);
        out.sort(Comparator.comparingInt(m -> order.indexOf((String) m.get("status"))));
        return out;
    }

    @PostMapping("/api/admin/kitchens/{id}/menu-review")
    public Map<String, Object> review(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return daily.review(id, "VERIFY".equalsIgnoreCase(body.get("action")), body.get("remarks"));
    }
}
