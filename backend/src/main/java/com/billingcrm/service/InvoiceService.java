package com.billingcrm.service;

import com.billingcrm.dto.request.InvoiceRequest;
import com.billingcrm.dto.response.InvoiceResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface InvoiceService {
    InvoiceResponse create(InvoiceRequest request, Long userId);
    InvoiceResponse findById(Long id);
    InvoiceResponse updateStatus(Long id, String status);
    Page<InvoiceResponse> findAll(String search, String status, Long customerId, Pageable pageable);
    void delete(Long id);
}