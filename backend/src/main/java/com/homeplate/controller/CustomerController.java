package com.homeplate.controller;

import com.homeplate.config.ApiException;
import com.homeplate.dto.Dtos;
import com.homeplate.entity.*;
import com.homeplate.repository.*;
import com.homeplate.security.CurrentUser;
import com.homeplate.service.CustomRequestService;
import com.homeplate.service.OrderService;
import jakarta.validation.Valid;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/customer")
public class CustomerController {
    private final CurrentUser current;
    private final UserRepository users;
    private final FoodOrderRepository orders;
    private final ComplaintRepository complaints;
    private final KitchenRepository kitchens;
    private final OrderService orderService;
    private final CustomRequestService requestService;

    public CustomerController(CurrentUser current, UserRepository users, FoodOrderRepository orders,
                              ComplaintRepository complaints, KitchenRepository kitchens,
                              OrderService orderService, CustomRequestService requestService) {
        this.current = current;
        this.users = users;
        this.orders = orders;
        this.complaints = complaints;
        this.kitchens = kitchens;
        this.orderService = orderService;
        this.requestService = requestService;
    }

    // ---------------- profile
    @GetMapping("/profile")
    public User profile() { return current.user(); }

    @PutMapping("/profile")
    @Transactional
    public User updateProfile(@RequestBody Dtos.ProfileUpdate p) {
        User u = current.user();
        if (p.fullName() != null && !p.fullName().isBlank()) u.setFullName(p.fullName());
        if (p.email() != null) u.setEmail(p.email());
        // Mobile number is verified by OTP at sign-up and can't be changed here.
        if (p.address() != null) u.setAddress(p.address());
        if (p.area() != null) u.setArea(p.area());
        if (p.latitude() != null) u.setLatitude(p.latitude());
        if (p.longitude() != null) u.setLongitude(p.longitude());
        if (p.hometown() != null) u.setHometown(p.hometown());
        return users.save(u);
    }

    // ---------------- orders
    @PostMapping("/cart/totals")
    public OrderService.Totals totals(@Valid @RequestBody Dtos.QuoteTotalsRequest req) {
        return orderService.previewTotals(req);
    }

    @PostMapping("/orders")
    public FoodOrder place(@Valid @RequestBody Dtos.PlaceOrderRequest req) {
        return orderService.place(current.user(), req);
    }

    @GetMapping("/orders")
    public List<FoodOrder> myOrders() {
        return orders.findByCustomerIdOrderByCreatedAtDesc(current.principal().userId());
    }

    @GetMapping("/orders/{id}")
    public FoodOrder order(@PathVariable Long id) {
        return orderService.customerOrder(current.user(), id);
    }

    @PostMapping("/orders/{id}/pay")
    public FoodOrder pay(@PathVariable Long id, @Valid @RequestBody Dtos.PayRequest req) {
        return orderService.pay(current.user(), id, req.paymentMethod());
    }

    @PostMapping("/orders/{id}/cancel")
    public FoodOrder cancel(@PathVariable Long id, @RequestBody(required = false) Dtos.CancelRequest req) {
        return orderService.customerCancel(current.user(), id, req == null ? null : req.reason());
    }

    @PostMapping("/orders/{id}/review")
    public Review review(@PathVariable Long id, @Valid @RequestBody Dtos.ReviewRequest req) {
        return orderService.review(current.user(), id, req);
    }

    // ---------------- custom requests
    @PostMapping("/requests")
    public CustomRequest createRequest(@Valid @RequestBody Dtos.CustomRequestPayload p) {
        return requestService.create(current.user(), p);
    }

    @GetMapping("/requests")
    public List<Map<String, Object>> myRequests() {
        return requestService.customerRequests(current.user());
    }

    @GetMapping("/requests/{id}")
    public Map<String, Object> request(@PathVariable Long id) {
        return requestService.customerView(current.user(), id);
    }

    @PostMapping("/requests/{id}/select/{quotationId}")
    public FoodOrder select(@PathVariable Long id, @PathVariable Long quotationId) {
        return requestService.selectOffer(current.user(), id, quotationId);
    }

    @PostMapping("/requests/{id}/cancel")
    public CustomRequest cancelRequest(@PathVariable Long id) {
        return requestService.cancel(current.user(), id);
    }

    // ---------------- complaints
    @PostMapping("/complaints")
    @Transactional
    public Complaint complain(@Valid @RequestBody Dtos.ComplaintRequest req) {
        Complaint c = new Complaint();
        c.setCustomer(current.user());
        c.setCategory(req.category());
        c.setSubject(req.subject());
        c.setDescription(req.description());
        if (req.orderId() != null) {
            FoodOrder o = orderService.customerOrder(current.user(), req.orderId());
            c.setOrderId(o.getId());
            c.setKitchen(o.getKitchen());
        } else if (req.kitchenId() != null) {
            c.setKitchen(kitchens.findById(req.kitchenId()).orElseThrow(() -> ApiException.notFound("Kitchen not found")));
        }
        if ("Hygiene".equalsIgnoreCase(req.category())) c.setPriority("HIGH");
        return complaints.save(c);
    }

    @GetMapping("/complaints")
    public List<Complaint> myComplaints() {
        return complaints.findByCustomerIdOrderByCreatedAtDesc(current.principal().userId());
    }
}
