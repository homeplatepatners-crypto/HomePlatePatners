package com.homeplate.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "quotations", uniqueConstraints = @UniqueConstraint(columnNames = {"request_id", "kitchen_id"}))
@Getter @Setter @NoArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Quotation {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnoreProperties({"customer"})
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "request_id")
    private CustomRequest request;

    @JsonIgnoreProperties({"description", "galleryImages"})
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "kitchen_id")
    private Kitchen kitchen;

    @Column(precision = 10, scale = 2) private BigDecimal price;
    private Integer prepTimeMinutes;
    @Column(length = 600) private String note;
    /** Items from the request the kitchen can't provide, or substitutions. */
    @Column(length = 400) private String unavailableItems;
    private Double distanceKm;

    @Enumerated(EnumType.STRING) @Column(length = 20)
    private Enums.QuotationStatus status = Enums.QuotationStatus.PENDING;

    private LocalDateTime createdAt = LocalDateTime.now();
}
