package com.homeplate.repository;

import com.homeplate.entity.MealSubscription;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MealSubscriptionRepository extends JpaRepository<MealSubscription, Long> {
    List<MealSubscription> findByCustomerIdOrderByCreatedAtDesc(Long customerId);
    List<MealSubscription> findByKitchenIdOrderByCreatedAtDesc(Long kitchenId);
    List<MealSubscription> findAllByOrderByCreatedAtDesc();
}
