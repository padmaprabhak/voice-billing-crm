package com.billingcrm.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShopSettingsResponse {

    private Long          id;
    private String        shopName;
    private String        gstNumber;
    private String        address;
    private String        city;
    private String        state;
    private String        pincode;
    private String        phone;
    private String        email;
    private String        website;
    private String        logoBase64;
    private String        invoiceFooterNote;
    private String        currency;
    private String        cgstLabel;
    private String        sgstLabel;
    private String        igstLabel;
    private boolean       emailEnabled;
    private String        smtpHost;
    private Integer       smtpPort;
    private String        smtpUsername;
    // smtpPassword intentionally excluded from response
    private LocalDateTime updatedAt;
}