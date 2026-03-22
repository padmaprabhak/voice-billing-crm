package com.billingcrm.mapper;

import com.billingcrm.dto.request.ProductRequest;
import com.billingcrm.dto.response.ProductResponse;
import com.billingcrm.model.Product;
import org.springframework.stereotype.Component;

@Component
public class ProductMapper {

    public Product toEntity(ProductRequest req) {
        return Product.builder()
            .name(req.getName())
            .description(req.getDescription())
            .price(req.getPrice())
            .gstPercentage(req.getGstPercentage())
            .sku(req.getSku())
            .unit(req.getUnit())
            .status(req.getStatus() != null
                ? Product.Status.valueOf(req.getStatus().toUpperCase())
                : Product.Status.ACTIVE)
            .build();
    }

    public ProductResponse toResponse(Product p) {
        return ProductResponse.builder()
            .id(p.getId())
            .name(p.getName())
            .description(p.getDescription())
            .price(p.getPrice())
            .gstPercentage(p.getGstPercentage())
            .sku(p.getSku())
            .unit(p.getUnit())
            .status(p.getStatus().name())
            .createdAt(p.getCreatedAt())
            .updatedAt(p.getUpdatedAt())
            .build();
    }

    public void updateEntity(Product product, ProductRequest req) {
        if (req.getName()          != null) product.setName(req.getName());
        if (req.getDescription()   != null) product.setDescription(req.getDescription());
        if (req.getPrice()         != null) product.setPrice(req.getPrice());
        if (req.getGstPercentage() != null) product.setGstPercentage(req.getGstPercentage());
        if (req.getSku()           != null) product.setSku(req.getSku());
        if (req.getUnit()          != null) product.setUnit(req.getUnit());
        if (req.getStatus()        != null)
            product.setStatus(Product.Status.valueOf(req.getStatus().toUpperCase()));
    }
}