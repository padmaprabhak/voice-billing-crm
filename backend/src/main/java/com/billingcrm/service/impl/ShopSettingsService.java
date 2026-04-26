package com.billingcrm.service.impl;

import com.billingcrm.dto.request.ShopSettingsRequest;
import com.billingcrm.dto.response.ShopSettingsResponse;
import com.billingcrm.model.ShopSettings;
import com.billingcrm.repository.ShopSettingsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ShopSettingsService {

    private static final long SETTINGS_ID = 1L;

    private final ShopSettingsRepository repo;

    // ── Get (auto-create if missing) ─────────────────────────────────
    public ShopSettingsResponse get() {
        ShopSettings s = repo.findById(SETTINGS_ID)
                .orElseGet(() -> repo.save(ShopSettings.builder().build()));
        return toResponse(s);
    }

    // ── Update ────────────────────────────────────────────────────────
    public ShopSettingsResponse update(ShopSettingsRequest req) {
        ShopSettings s = repo.findById(SETTINGS_ID)
                .orElseGet(() -> ShopSettings.builder().build());

        if (req.getShopName()          != null) s.setShopName(req.getShopName());
        if (req.getGstNumber()         != null) s.setGstNumber(req.getGstNumber());
        if (req.getAddress()           != null) s.setAddress(req.getAddress());
        if (req.getCity()              != null) s.setCity(req.getCity());
        if (req.getState()             != null) s.setState(req.getState());
        if (req.getPincode()           != null) s.setPincode(req.getPincode());
        if (req.getPhone()             != null) s.setPhone(req.getPhone());
        if (req.getEmail()             != null) s.setEmail(req.getEmail());
        if (req.getWebsite()           != null) s.setWebsite(req.getWebsite());
        if (req.getLogoBase64()        != null) s.setLogoBase64(req.getLogoBase64());
        if (req.getInvoiceFooterNote() != null) s.setInvoiceFooterNote(req.getInvoiceFooterNote());
        if (req.getCurrency()          != null) s.setCurrency(req.getCurrency());
        if (req.getCgstLabel()         != null) s.setCgstLabel(req.getCgstLabel());
        if (req.getSgstLabel()         != null) s.setSgstLabel(req.getSgstLabel());
        if (req.getIgstLabel()         != null) s.setIgstLabel(req.getIgstLabel());
        if (req.getSmtpHost()          != null) s.setSmtpHost(req.getSmtpHost());
        if (req.getSmtpPort()          != null) s.setSmtpPort(req.getSmtpPort());
        if (req.getSmtpUsername()      != null) s.setSmtpUsername(req.getSmtpUsername());
        if (req.getSmtpPassword()      != null) s.setSmtpPassword(req.getSmtpPassword());
        s.setEmailEnabled(req.isEmailEnabled());

        ShopSettings saved = repo.save(s);
        log.info("[ShopSettings] Settings updated");
        return toResponse(saved);
    }

    // ── Get raw entity (used by PDF + Email services) ─────────────────
    public ShopSettings getEntity() {
        return repo.findById(SETTINGS_ID)
                .orElseGet(() -> repo.save(ShopSettings.builder().build()));
    }

    // ── Mapper ────────────────────────────────────────────────────────
    private ShopSettingsResponse toResponse(ShopSettings s) {
        return ShopSettingsResponse.builder()
                .id(s.getId())
                .shopName(s.getShopName())
                .gstNumber(s.getGstNumber())
                .address(s.getAddress())
                .city(s.getCity())
                .state(s.getState())
                .pincode(s.getPincode())
                .phone(s.getPhone())
                .email(s.getEmail())
                .website(s.getWebsite())
                .logoBase64(s.getLogoBase64())
                .invoiceFooterNote(s.getInvoiceFooterNote())
                .currency(s.getCurrency())
                .cgstLabel(s.getCgstLabel())
                .sgstLabel(s.getSgstLabel())
                .igstLabel(s.getIgstLabel())
                .emailEnabled(s.isEmailEnabled())
                .smtpHost(s.getSmtpHost())
                .smtpPort(s.getSmtpPort())
                .smtpUsername(s.getSmtpUsername())
                // smtpPassword excluded intentionally
                .updatedAt(s.getUpdatedAt())
                .build();
    }
}