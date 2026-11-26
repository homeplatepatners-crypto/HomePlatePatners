package com.homeplate.repository;

import com.homeplate.entity.AppNotification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface AppNotificationRepository extends JpaRepository<AppNotification, Long> {
    List<AppNotification> findTop30ByUserIdOrderByCreatedAtDesc(Long userId);
    long countByUserIdAndReadFalse(Long userId);

    @Modifying
    @Query("update AppNotification n set n.read = true where n.user.id = :userId and n.read = false")
    int markAllRead(Long userId);
}
