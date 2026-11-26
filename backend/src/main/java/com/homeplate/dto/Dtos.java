package com.homeplate.dto;

import com.homeplate.entity.Enums;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

/** Request payloads for the REST API. */
public final class Dtos {
    private Dtos() {}

    public record LoginRequest(@NotBlank String username, @NotBlank String password, String portal) {}

    /** channel: "sms" (target = 10-digit mobile) or "email" (target = email address). */
    /** purpose (optional): "register" = must be a new number/email, "reset" = must be a registered number. */
    public record OtpSendRequest(String channel, String target, String phone, String purpose) {}

    public record OtpVerifyRequest(String channel, String target, String phone, @NotBlank String code, String purpose) {}

    /** Customers sign up with just name + mobile (OTP) + email. Username/password are optional (login is by OTP). */
    public record RegisterCustomerRequest(
            @NotBlank @Size(max = 120) String fullName,
            @Size(max = 80) String username,
            @Size(max = 100) String password,
            @NotBlank String phone,
            @NotBlank @Email String email,
            String hometown) {}

    public record OtpLoginRequest(@NotBlank String phone, @NotBlank String code, String portal) {}

    public record RegisterKitchenRequest(
            @NotBlank @Size(max = 120) String fullName,
            @NotBlank @Size(min = 3, max = 80) String username,
            @NotBlank @Size(min = 6, max = 100) String password,
            @NotBlank String phone,
            @NotBlank @Email String email,
            @NotBlank @Size(max = 120) String kitchenName) {}

    public record ResetPasswordRequest(@NotBlank String phone, @NotBlank @Size(min = 6, max = 100) String newPassword) {}

    public record ChangePasswordRequest(@NotBlank String currentPassword, @NotBlank @Size(min = 4) String newPassword) {}

    public record ProfileUpdate(String fullName, String email, String phone, String address, String area,
                                Double latitude, Double longitude, String hometown) {}

    public record CartLine(@NotNull Long menuItemId, @NotNull @Min(1) @Max(50) Integer quantity) {}

    public record PlaceOrderRequest(
            @NotNull Long kitchenId,
            @NotEmpty List<CartLine> items,
            @NotBlank String deliveryAddress,
            String deliveryArea,
            Double latitude,
            Double longitude,
            @NotNull Enums.PaymentMethod paymentMethod,
            String couponCode,
            String notes,
            Enums.MealType mealSlot) {}

    public record QuoteTotalsRequest(@NotNull Long kitchenId, @NotEmpty List<CartLine> items, String couponCode) {}

    public record PayRequest(@NotNull Enums.PaymentMethod paymentMethod) {}

    public record StatusUpdate(@NotNull Enums.OrderStatus status, String reason) {}

    public record CancelRequest(String reason) {}

    public record CustomRequestPayload(
            @NotBlank @Size(max = 120) String dishName,
            @NotBlank String quantity,
            Integer servings,
            String spiceLevel,
            boolean veg,
            String cuisineStyle,
            @NotNull LocalDate requiredDate,
            @NotNull Enums.MealType mealSlot,
            LocalTime preferredTime,
            @Size(max = 1000) String instructions,
            BigDecimal budget,
            @NotBlank String deliveryAddress,
            String deliveryArea,
            Double latitude,
            Double longitude) {}

    public record QuoteRequest(@NotNull @DecimalMin("1") BigDecimal price, @NotNull @Min(5) Integer prepTimeMinutes, String note,
                               @Size(max = 400) String unavailableItems) {}

    public record ReviewRequest(@NotNull @Min(1) @Max(5) Integer rating, @Size(max = 1000) String comment) {}

    public record ReplyRequest(@NotBlank String reply) {}

    public record ComplaintRequest(Long orderId, Long kitchenId, @NotBlank String category,
                                   @NotBlank String subject, @NotBlank String description) {}

    public record ComplaintUpdate(@NotNull Enums.ComplaintStatus status, String resolution, String priority) {}

    public record KitchenDecision(@NotBlank String action, String remarks) {}

    public record DocumentDecision(@NotBlank String document, @NotNull Enums.DocumentStatus status, String remarks) {}

    public record VideoReviewRequest(@NotNull Enums.VideoStatus status, String remarks,
                                     Boolean cleanlinessOk, Boolean storageOk, Boolean hygieneOk) {}

    public record VideoSubmitRequest(@NotBlank String videoUrl, String thumbnailUrl,
                                     @NotNull LocalDate preparationDate, String description, Integer durationSeconds) {}

    public record SubscribeRequest(@NotNull Long planId, Enums.PaymentMethod paymentMethod) {}

    public record UserStatusUpdate(@NotNull Enums.UserStatus status) {}
}
