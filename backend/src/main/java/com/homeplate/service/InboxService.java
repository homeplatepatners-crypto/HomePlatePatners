package com.homeplate.service;

import com.homeplate.entity.AppNotification;
import com.homeplate.entity.User;
import com.homeplate.repository.AppNotificationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/** Creates in-app notifications (bell menu). Never throws, so it can't break the business action. */
@Service
public class InboxService {
    private static final Logger log = LoggerFactory.getLogger(InboxService.class);
    private final AppNotificationRepository repo;

    public InboxService(AppNotificationRepository repo) { this.repo = repo; }

    public void push(User user, String type, String title, String message, String link) {
        if (user == null) return;
        try {
            AppNotification n = new AppNotification();
            n.setUser(user);
            n.setType(type);
            n.setTitle(title);
            n.setMessage(message);
            n.setLink(link);
            repo.save(n);
        } catch (Exception e) {
            log.warn("Could not save notification for user {}: {}", user.getId(), e.getMessage());
        }
    }
}
