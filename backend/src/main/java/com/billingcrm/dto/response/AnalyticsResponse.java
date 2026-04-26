package com.billingcrm.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class AnalyticsResponse {

    private Summary                summary;
    private List<MonthlyData>      monthlyRevenue;
    private List<TopProduct>       topProducts;
    private List<TopCustomer>      topCustomers;
    private List<StatusCount>      invoicesByStatus;
    private List<DailyRevenue>     dailyRevenue;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class Summary {
        private BigDecimal totalRevenue;
        private BigDecimal pendingRevenue;
        private long       totalCustomers;
        private long       totalInvoices;
        private long       paidInvoices;
        private long       overdueInvoices;
        private long       voiceSessions;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class MonthlyData {
        private String     month;
        private BigDecimal revenue;
        private long       invoiceCount;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class TopProduct {
        private String     productName;
        private long       totalQuantity;
        private BigDecimal totalRevenue;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class TopCustomer {
        private String     customerName;
        private long       totalInvoices;
        private BigDecimal totalSpent;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class StatusCount {
        private String status;
        private long   count;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class DailyRevenue {
        private String     date;
        private BigDecimal revenue;
    }
}