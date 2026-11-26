package com.homeplate.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalTime;

/** Single-row table with admin configurable business rules. */
@Entity
@Table(name = "platform_settings")
@Getter @Setter @NoArgsConstructor
public class PlatformSettings {
    @Id
    private Long id = 1L;

    private Integer freeTrialDays = 30;
    @Column(precision = 10, scale = 2) private BigDecimal monthlyPrice = new BigDecimal("499");
    @Column(precision = 10, scale = 2) private BigDecimal annualPrice = new BigDecimal("4999");
    /** Commission percentage taken from each order food total. */
    @Column(precision = 5, scale = 2) private BigDecimal commissionPercent = new BigDecimal("5");
    @Column(precision = 10, scale = 2) private BigDecimal deliveryCharge = new BigDecimal("25");
    @Column(precision = 10, scale = 2) private BigDecimal platformFee = new BigDecimal("5");
    @Column(precision = 10, scale = 2) private BigDecimal freeDeliveryAbove = new BigDecimal("299");
    private Double discoveryRadiusKm = 5.0;
    private LocalTime customLunchCutoff = LocalTime.of(11, 0);
    private LocalTime customDinnerCutoff = LocalTime.of(16, 0);
    /** Days after expiry before an unpaid kitchen is hidden from customers. */
    private Integer gracePeriodDays = 3;
    private boolean requireDailyVideo = true;
    /** Kitchens can take daily-menu orders only after today's menu is verified. null = on (default). */
    private Boolean requireMenuVerification = true;
    @Column(length = 120) private String supportPhone = "+91 90000 00000";
    @Column(length = 120) private String supportEmail = "support@homeplate.in";
}
