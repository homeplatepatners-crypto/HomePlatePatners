package com.homeplate.repository;

import com.homeplate.entity.MealPlan;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MealPlanRepository extends JpaRepository<MealPlan, Long> {
    List<MealPlan> findByKitchenIdOrderByPriceAsc(Long kitchenId);
    List<MealPlan> findByKitchenIdAndActiveTrueOrderByPriceAsc(Long kitchenId);
}
