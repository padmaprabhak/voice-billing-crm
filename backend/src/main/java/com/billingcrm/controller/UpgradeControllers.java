package com.billingcrm.controller;

import com.billingcrm.dto.request.ShopSettingsRequest;
import com.billingcrm.dto.response.AnalyticsResponse;
import com.billingcrm.dto.response.ApiResponse;
import com.billingcrm.dto.response.ShopSettingsResponse;
import com.billingcrm.service.impl.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

// ════════════════════════════════════════════════════════════════════
// Shop Settings Controller  — /settings
// ════════════════════════════════════════════════════════════════════
@RestController
@RequestMapping("/settings")
@RequiredArgsConstructor
@Slf4j
class ShopSettingsController {

    private final ShopSettingsService shopSettingsService;

    @GetMapping
    public ResponseEntity<ApiResponse<ShopSettingsResponse>> get() {
        return ResponseEntity.ok(ApiResponse.success(shopSettingsService.get()));
    }

    @PutMapping
    public ResponseEntity<ApiResponse<ShopSettingsResponse>> update(
            @Valid @RequestBody ShopSettingsRequest request) {
        return ResponseEntity.ok(
            ApiResponse.success("Settings updated", shopSettingsService.update(request)));
    }
}


// ════════════════════════════════════════════════════════════════════
// PDF Controller  — /invoices/{id}/pdf
// ════════════════════════════════════════════════════════════════════
@RestController
@RequestMapping("/invoices")
@RequiredArgsConstructor
@Slf4j
class InvoicePdfController {

    private final InvoicePdfService pdfService;

    @GetMapping("/{id}/pdf")
    public ResponseEntity<byte[]> downloadPdf(@PathVariable Long id) {
        byte[] pdf = pdfService.generatePdf(id);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("attachment", "invoice-" + id + ".pdf");
        headers.setContentLength(pdf.length);
        return new ResponseEntity<>(pdf, headers, HttpStatus.OK);
    }
}


// ════════════════════════════════════════════════════════════════════
// Email Controller  — /invoices/{id}/email
// ════════════════════════════════════════════════════════════════════
@RestController
@RequestMapping("/invoices")
@RequiredArgsConstructor
@Slf4j
class InvoiceEmailController {

    private final InvoiceEmailService emailService;

    /**
     * POST /invoices/{id}/email
     * Body: { "toEmail": "optional@override.com" }  (optional)
     */
    @PostMapping("/{id}/email")
    public ResponseEntity<ApiResponse<Void>> sendEmail(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body) {
        String toEmail = body != null ? body.get("toEmail") : null;
        emailService.sendInvoiceEmail(id, toEmail);
        return ResponseEntity.ok(ApiResponse.success("Invoice emailed successfully", null));
    }
}


// ════════════════════════════════════════════════════════════════════
// Analytics Controller  — /analytics
// ════════════════════════════════════════════════════════════════════
@RestController
@RequestMapping("/analytics")
@RequiredArgsConstructor
@Slf4j
class AnalyticsController {

    private final AnalyticsService analyticsService;

    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<AnalyticsResponse>> getDashboard(
            @RequestParam(defaultValue = "6") int months) {
        return ResponseEntity.ok(ApiResponse.success(
            analyticsService.getDashboardAnalytics(months)));
    }
}