package com.billingcrm.service.impl;

import com.billingcrm.dto.response.AnalyticsResponse;
import com.billingcrm.repository.InvoiceRepository;
import com.billingcrm.repository.CustomerRepository;
import com.billingcrm.repository.ProductRepository;
import com.billingcrm.repository.VoiceSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class AnalyticsService {

    private final InvoiceRepository      invoiceRepository;
    private final CustomerRepository     customerRepository;
    private final ProductRepository      productRepository;
    private final VoiceSessionRepository voiceSessionRepository;

    /** Full analytics dashboard data */
    public AnalyticsResponse getDashboardAnalytics(int months) {
        LocalDate from = LocalDate.now().minusMonths(months).withDayOfMonth(1);

        return AnalyticsResponse.builder()
            .summary(buildSummary())
            .monthlyRevenue(getMonthlyRevenue(months))
            .topProducts(getTopProducts(10))
            .topCustomers(getTopCustomers(10))
            .invoicesByStatus(getInvoicesByStatus())
            .dailyRevenue(getDailyRevenue(30))
            .build();
    }

    private AnalyticsResponse.Summary buildSummary() {
        LocalDate today = LocalDate.now();
        LocalDate monthStart = today.withDayOfMonth(1);

        return AnalyticsResponse.Summary.builder()
            .totalRevenue(invoiceRepository.sumTotalRevenue())
            .pendingRevenue(invoiceRepository.sumPendingRevenue())
            .totalCustomers(customerRepository.count())
            .totalInvoices(invoiceRepository.count())
            .paidInvoices(invoiceRepository.countByStatus(
                com.billingcrm.model.Invoice.Status.PAID))
            .overdueInvoices(invoiceRepository.countOverdue(today))
            .voiceSessions(voiceSessionRepository.count())
            .build();
    }

    private List<AnalyticsResponse.MonthlyData> getMonthlyRevenue(int months) {
        List<AnalyticsResponse.MonthlyData> result = new ArrayList<>();
        for (int i = months - 1; i >= 0; i--) {
            YearMonth ym     = YearMonth.now().minusMonths(i);
            LocalDate start  = ym.atDay(1);
            LocalDate end    = ym.atEndOfMonth();
            BigDecimal rev   = invoiceRepository.sumRevenueByDateRange(start, end);
            long count       = invoiceRepository.countByDateRange(start, end);
            result.add(AnalyticsResponse.MonthlyData.builder()
                .month(ym.format(DateTimeFormatter.ofPattern("MMM yyyy")))
                .revenue(rev != null ? rev : BigDecimal.ZERO)
                .invoiceCount(count)
                .build());
        }
        return result;
    }

    private List<AnalyticsResponse.TopProduct> getTopProducts(int limit) {
        return invoiceRepository.findTopProducts(limit).stream()
            .map(row -> AnalyticsResponse.TopProduct.builder()
                .productName((String) row[0])
                .totalQuantity(((Number) row[1]).longValue())
                .totalRevenue((BigDecimal) row[2])
                .build())
            .collect(Collectors.toList());
    }

    private List<AnalyticsResponse.TopCustomer> getTopCustomers(int limit) {
        return invoiceRepository.findTopCustomers(limit).stream()
            .map(row -> AnalyticsResponse.TopCustomer.builder()
                .customerName((String) row[0])
                .totalInvoices(((Number) row[1]).longValue())
                .totalSpent((BigDecimal) row[2])
                .build())
            .collect(Collectors.toList());
    }

    private List<AnalyticsResponse.StatusCount> getInvoicesByStatus() {
        return invoiceRepository.countByEachStatus().stream()
            .map(row -> AnalyticsResponse.StatusCount.builder()
                .status((String) row[0])
                .count(((Number) row[1]).longValue())
                .build())
            .collect(Collectors.toList());
    }

    private List<AnalyticsResponse.DailyRevenue> getDailyRevenue(int days) {
        LocalDate from = LocalDate.now().minusDays(days - 1);
        return invoiceRepository.dailyRevenue(from, LocalDate.now()).stream()
            .map(row -> AnalyticsResponse.DailyRevenue.builder()
                .date(row[0].toString())
                .revenue((BigDecimal) row[1])
                .build())
            .collect(Collectors.toList());
    }
}