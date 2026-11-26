package com.homeplate.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/** A customer's regular meal subscription with a kitchen. */
@Entity
@Table(name = "meal_subscriptions")
@Getter @Setter @NoArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class MealSubscription {
    public enum Status { ACTIVE, PAUSED, CANCELLED, COMPLETED }

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnoreProperties({"password", "hibernateLazyInitializer", "handler"})
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "customer_id")
    private User customer;

    @JsonIgnoreProperties({"description", "galleryImages", "hibernateLazyInitializer", "handler"})
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "kitchen_id")
    private Kitchen kitchen;

    private Long planId;
    @Column(length = 100) private String planName;
    @Enumerated(EnumType.STRING) @Column(length = 20) private Enums.MealType mealSlot;
    private boolean veg;
    @Column(length = 40) private String deliveryDays;

    private LocalDate startDate;
    private LocalDate endDate;

    @Enumerated(EnumType.STRING) @Column(length = 20)
    private Status status = Status.ACTIVE;

    @Column(precision = 10, scale = 2) private BigDecimal amount;
    @Column(precision = 10, scale = 2) private BigDecimal commission = BigDecimal.ZERO;
    @Column(precision = 10, scale = 2) private BigDecimal kitchenEarning = BigDecimal.ZERO;
    @Enumerated(EnumType.STRING) @Column(length = 20) private Enums.PaymentMethod paymentMethod;
    @Column(length = 60) private String paymentReference;

    @Column(length = 400) private String deliveryAddress;
    private Double deliveryLatitude;
    private Double deliveryLongitude;
    @Column(length = 300) private String notes;

    private LocalDate pausedFrom;
    private LocalDateTime createdAt = LocalDateTime.now();
}
