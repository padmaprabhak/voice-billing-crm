package com.billingcrm.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "shop_settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShopSettings {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    @Builder.Default
    private String shopName = "My Shop";

    private String gstNumber;

    @Column(columnDefinition = "TEXT")
    private String address;

    private String city;
    private String state;
    private String pincode;
    private String phone;
    private String email;
    private String website;

    @Column(columnDefinition = "MEDIUMTEXT")
    private String logoBase64;

    @Column(columnDefinition = "TEXT")
    private String invoiceFooterNote;

    @Column(nullable = false)
    @Builder.Default
    private String currency = "INR";

    @Column(nullable = false)
    @Builder.Default
    private String cgstLabel = "CGST";

    @Column(nullable = false)
    @Builder.Default
    private String sgstLabel = "SGST";

    @Column(nullable = false)
    @Builder.Default
    private String igstLabel = "IGST";

    @Column(nullable = false)
    @Builder.Default
    private boolean emailEnabled = false;

    private String  smtpHost;
    private Integer smtpPort;
    private String  smtpUsername;
    private String  smtpPassword;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}