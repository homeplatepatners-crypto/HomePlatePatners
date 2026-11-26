package com.homeplate.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/** In-app notification shown in the bell menu (order confirmed, status updates, new offers...). */
@Entity
@Table(name = "app_notifications", indexes = @Index(name = "idx_notif_user", columnList = "user_id, createdAt"))
@Getter @Setter @NoArgsConstructor
public class AppNotification {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(length = 120) private String title;
    @Column(length = 400) private String message;
    /** In-app path to open, e.g. /orders/12 */
    @Column(length = 200) private String link;
    /** ORDER, REQUEST, OFFER, MENU, SUBSCRIPTION, SYSTEM */
    @Column(length = 20) private String type;

    @Column(name = "is_read") private boolean read;
    private LocalDateTime createdAt = LocalDateTime.now();
}
