package com.billingcrm.repository;

import com.billingcrm.model.Invoice;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    Optional<Invoice> findByInvoiceNumber(String invoiceNumber);
    boolean existsByInvoiceNumber(String invoiceNumber);
    Page<Invoice> findByCustomerId(Long customerId, Pageable pageable);

    @Query("""
        SELECT i FROM Invoice i JOIN i.customer c
        WHERE (:search IS NULL OR
               LOWER(i.invoiceNumber) LIKE LOWER(CONCAT('%',:search,'%')) OR
               LOWER(c.name)          LIKE LOWER(CONCAT('%',:search,'%')))
        AND (:status     IS NULL OR i.status     = :status)
        AND (:customerId IS NULL OR c.id          = :customerId)
        AND (:fromDate   IS NULL OR i.issueDate  >= :fromDate)
        AND (:toDate     IS NULL OR i.issueDate  <= :toDate)
        """)
    Page<Invoice> findByFilters(
        @Param("search")     String search,
        @Param("status")     Invoice.Status status,
        @Param("customerId") Long customerId,
        @Param("fromDate")   LocalDate fromDate,
        @Param("toDate")     LocalDate toDate,
        Pageable pageable
    );

    @Query("SELECT COALESCE(SUM(i.finalAmount),0) FROM Invoice i WHERE i.status = 'PAID'")
    BigDecimal sumTotalRevenue();

    @Query("SELECT COALESCE(SUM(i.finalAmount),0) FROM Invoice i WHERE i.status = 'PENDING'")
    BigDecimal sumPendingRevenue();

    @Query("SELECT COALESCE(SUM(i.finalAmount),0) FROM Invoice i WHERE i.status = 'PAID' AND i.issueDate BETWEEN :from AND :to")
    BigDecimal sumRevenueByDateRange(@Param("from") LocalDate from, @Param("to") LocalDate to);

    @Query("SELECT COUNT(i) FROM Invoice i WHERE i.issueDate BETWEEN :from AND :to")
    long countByDateRange(@Param("from") LocalDate from, @Param("to") LocalDate to);

    long countByStatus(Invoice.Status status);

    @Query("SELECT COUNT(i) FROM Invoice i WHERE i.dueDate < :today AND i.status = 'PENDING'")
    long countOverdue(@Param("today") LocalDate today);

    @Query("""
        SELECT MAX(CAST(SUBSTRING(i.invoiceNumber, LENGTH(i.invoiceNumber) - 3) AS int))
        FROM Invoice i WHERE i.invoiceNumber LIKE CONCAT('INV-', :prefix, '-%')
        """)
    Optional<Integer> findMaxSequenceForDate(@Param("prefix") String datePrefix);

    // ── Analytics ─────────────────────────────────────────────────────

    @Query("""
        SELECT p.name, SUM(ii.quantity), SUM(ii.total)
        FROM InvoiceItem ii JOIN ii.product p
        GROUP BY p.name
        ORDER BY SUM(ii.total) DESC
        LIMIT :limit
        """)
    List<Object[]> findTopProducts(@Param("limit") int limit);

    @Query("""
        SELECT c.name, COUNT(i.id), SUM(i.finalAmount)
        FROM Invoice i JOIN i.customer c
        WHERE i.status = 'PAID'
        GROUP BY c.id, c.name
        ORDER BY SUM(i.finalAmount) DESC
        LIMIT :limit
        """)
    List<Object[]> findTopCustomers(@Param("limit") int limit);

    @Query("SELECT CAST(i.status AS string), COUNT(i) FROM Invoice i GROUP BY i.status")
    List<Object[]> countByEachStatus();

    @Query("""
        SELECT i.issueDate, COALESCE(SUM(i.finalAmount),0)
        FROM Invoice i
        WHERE i.status = 'PAID'
          AND i.issueDate BETWEEN :from AND :to
        GROUP BY i.issueDate
        ORDER BY i.issueDate
        """)
    List<Object[]> dailyRevenue(@Param("from") LocalDate from, @Param("to") LocalDate to);

    // Customer purchase history
    @Query("""
        SELECT i FROM Invoice i
        WHERE i.customer.id = :customerId
        ORDER BY i.createdAt DESC
        """)
    List<Invoice> findByCustomerIdOrderByCreatedAtDesc(@Param("customerId") Long customerId);

    @Query("SELECT COALESCE(SUM(i.finalAmount),0) FROM Invoice i WHERE i.customer.id = :cid AND i.status = 'PAID'")
    BigDecimal sumPaidByCustomer(@Param("cid") Long customerId);
}