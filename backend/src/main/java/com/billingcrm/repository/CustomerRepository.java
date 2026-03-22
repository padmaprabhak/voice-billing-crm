package com.billingcrm.repository;

import com.billingcrm.model.Customer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, Long> {

    Optional<Customer> findByEmail(String email);

    boolean existsByEmail(String email);

    /** Exact case-insensitive name match */
    Optional<Customer> findByNameIgnoreCase(String name);

    /** Partial name match — used when exact lookup fails */
    List<Customer> findByNameContainingIgnoreCase(String name);

    @Query("""
        SELECT c FROM Customer c
        WHERE (:search IS NULL OR
               LOWER(c.name)    LIKE LOWER(CONCAT('%',:search,'%')) OR
               LOWER(c.email)   LIKE LOWER(CONCAT('%',:search,'%')) OR
               LOWER(c.company) LIKE LOWER(CONCAT('%',:search,'%')))
        AND (:status IS NULL OR c.status = :status)
        """)
    Page<Customer> findByFilters(
        @Param("search") String search,
        @Param("status") Customer.Status status,
        Pageable pageable
    );

    long countByStatus(Customer.Status status);
}