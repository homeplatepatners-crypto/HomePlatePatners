package com.homeplate.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "orders")
@Getter @Setter @NoArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class FoodOrder {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, length = 20)
    private String orderNumber;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "customer_id")
    private User customer;

    @JsonIgnoreProperties({"description", "galleryImages"})
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "kitchen_id")
    private Kitchen kitchen;

    @Enumerated(EnumType.STRING) @Column(length = 20)
    private Enums.OrderType orderType = Enums.OrderType.DAILY_MENU;

    private Long customRequestId;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @OrderBy("id")
    private List<OrderItem> items = new ArrayList<>();

    @Column(precision = 10, scale = 2) private BigDecimal foodTotal = BigDecimal.ZERO;
    @Column(precision = 10, scale = 2) private BigDecimal deliveryCharge = BigDecimal.ZERO;
    @Column(precision = 10, scale = 2) private BigDecimal platformFee = BigDecimal.ZERO;
    @Column(precision = 10, scale = 2) private BigDecimal discount = BigDecimal.ZERO;
    @Column(precision = 10, scale = 2) private BigDecimal totalAmount = BigDecimal.ZERO;
    /** Platform commission deducted from the kitchen food total. */
    @Column(precision = 10, scale = 2) private BigDecimal commission = BigDecimal.ZERO;
    @Column(precision = 10, scale = 2) private BigDecimal kitchenEarning = BigDecimal.ZERO;

    @Column(length = 30) private String couponCode;

    @Enumerated(EnumType.STRING) @Column(length = 25)
    private Enums.OrderStatus status = Enums.OrderStatus.PLACED;

    @Enumerated(EnumType.STRING) @Column(length = 20)
    private Enums.PaymentStatus paymentStatus = Enums.PaymentStatus.PENDING;

    @Enumerated(EnumType.STRING) @Column(length = 20)
    private Enums.PaymentMethod paymentMethod;

    @Column(length = 60) private String paymentReference;

    @Column(length = 400) private String deliveryAddress;
    @Column(length = 80) private String deliveryArea;
    private Double deliveryLatitude;
    private Double deliveryLongitude;
    private Double distanceKm;

    @Enumerated(EnumType.STRING) @Column(length = 20)
    private Enums.MealType mealSlot;

    @Column(length = 500) private String notes;
    @Column(length = 300) private String cancelReason;

    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime estimatedDeliveryAt;
    private LocalDateTime confirmedAt;
    private LocalDateTime preparingAt;
    private LocalDateTime readyAt;
    private LocalDateTime outForDeliveryAt;
    private LocalDateTime deliveredAt;

    /** Live position of the delivery person while OUT_FOR_DELIVERY (sent from the kitchen's phone). */
    private Double riderLatitude;
    private Double riderLongitude;
    private LocalDateTime riderUpdatedAt;

    private boolean reviewed;
}
