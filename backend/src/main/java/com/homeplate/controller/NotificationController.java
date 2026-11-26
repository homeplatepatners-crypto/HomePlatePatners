package com.homeplate.controller;

import com.homeplate.config.ApiException;
import com.homeplate.entity.AppNotification;
import com.homeplate.repository.AppNotificationRepository;
import com.homeplate.security.CurrentUser;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/** Bell-menu notifications for the logged-in user (any role). */
@RestController
@RequestMapping("/api/notifications")
public class NotificationController {
    private final AppNotificationRepository repo;
    private final CurrentUser current;

    public NotificationController(AppNotificationRepository repo, CurrentUser current) {
        this.repo = repo;
        this.current = current;
    }

    @GetMapping
    public Map<String, Object> list() {
        Long uid = current.user().getId();
        return Map.of("items", repo.findTop30ByUserIdOrderByCreatedAtDesc(uid), "unread", repo.countByUserIdAndReadFalse(uid));
    }

    @PostMapping("/{id}/read")
    @Transactional
    public Map<String, Object> read(@PathVariable Long id) {
        AppNotification n = repo.findById(id).orElseThrow(() -> ApiException.notFound("Notification not found"));
        if (!n.getUser().getId().equals(current.user().getId())) throw ApiException.forbidden("Not yours");
        n.setRead(true);
        return Map.of("read", true);
    }

    @PostMapping("/read-all")
    @Transactional
    public Map<String, Object> readAll() {
        return Map.of("updated", repo.markAllRead(current.user().getId()));
    }
}
