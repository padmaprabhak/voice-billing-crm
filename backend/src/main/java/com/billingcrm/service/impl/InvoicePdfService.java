package com.billingcrm.service.impl;

import com.billingcrm.model.*;
import com.billingcrm.repository.InvoiceRepository;
import com.billingcrm.exception.ResourceNotFoundException;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.font.PdfFont;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.borders.Border;
import com.itextpdf.layout.borders.SolidBorder;
import com.itextpdf.layout.element.*;
import com.itextpdf.layout.properties.HorizontalAlignment;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.format.DateTimeFormatter;
import java.util.Base64;

/**
 * Generates professional GST-compliant PDF invoices using iText7.
 *
 * pom.xml dependency to add:
 *   <dependency>
 *     <groupId>com.itextpdf</groupId>
 *     <artifactId>itext7-core</artifactId>
 *     <version>8.0.3</version>
 *     <type>pom</type>
 *   </dependency>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class InvoicePdfService {

    private final InvoiceRepository   invoiceRepository;
    private final ShopSettingsService shopSettingsService;

    private static final DeviceRgb DARK      = new DeviceRgb(15, 23, 42);    // slate-950
    private static final DeviceRgb ACCENT    = new DeviceRgb(6,  182, 212);  // cyan-500
    private static final DeviceRgb LIGHT_BG  = new DeviceRgb(241, 245, 249); // slate-100
    private static final DeviceRgb MID_GRAY  = new DeviceRgb(100, 116, 139); // slate-500
    private static final DeviceRgb WHITE     = new DeviceRgb(255, 255, 255);

    private static final DateTimeFormatter DATE_FMT =
        DateTimeFormatter.ofPattern("dd MMM yyyy");

    public byte[] generatePdf(Long invoiceId) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
            .orElseThrow(() -> new ResourceNotFoundException("Invoice", invoiceId));
        ShopSettings shop = shopSettingsService.getEntity();
        return buildPdf(invoice, shop);
    }

    private byte[] buildPdf(Invoice invoice, ShopSettings shop) {
        try (ByteArrayOutputStream bos = new ByteArrayOutputStream()) {
            PdfWriter   writer  = new PdfWriter(bos);
            PdfDocument pdf     = new PdfDocument(writer);
            Document    doc     = new Document(pdf, PageSize.A4);
            doc.setMargins(36, 40, 36, 40);

            // ── Header band ──────────────────────────────────────────
            doc.add(buildHeader(invoice, shop));

            // ── Divider ──────────────────────────────────────────────
            doc.add(new LineSeparator(new com.itextpdf.layout.element.Div()
                .setBackgroundColor(ACCENT).setHeight(2).setMarginTop(8).setMarginBottom(8)));

            // ── Bill To / Invoice Meta ────────────────────────────────
            doc.add(buildBillToSection(invoice, shop));

            doc.add(new Paragraph(" ").setMarginBottom(6));

            // ── Items table ───────────────────────────────────────────
            doc.add(buildItemsTable(invoice, shop));

            doc.add(new Paragraph(" ").setMarginBottom(4));

            // ── GST Summary ───────────────────────────────────────────
            doc.add(buildTotalsSection(invoice, shop));

            // ── Footer note ───────────────────────────────────────────
            if (shop.getInvoiceFooterNote() != null && !shop.getInvoiceFooterNote().isBlank()) {
                doc.add(new Paragraph(shop.getInvoiceFooterNote())
                    .setFontSize(8).setFontColor(MID_GRAY)
                    .setMarginTop(20)
                    .setBorderTop(new SolidBorder(LIGHT_BG, 1))
                    .setPaddingTop(8));
            }

            doc.close();
            log.info("[PdfService] Generated PDF for invoice {}", invoice.getInvoiceNumber());
            return bos.toByteArray();

        } catch (Exception e) {
            log.error("[PdfService] PDF generation failed: {}", e.getMessage(), e);
            throw new RuntimeException("PDF generation failed: " + e.getMessage(), e);
        }
    }

    // ── Header: shop name + invoice number ───────────────────────────
    private Table buildHeader(Invoice invoice, ShopSettings shop) {
        Table table = new Table(UnitValue.createPercentArray(new float[]{55, 45}))
            .setWidth(UnitValue.createPercentValue(100))
            .setBorder(Border.NO_BORDER);

        // Left: shop info
        Cell left = new Cell().setBorder(Border.NO_BORDER).setPadding(0);
        left.add(new Paragraph(shop.getShopName())
            .setFontSize(20).setBold().setFontColor(DARK));
        if (shop.getGstNumber() != null) {
            left.add(new Paragraph("GSTIN: " + shop.getGstNumber())
                .setFontSize(9).setFontColor(MID_GRAY));
        }
        if (shop.getAddress() != null) {
            String addr = shop.getAddress()
                + (shop.getCity()    != null ? ", " + shop.getCity()    : "")
                + (shop.getState()   != null ? ", " + shop.getState()   : "")
                + (shop.getPincode() != null ? " - " + shop.getPincode() : "");
            left.add(new Paragraph(addr).setFontSize(9).setFontColor(MID_GRAY));
        }
        if (shop.getPhone() != null)
            left.add(new Paragraph("Ph: " + shop.getPhone()).setFontSize(9).setFontColor(MID_GRAY));
        if (shop.getEmail() != null)
            left.add(new Paragraph(shop.getEmail()).setFontSize(9).setFontColor(MID_GRAY));

        // Right: invoice badge
        Cell right = new Cell().setBorder(Border.NO_BORDER).setPadding(0)
            .setTextAlignment(TextAlignment.RIGHT);
        right.add(new Paragraph("TAX INVOICE")
            .setFontSize(10).setBold().setFontColor(ACCENT).setTextAlignment(TextAlignment.RIGHT));
        right.add(new Paragraph(invoice.getInvoiceNumber())
            .setFontSize(16).setBold().setFontColor(DARK).setTextAlignment(TextAlignment.RIGHT));
        right.add(new Paragraph("Date: " + invoice.getIssueDate().format(DATE_FMT))
            .setFontSize(9).setFontColor(MID_GRAY).setTextAlignment(TextAlignment.RIGHT));
        if (invoice.getDueDate() != null) {
            right.add(new Paragraph("Due: " + invoice.getDueDate().format(DATE_FMT))
                .setFontSize(9).setFontColor(
                    invoice.getStatus() == Invoice.Status.OVERDUE
                        ? new DeviceRgb(239, 68, 68)
                        : MID_GRAY)
                .setTextAlignment(TextAlignment.RIGHT));
        }
        // Status badge
        String statusText = invoice.getStatus().name();
        DeviceRgb statusColor = switch (invoice.getStatus()) {
            case PAID      -> new DeviceRgb(34,  197, 94);
            case OVERDUE   -> new DeviceRgb(239, 68,  68);
            case PENDING   -> new DeviceRgb(234, 179,  8);
            default        -> MID_GRAY;
        };
        right.add(new Paragraph("● " + statusText)
            .setFontSize(9).setBold().setFontColor(statusColor)
            .setTextAlignment(TextAlignment.RIGHT));

        table.addCell(left);
        table.addCell(right);
        return table;
    }

    // ── Bill To + Invoice Meta ────────────────────────────────────────
    private Table buildBillToSection(Invoice invoice, ShopSettings shop) {
        Table table = new Table(UnitValue.createPercentArray(new float[]{55, 45}))
            .setWidth(UnitValue.createPercentValue(100))
            .setBorder(Border.NO_BORDER)
            .setMarginTop(12);

        Customer c = invoice.getCustomer();

        Cell billTo = new Cell().setBorder(Border.NO_BORDER)
            .setBackgroundColor(LIGHT_BG).setPadding(10).setBorderRadius(
                new com.itextpdf.layout.properties.BorderRadius(4));
        billTo.add(new Paragraph("BILL TO").setFontSize(8).setBold()
            .setFontColor(MID_GRAY).setMarginBottom(4));
        billTo.add(new Paragraph(c.getName()).setFontSize(12).setBold().setFontColor(DARK));
        if (c.getEmail()   != null) billTo.add(new Paragraph(c.getEmail())  .setFontSize(9).setFontColor(MID_GRAY));
        if (c.getPhone()   != null) billTo.add(new Paragraph(c.getPhone())  .setFontSize(9).setFontColor(MID_GRAY));
        if (c.getAddress() != null) billTo.add(new Paragraph(c.getAddress()).setFontSize(9).setFontColor(MID_GRAY));
        if (c.getTaxId()   != null) billTo.add(new Paragraph("GSTIN: " + c.getTaxId()).setFontSize(9).setFontColor(MID_GRAY));

        table.addCell(billTo);
        table.addCell(new Cell().setBorder(Border.NO_BORDER)); // spacer
        return table;
    }

    // ── Items table ───────────────────────────────────────────────────
    private Table buildItemsTable(Invoice invoice, ShopSettings shop) {
        Table table = new Table(UnitValue.createPercentArray(new float[]{6, 34, 10, 12, 12, 12, 14}))
            .setWidth(UnitValue.createPercentValue(100))
            .setMarginTop(8);

        String[] headers = {"#", "Description", "Qty", "Unit Price", "GST %", "GST Amt", "Total"};
        for (String h : headers) {
            table.addHeaderCell(new Cell()
                .setBackgroundColor(DARK)
                .setPadding(8)
                .add(new Paragraph(h)
                    .setFontSize(8).setBold().setFontColor(WHITE)
                    .setTextAlignment(h.equals("#") || h.equals("Description") ? TextAlignment.LEFT : TextAlignment.RIGHT)));
        }

        int idx = 1;
        for (InvoiceItem item : invoice.getItems()) {
            boolean even = idx % 2 == 0;
            DeviceRgb rowBg = even ? LIGHT_BG : WHITE;

            table.addCell(cell(String.valueOf(idx++), rowBg, TextAlignment.LEFT, false));
            table.addCell(cell(item.getDescription(), rowBg, TextAlignment.LEFT, false));
            table.addCell(cell(fmt(item.getQuantity()), rowBg, TextAlignment.RIGHT, false));
            table.addCell(cell("₹" + inr(item.getPrice()), rowBg, TextAlignment.RIGHT, false));
            table.addCell(cell(item.getGstPercentage() + "%", rowBg, TextAlignment.RIGHT, false));
            table.addCell(cell("₹" + inr(item.getGstAmount()), rowBg, TextAlignment.RIGHT, false));
            table.addCell(cell("₹" + inr(item.getTotal()), rowBg, TextAlignment.RIGHT, true));
        }

        return table;
    }

    // ── Totals + GST breakdown ────────────────────────────────────────
    private Table buildTotalsSection(Invoice invoice, ShopSettings shop) {
        Table table = new Table(UnitValue.createPercentArray(new float[]{60, 40}))
            .setWidth(UnitValue.createPercentValue(100))
            .setBorder(Border.NO_BORDER);

        // Left: GST breakdown note
        Cell left = new Cell().setBorder(Border.NO_BORDER).setPadding(0);
        left.add(new Paragraph("GST Breakdown").setFontSize(9).setBold().setFontColor(DARK));

        // Group GST by rate
        invoice.getItems().stream()
            .collect(java.util.stream.Collectors.groupingBy(
                InvoiceItem::getGstPercentage,
                java.util.stream.Collectors.collectingAndThen(
                    java.util.stream.Collectors.toList(),
                    items -> items.stream()
                        .map(InvoiceItem::getGstAmount)
                        .reduce(BigDecimal.ZERO, BigDecimal::add))
            ))
            .forEach((rate, amount) -> {
                BigDecimal half = amount.divide(BigDecimal.valueOf(2), 2, RoundingMode.HALF_UP);
                left.add(new Paragraph(
                    String.format("@ %s%%:  %s = ₹%s | %s = ₹%s",
                        rate,
                        shop.getCgstLabel(), inr(half),
                        shop.getSgstLabel(), inr(half)))
                    .setFontSize(8).setFontColor(MID_GRAY));
            });

        table.addCell(left);

        // Right: amounts
        Cell right = new Cell().setBorder(Border.NO_BORDER)
            .setBackgroundColor(LIGHT_BG).setPadding(12);

        addTotalRow(right, "Subtotal",     "₹" + inr(invoice.getTotalAmount()), false);
        if (invoice.getDiscountAmount().compareTo(BigDecimal.ZERO) > 0) {
            addTotalRow(right, "Discount ("
                + invoice.getDiscountPercent() + "%)",
                "- ₹" + inr(invoice.getDiscountAmount()), false);
        }
        addTotalRow(right, "Total GST",    "₹" + inr(invoice.getTotalGST()), false);

        // Total amount — bold highlighted
        Table totalRow = new Table(new float[]{60, 40})
            .setWidth(UnitValue.createPercentValue(100))
            .setBorder(Border.NO_BORDER)
            .setMarginTop(6);
        totalRow.addCell(new Cell().setBorder(Border.NO_BORDER)
            .add(new Paragraph("TOTAL").setFontSize(12).setBold().setFontColor(DARK)));
        totalRow.addCell(new Cell().setBorder(Border.NO_BORDER)
            .add(new Paragraph("₹" + inr(invoice.getFinalAmount()))
                .setFontSize(14).setBold().setFontColor(ACCENT)
                .setTextAlignment(TextAlignment.RIGHT)));
        right.add(totalRow);

        table.addCell(right);
        return table;
    }

    // ── Helpers ───────────────────────────────────────────────────────

    private Cell cell(String text, DeviceRgb bg, TextAlignment align, boolean bold) {
        Paragraph p = new Paragraph(text).setFontSize(9).setTextAlignment(align);
        if (bold) p.setBold();
        return new Cell().setBackgroundColor(bg).setPadding(7).add(p);
    }

    private void addTotalRow(Cell parent, String label, String value, boolean bold) {
        Table row = new Table(new float[]{60, 40})
            .setWidth(UnitValue.createPercentValue(100))
            .setBorder(Border.NO_BORDER);
        Paragraph lp = new Paragraph(label).setFontSize(9).setFontColor(MID_GRAY);
        Paragraph vp = new Paragraph(value).setFontSize(9)
            .setFontColor(DARK).setTextAlignment(TextAlignment.RIGHT);
        if (bold) { lp.setBold(); vp.setBold(); }
        row.addCell(new Cell().setBorder(Border.NO_BORDER).setPadding(2).add(lp));
        row.addCell(new Cell().setBorder(Border.NO_BORDER).setPadding(2).add(vp));
        parent.add(row);
    }

    private String inr(BigDecimal val) {
        if (val == null) return "0.00";
        return String.format("%,.2f", val.setScale(2, RoundingMode.HALF_UP));
    }

    private String fmt(BigDecimal val) {
        if (val == null) return "0";
        return val.stripTrailingZeros().toPlainString();
    }
}