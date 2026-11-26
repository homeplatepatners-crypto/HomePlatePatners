package com.homeplate.controller;

import com.homeplate.config.ApiException;
import com.homeplate.dto.Dtos;
import com.homeplate.entity.*;
import com.homeplate.repository.KitchenRepository;
import com.homeplate.repository.UserRepository;
import com.homeplate.security.CurrentUser;
import com.homeplate.security.JwtService;
import com.homeplate.service.NotificationService;
import com.homeplate.service.OtpService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final UserRepository users;
    private final KitchenRepository kitchens;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final OtpService otp;
    private final CurrentUser current;
    private final NotificationService notify;

    public AuthController(UserRepository users, KitchenRepository kitchens, PasswordEncoder encoder, JwtService jwt,
                          OtpService otp, CurrentUser current, NotificationService notify) {
        this.users = users;
        this.kitchens = kitchens;
        this.encoder = encoder;
        this.jwt = jwt;
        this.otp = otp;
        this.current = current;
        this.notify = notify;
    }

    @PostMapping("/login")
    public Map<String, Object> login(@Valid @RequestBody Dtos.LoginRequest req) {
        User u = users.findByUsername(req.username().trim())
                .filter(x -> encoder.matches(req.password(), x.getPassword()))
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Invalid username or password"));
        if (req.portal() != null && !req.portal().isBlank()) {
            Role expected = switch (req.portal()) {
                case "admin" -> Role.ADMIN;
                case "kitchen" -> Role.KITCHEN_OWNER;
                default -> Role.CUSTOMER;
            };
            if (u.getRole() != expected) {
                String where = switch (u.getRole()) {
                    case ADMIN -> "the Admin portal";
                    case KITCHEN_OWNER -> "the Kitchen Partner portal";
                    case CUSTOMER -> "the Customer login";
                };
                throw ApiException.forbidden("This account belongs to " + where + ". Please sign in there.");
            }
        }
        if (u.getStatus() == Enums.UserStatus.SUSPENDED) throw ApiException.forbidden("Your account is suspended. Contact support.");
        return session(u);
    }

    /** Tells the UI which OTP channels are live. */
    @GetMapping("/otp/config")
    public Map<String, Object> otpConfig() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("sms", otp.smsLive());
        m.put("email", otp.emailLive());
        m.put("emailRequired", otp.emailRequired());
        m.put("devMode", otp.devMode());
        if (otp.testNumbersHint() != null) {
            m.put("testNumbers", otp.testNumbersHint());
            m.put("testCode", otp.testCode());
        }
        return m;
    }

    @PostMapping("/otp/send")
    public Map<String, Object> sendOtp(@RequestBody Dtos.OtpSendRequest req) {
        OtpService.Channel ch = OtpService.channel(req.channel());
        String target = target(req.target(), req.phone());
        checkPurpose(req.purpose(), ch, target);
        String code = otp.send(ch, target);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("sent", true);
        m.put("message", ch == OtpService.Channel.SMS ? "OTP sent to +91 " + target : "OTP sent to " + target);
        if (code != null) m.put("devOtp", code); // only in dev mode when the channel has no provider
        return m;
    }

    @PostMapping("/otp/verify")
    public Map<String, Object> verifyOtp(@Valid @RequestBody Dtos.OtpVerifyRequest req) {
        OtpService.Channel ch = OtpService.channel(req.channel());
        String target = target(req.target(), req.phone());
        checkPurpose(req.purpose(), ch, target);
        otp.verify(ch, target, req.code());
        return Map.of("verified", true);
    }

    /**
     * Checked before any OTP is sent, so the user can correct the number/email straight away.
     * purpose "register": the mobile/email must be new. purpose "reset": the mobile must belong to an account.
     */
    private void checkPurpose(String purpose, OtpService.Channel ch, String target) {
        if (purpose == null || purpose.isBlank()) return;
        boolean sms = ch == OtpService.Channel.SMS;
        String value = sms ? digits(target) : target.trim().toLowerCase();
        boolean exists = sms ? users.existsByPhone(value) : users.existsByEmailIgnoreCase(value);
        if ("register".equalsIgnoreCase(purpose) && exists) {
            throw ApiException.badRequest(sms
                    ? "This mobile number is already registered. Please use a different number, or login / reset your password."
                    : "This email is already registered. Please use a different email.");
        }
        if (("reset".equalsIgnoreCase(purpose) || "login".equalsIgnoreCase(purpose)) && sms && !exists) {
            throw ApiException.badRequest("No account is registered with this mobile number. Please check the number.");
        }
    }

    /** Login with mobile OTP (customers; kitchen partners can use it too). Send the OTP first with purpose "login". */
    @PostMapping("/login/otp")
    public Map<String, Object> loginWithOtp(@Valid @RequestBody Dtos.OtpLoginRequest req) {
        String phone = digits(req.phone());
        User u = users.findFirstByPhone(phone)
                .orElseThrow(() -> ApiException.badRequest("No account is registered with this mobile number. Please sign up."));
        Role expected = "kitchen".equals(req.portal()) ? Role.KITCHEN_OWNER : Role.CUSTOMER;
        if (u.getRole() != expected) {
            throw ApiException.forbidden(u.getRole() == Role.KITCHEN_OWNER
                    ? "This number belongs to a kitchen partner account. Please use the Kitchen Partner login."
                    : u.getRole() == Role.CUSTOMER ? "This number belongs to a customer account. Please use the Customer login."
                    : "Please use the Admin login.");
        }
        otp.verify(OtpService.Channel.SMS, phone, req.code());
        otp.consume(OtpService.Channel.SMS, phone);
        if (u.getStatus() == Enums.UserStatus.SUSPENDED) throw ApiException.forbidden("Your account is suspended. Contact support.");
        return session(u);
    }

    /** Forgot password: verify the registered mobile with OTP, then set a new password. */
    @PostMapping("/password/reset")
    @Transactional
    public Map<String, Object> resetPassword(@Valid @RequestBody Dtos.ResetPasswordRequest req) {
        String phone = digits(req.phone());
        if (!otp.isVerified(OtpService.Channel.SMS, phone)) throw ApiException.badRequest("Please verify your mobile number with OTP first");
        User u = users.findFirstByPhone(phone).orElseThrow(() -> ApiException.badRequest("No account is registered with this mobile number"));
        if (u.getRole() == Role.ADMIN) throw ApiException.forbidden("Admin password can't be reset here");
        u.setPassword(encoder.encode(req.newPassword()));
        users.save(u);
        otp.consume(OtpService.Channel.SMS, phone);
        return Map.of("reset", true, "username", u.getUsername());
    }

    @PostMapping("/register/customer")
    @Transactional
    public Map<String, Object> registerCustomer(@Valid @RequestBody Dtos.RegisterCustomerRequest req) {
        String phone = digits(req.phone());
        String email = req.email().trim().toLowerCase();
        // Username defaults to the mobile number; password is optional because customers log in with OTP.
        String username = req.username() == null || req.username().isBlank() ? phone : req.username().trim();
        String password = req.password() == null || req.password().isBlank()
                ? java.util.UUID.randomUUID().toString() : req.password();
        if (req.password() != null && !req.password().isBlank() && req.password().length() < 6)
            throw ApiException.badRequest("Password must be at least 6 characters");
        checkNewAccount(username, phone, email);
        User u = new User();
        u.setUsername(username);
        u.setPassword(encoder.encode(password));
        u.setFullName(req.fullName().trim());
        u.setPhone(phone);
        u.setEmail(email);
        u.setHometown(req.hometown());
        u.setRole(Role.CUSTOMER);
        u.setPhoneVerified(true);
        u.setEmailVerified(otp.isVerified(OtpService.Channel.EMAIL, email));
        users.save(u);
        consume(phone, email);
        notify.sendEmail(u.getEmail(), "Welcome to HomePlate", "Hi " + u.getFullName() + ", a taste of home is now around the corner.");
        return session(u);
    }

    @PostMapping("/register/kitchen")
    @Transactional
    public Map<String, Object> registerKitchen(@Valid @RequestBody Dtos.RegisterKitchenRequest req) {
        String phone = digits(req.phone());
        String email = req.email().trim().toLowerCase();
        checkNewAccount(req.username(), phone, email);
        User u = new User();
        u.setUsername(req.username().trim());
        u.setPassword(encoder.encode(req.password()));
        u.setFullName(req.fullName().trim());
        u.setPhone(phone);
        u.setEmail(email);
        u.setRole(Role.KITCHEN_OWNER);
        u.setPhoneVerified(true);
        u.setEmailVerified(otp.isVerified(OtpService.Channel.EMAIL, email));
        users.save(u);
        Kitchen k = new Kitchen();
        k.setOwner(u);
        k.setName(req.kitchenName().trim());
        k.setStatus(Enums.KitchenStatus.PENDING);
        k.setPhoneVerified(true);
        k.setOnboardingStep(2);
        kitchens.save(k);
        consume(phone, email);
        notify.sendEmail(u.getEmail(), "Welcome to HomePlate Kitchen Partners",
                "Hi " + u.getFullName() + ", your kitchen \"" + k.getName() + "\" is registered. Complete the onboarding steps to submit it for verification.");
        return session(u);
    }

    private void checkNewAccount(String username, String phone, String email) {
        if (!otp.isVerified(OtpService.Channel.SMS, phone)) throw ApiException.badRequest("Please verify your mobile number with OTP first");
        if (otp.emailRequired() && !otp.isVerified(OtpService.Channel.EMAIL, email))
            throw ApiException.badRequest("Please verify your email address with OTP first");
        if (users.existsByUsername(username.trim())) throw ApiException.badRequest("Username already taken");
        if (users.existsByPhone(phone)) throw ApiException.badRequest("An account already exists with this mobile number. Please sign in or reset your password.");
        if (users.existsByEmailIgnoreCase(email)) throw ApiException.badRequest("An account already exists with this email address");
    }

    private void consume(String phone, String email) {
        otp.consume(OtpService.Channel.SMS, phone);
        otp.consume(OtpService.Channel.EMAIL, email);
    }

    private static String target(String target, String phone) {
        String t = target != null && !target.isBlank() ? target : phone;
        if (t == null || t.isBlank()) throw ApiException.badRequest("Enter your mobile number or email");
        return t.trim();
    }

    private static String digits(String phone) {
        String d = phone == null ? "" : phone.replaceAll("[^0-9]", "");
        return d.length() > 10 ? d.substring(d.length() - 10) : d;
    }

    @GetMapping("/me")
    public Map<String, Object> me() {
        return session(current.user());
    }

    @PostMapping("/change-password")
    @Transactional
    public Map<String, Object> changePassword(@Valid @RequestBody Dtos.ChangePasswordRequest req) {
        User u = current.user();
        if (!encoder.matches(req.currentPassword(), u.getPassword())) throw ApiException.badRequest("Current password is incorrect");
        u.setPassword(encoder.encode(req.newPassword()));
        users.save(u);
        return Map.of("changed", true);
    }

    private Map<String, Object> session(User u) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("token", jwt.generate(u));
        m.put("user", u);
        if (u.getRole() == Role.KITCHEN_OWNER) m.put("kitchen", kitchens.findByOwnerId(u.getId()).orElse(null));
        return m;
    }
}
