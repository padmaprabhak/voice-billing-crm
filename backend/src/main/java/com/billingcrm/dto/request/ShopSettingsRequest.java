package com.billingcrm.dto.request;

import lombok.Data;

@Data
public class ShopSettingsRequest {

    private String  shopName;
    private String  gstNumber;
    private String  address;
    private String  city;
    private String  state;
    private String  pincode;
    private String  phone;
    private String  email;
    private String  website;
    private String  logoBase64;
    private String  invoiceFooterNote;
    private String  currency;
    private String  cgstLabel;
    private String  sgstLabel;
    private String  igstLabel;
    private boolean emailEnabled;
    private String  smtpHost;
    private Integer smtpPort;
    private String  smtpUsername;
    private String  smtpPassword;
}