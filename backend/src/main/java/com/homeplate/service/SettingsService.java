package com.homeplate.service;

import com.homeplate.entity.PlatformSettings;
import com.homeplate.repository.PlatformSettingsRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SettingsService {
    private final PlatformSettingsRepository repo;

    public SettingsService(PlatformSettingsRepository repo) {
        this.repo = repo;
    }

    @Transactional
    public PlatformSettings get() {
        return repo.findById(1L).orElseGet(() -> repo.save(new PlatformSettings()));
    }

    @Transactional
    public PlatformSettings update(PlatformSettings in) {
        PlatformSettings s = get();
        if (in.getFreeTrialDays() != null) s.setFreeTrialDays(in.getFreeTrialDays());
        if (in.getMonthlyPrice() != null) s.setMonthlyPrice(in.getMonthlyPrice());
        if (in.getAnnualPrice() != null) s.setAnnualPrice(in.getAnnualPrice());
        if (in.getCommissionPercent() != null) s.setCommissionPercent(in.getCommissionPercent());
        if (in.getDeliveryCharge() != null) s.setDeliveryCharge(in.getDeliveryCharge());
        if (in.getPlatformFee() != null) s.setPlatformFee(in.getPlatformFee());
        if (in.getFreeDeliveryAbove() != null) s.setFreeDeliveryAbove(in.getFreeDeliveryAbove());
        if (in.getDiscoveryRadiusKm() != null) s.setDiscoveryRadiusKm(in.getDiscoveryRadiusKm());
        if (in.getCustomLunchCutoff() != null) s.setCustomLunchCutoff(in.getCustomLunchCutoff());
        if (in.getCustomDinnerCutoff() != null) s.setCustomDinnerCutoff(in.getCustomDinnerCutoff());
        if (in.getGracePeriodDays() != null) s.setGracePeriodDays(in.getGracePeriodDays());
        s.setRequireDailyVideo(in.isRequireDailyVideo());
        if (in.getRequireMenuVerification() != null) s.setRequireMenuVerification(in.getRequireMenuVerification());
        if (in.getSupportPhone() != null) s.setSupportPhone(in.getSupportPhone());
        if (in.getSupportEmail() != null) s.setSupportEmail(in.getSupportEmail());
        return repo.save(s);
    }
}
