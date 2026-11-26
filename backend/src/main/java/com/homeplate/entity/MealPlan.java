package com.homeplate.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** A regular meal plan a kitchen offers to customers (e.g. "Monthly lunch box - 26 meals"). */
@Entity
@Table(name = "meal_plans")
@Getter @Setter @NoArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class MealPlan {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "kitchen_id")
    private Kitchen kitchen;

    @Column(nullable = false, length = 100) private String name;
    @Column(length = 500) private String description;

    @Enumerated(EnumType.STRING) @Column(length = 20)
    private Enums.MealType mealSlot = Enums.MealType.LUNCH;

    private boolean veg = true;
    /** Plan length in days (7 / 15 / 30). */
    private Integer durationDays = 30;
    /** Delivery days, e.g. MON,TUE,WED,THU,FRI,SAT */
    @Column(length = 40) private String deliveryDays = "MON,TUE,WED,THU,FRI,SAT";
    /** Total plan price for the whole duration. */
    @Column(precision = 10, scale = 2) private BigDecimal price;
    private boolean active = true;
    private LocalDateTime createdAt = LocalDateTime.now();

    @JsonProperty("kitchenId")
    public Long kitchenIdJson() { return kitchen == null ? null : kitchen.getId(); }
}
