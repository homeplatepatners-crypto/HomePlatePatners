package com.homeplate.service;

import com.homeplate.config.ApiException;
import com.homeplate.entity.Kitchen;
import com.homeplate.entity.Role;
import com.homeplate.repository.KitchenRepository;
import com.homeplate.repository.MenuItemRepository;
import com.homeplate.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Daily menu verification.
 * Every day the kitchen publishes today's menu; HomePlate verifies it. Until it is verified for today the kitchen
 * can't receive daily-menu orders (when PlatformSettings.requireMenuVerification is on - the default).
 * Editing the menu after verification sends it back for re-verification.
 */
@Service
public class DailyMenuService {
    public static final String NOT_PUBLISHED = "NOT_PUBLISHED", PENDING = "PENDING", VERIFIED = "VERIFIED", REJECTED = "REJECTED";

    private final KitchenRepository kitchens;
    private final MenuItemRepository menu;
    private final UserRepository users;
    private final SettingsService settings;
    private final InboxService inbox;

    public DailyMenuService(KitchenRepository kitchens, MenuItemRepository menu, UserRepository users,
                            SettingsService settings, InboxService inbox) {
        this.kitchens = kitchens;
        this.menu = menu;
        this.users = users;
        this.settings = settings;
        this.inbox = inbox;
    }

    public boolean required() {
        return !Boolean.FALSE.equals(settings.get().getRequireMenuVerification());
    }

    public String status(Kitchen k) {
        LocalDate today = LocalDate.now();
        if (!today.equals(k.getMenuPublishedDate())) return NOT_PUBLISHED;
        if (today.equals(k.getMenuVerifiedDate())) return VERIFIED;
        if (k.getMenuRemarks() != null && !k.getMenuRemarks().isBlank()) return REJECTED;
        return PENDING;
    }

    /** True when the kitchen may take daily-menu orders today. */
    public boolean ready(Kitchen k) {
        return !required() || VERIFIED.equals(status(k));
    }

    public Map<String, Object> summary(Kitchen k) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("status", status(k));
        m.put("required", required());
        m.put("ready", ready(k));
        m.put("publishedAt", k.getMenuPublishedAt());
        m.put("remarks", k.getMenuRemarks());
        m.put("availableItems", menu.findByKitchenIdOrderByMealTypeAscIdAsc(k.getId()).stream().filter(i -> i.isAvailable()).count());
        return m;
    }

    @Transactional
    public Map<String, Object> publish(Kitchen k) {
        long available = menu.findByKitchenIdOrderByMealTypeAscIdAsc(k.getId()).stream().filter(i -> i.isAvailable()).count();
        if (available == 0) throw ApiException.badRequest("Add at least one available dish before publishing today's menu");
        k.setMenuPublishedDate(LocalDate.now());
        k.setMenuPublishedAt(LocalDateTime.now());
        k.setMenuVerifiedDate(null);
        k.setMenuRemarks(null);
        kitchens.save(k);
        users.findByRoleOrderByCreatedAtDesc(Role.ADMIN).forEach(a -> inbox.push(a, "MENU", "Menu to verify: " + k.getName(),
                available + " dish(es) published for today.", "/admin/menus"));
        return summary(k);
    }

    /** Called when the kitchen edits its menu: a verified menu for today goes back to pending. */
    @Transactional
    public void menuChanged(Kitchen k) {
        if (LocalDate.now().equals(k.getMenuVerifiedDate())) {
            k.setMenuVerifiedDate(null);
            kitchens.save(k);
        }
    }

    @Transactional
    public Map<String, Object> review(Long kitchenId, boolean approve, String remarks) {
        Kitchen k = kitchens.findById(kitchenId).orElseThrow(() -> ApiException.notFound("Kitchen not found"));
        if (!LocalDate.now().equals(k.getMenuPublishedDate())) throw ApiException.badRequest("This kitchen hasn't published today's menu");
        if (approve) {
            k.setMenuVerifiedDate(LocalDate.now());
            k.setMenuRemarks(null);
            inbox.push(k.getOwner(), "MENU", "Today's menu is verified", "Customers can now order from your daily menu.", "/kitchen/menu");
        } else {
            if (remarks == null || remarks.isBlank()) throw ApiException.badRequest("Give a reason so the kitchen can fix the menu");
            k.setMenuVerifiedDate(null);
            k.setMenuRemarks(remarks.trim());
            inbox.push(k.getOwner(), "MENU", "Menu needs changes", remarks.trim() + " - update your menu and publish again.", "/kitchen/menu");
        }
        kitchens.save(k);
        return summary(k);
    }
}
