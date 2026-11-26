package com.homeplate.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "kitchens")
@Getter @Setter @NoArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Kitchen {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "owner_id", unique = true)
    private User owner;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(length = 1500)
    private String description;

    @Column(length = 500)
    private String coverImage;

    /** Comma separated gallery image URLs. */
    @Column(length = 3000)
    private String galleryImages;

    /** Comma separated cuisines, e.g. "Kongu,Chettinad". */
    @Column(length = 300)
    private String cuisines;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private Enums.FoodType foodType = Enums.FoodType.BOTH;

    // ---- Address & location ----
    @Column(length = 60) private String state = "Tamil Nadu";
    @Column(length = 60) private String district = "Coimbatore";
    @Column(length = 60) private String city = "Coimbatore";
    @Column(length = 80) private String area;
    @Column(length = 400) private String address;
    @Column(length = 10) private String pincode;
    private Double latitude;
    private Double longitude;
    private Double deliveryRadiusKm = 5.0;

    // ---- Operations ----
    private LocalTime openTime = LocalTime.of(7, 0);
    private LocalTime closeTime = LocalTime.of(21, 0);
    /** Comma separated, e.g. "MON,TUE,WED,THU,FRI,SAT". */
    @Column(length = 60)
    private String workingDays = "MON,TUE,WED,THU,FRI,SAT";
    private boolean breakfastAvailable = true;
    private boolean lunchAvailable = true;
    private boolean dinnerAvailable = true;
    private Integer maxDailyOrders = 40;
    private boolean selfDelivery = true;
    private boolean acceptingOrders = true;
    private Integer avgPrepMinutes = 35;

    @Column(length = 200)
    private String todaySpecial;

    // ---- Compliance ----
    @Column(length = 40) private String idProofType;
    @Column(length = 40) private String idProofNumber;
    @Column(length = 500) private String idProofUrl;
    @Column(length = 500) private String idProofBackUrl;

    // Daily menu verification (see DailyMenuService)
    private java.time.LocalDate menuPublishedDate;
    private java.time.LocalDateTime menuPublishedAt;
    private java.time.LocalDate menuVerifiedDate;
    @Column(length = 300) private String menuRemarks;
    @Enumerated(EnumType.STRING) @Column(length = 20)
    private Enums.DocumentStatus idProofStatus = Enums.DocumentStatus.PENDING;

    @Column(length = 30) private String fssaiNumber;
    @Column(length = 40) private String fssaiType;
    @Column(length = 500) private String fssaiCertificateUrl;
    @Enumerated(EnumType.STRING) @Column(length = 20)
    private Enums.DocumentStatus fssaiStatus = Enums.DocumentStatus.PENDING;

    private boolean phoneVerified;

    // ---- Status & stats ----
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Enums.KitchenStatus status = Enums.KitchenStatus.PENDING;

    @Column(length = 1000)
    private String adminRemarks;

    private Double rating = 0.0;
    private Integer ratingCount = 0;
    private Integer onboardingStep = 1;

    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime submittedAt;
    private LocalDateTime approvedAt;
    private LocalDateTime lastInspectionAt;
}
