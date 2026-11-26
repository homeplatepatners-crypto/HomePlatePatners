package com.homeplate.repository;

import com.homeplate.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.*;
import java.util.*;

public interface MenuItemRepository extends JpaRepository<MenuItem, Long> {
    List<MenuItem> findByKitchenIdOrderByMealTypeAscIdAsc(Long kitchenId);
    List<MenuItem> findByKitchenIdAndAvailableTrueOrderByMealTypeAscIdAsc(Long kitchenId);
    List<MenuItem> findByTodaySpecialTrueAndAvailableTrue();
    List<MenuItem> findTop200ByNameContainingIgnoreCaseOrCategoryContainingIgnoreCase(String name, String category);
}
