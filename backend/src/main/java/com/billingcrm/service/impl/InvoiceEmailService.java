package com.billingcrm.service.impl;

import com.billingcrm.exception.BadRequestException;
import com.billingcrm.model.Invoice;
import com.billingcrm.model.ShopSettings;
import com.billingcrm.repository.InvoiceRepository;
import com.billingcrm.exception.ResourceNotFoundException;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.math.RoundingMode;
import java.util.Properties;

/**
 * Sends invoice emails with PDF attachment.
 * Uses dynamic SMTP settings from ShopSettings (not application.properties).
 * This allows the shop owner to configure their own Gmail/SMTP from the UI.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class InvoiceEmailService {

    private final InvoiceRepository   invoiceRepository;
    private final InvoicePdfService   pdfService;
    private final ShopSettingsService shopSettingsService;

    /**
     * Send invoice PDF to customer email.
     * @param invoiceId  the invoice to send
     * @param toEmail    override recipient (null = use customer email)
     */
    public void sendInvoiceEmail(Long invoiceId, String toEmail) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
            .orElseThrow(() -> new ResourceNotFoundException("Invoice", invoiceId));

        ShopSettings shop = shopSettingsService.getEntity();

        if (!shop.isEmailEnabled()) {
            throw new BadRequestException(
                "Email is not enabled. Configure SMTP settings in Shop Settings.");
        }

        String recipient = toEmail != null ? toEmail : invoice.getCustomer().getEmail();
        if (recipient == null || recipient.isBlank()) {
            throw new BadRequestException(
                "No email address available for this customer. "
                + "Please provide a recipient email address.");
        }

        // Build dynamic mail sender from shop settings
        JavaMailSenderImpl mailSender = buildMailSender(shop);

        // Generate PDF
        byte[] pdf = pdfService.generatePdf(invoiceId);

        // Build email
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(shop.getSmtpUsername(), shop.getShopName());
            helper.setTo(recipient);
            helper.setSubject(
                "Invoice " + invoice.getInvoiceNumber() + " from " + shop.getShopName());
            helper.setText(buildEmailBody(invoice, shop), true); // HTML
            helper.addAttachment(
                invoice.getInvoiceNumber() + ".pdf",
                new org.springframework.core.io.ByteArrayResource(pdf),
                "application/pdf");

            mailSender.send(message);
            log.info("[EmailService] Invoice {} sent to {}", invoice.getInvoiceNumber(), recipient);

        } catch (MessagingException | java.io.UnsupportedEncodingException e) {
            log.error("[EmailService] Failed to send invoice {}: {}", invoiceId, e.getMessage());
            throw new RuntimeException("Email send failed: " + e.getMessage(), e);
        }
    }

    private JavaMailSenderImpl buildMailSender(ShopSettings shop) {
        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost(shop.getSmtpHost() != null ? shop.getSmtpHost() : "smtp.gmail.com");
        sender.setPort(shop.getSmtpPort() != null ? shop.getSmtpPort() : 587);
        sender.setUsername(shop.getSmtpUsername());
        sender.setPassword(shop.getSmtpPassword());

        Properties props = sender.getJavaMailProperties();
        props.put("mail.transport.protocol",   "smtp");
        props.put("mail.smtp.auth",            "true");
        props.put("mail.smtp.starttls.enable", "true");
        props.put("mail.smtp.starttls.required","true");
        props.put("mail.debug",                "false");
        return sender;
    }

    private String buildEmailBody(Invoice invoice, ShopSettings shop) {
        String amount = "₹" + String.format("%,.2f",
            invoice.getFinalAmount().setScale(2, RoundingMode.HALF_UP));

        return """
            <html><body style="font-family:sans-serif;color:#1e293b;max-width:600px;margin:0 auto;">
              <div style="background:#0f172a;padding:24px 32px;border-radius:8px 8px 0 0;">
                <h1 style="color:#22d3ee;margin:0;font-size:22px;">%s</h1>
                <p style="color:#94a3b8;margin:4px 0 0;">Invoice %s</p>
              </div>
              <div style="border:1px solid #e2e8f0;border-top:none;padding:28px 32px;border-radius:0 0 8px 8px;">
                <p>Dear <strong>%s</strong>,</p>
                <p>Please find attached your invoice <strong>%s</strong> for <strong>%s</strong>.</p>
                <table style="width:100%%;border-collapse:collapse;margin:20px 0;">
                  <tr style="background:#f1f5f9;">
                    <td style="padding:10px 14px;font-size:12px;color:#64748b;">INVOICE NUMBER</td>
                    <td style="padding:10px 14px;font-size:12px;color:#64748b;">AMOUNT DUE</td>
                    <td style="padding:10px 14px;font-size:12px;color:#64748b;">STATUS</td>
                  </tr>
                  <tr>
                    <td style="padding:12px 14px;font-weight:600;">%s</td>
                    <td style="padding:12px 14px;font-weight:700;color:#0891b2;font-size:18px;">%s</td>
                    <td style="padding:12px 14px;">
                      <span style="background:#fef9c3;color:#854d0e;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600;">
                        %s
                      </span>
                    </td>
                  </tr>
                </table>
                <p style="color:#64748b;font-size:13px;">
                  %s
                </p>
                <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;"/>
                <p style="color:#94a3b8;font-size:12px;">%s</p>
                <p style="color:#94a3b8;font-size:12px;margin:4px 0;">%s</p>
              </div>
            </html>
            """.formatted(
                shop.getShopName(),
                invoice.getInvoiceNumber(),
                invoice.getCustomer().getName(),
                invoice.getInvoiceNumber(),
                amount,
                invoice.getInvoiceNumber(),
                amount,
                invoice.getStatus().name(),
                shop.getInvoiceFooterNote() != null
                    ? shop.getInvoiceFooterNote()
                    : "Thank you for your business.",
                shop.getPhone()   != null ? "📞 " + shop.getPhone() : "",
                shop.getEmail()   != null ? "✉ "  + shop.getEmail() : ""
            );
    }
}