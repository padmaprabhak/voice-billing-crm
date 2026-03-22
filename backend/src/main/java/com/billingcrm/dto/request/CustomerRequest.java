package com.billingcrm.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CustomerRequest {

    @NotBlank(message = "Name is required")
    private String name;

    private String phone;

    @Email(message = "Valid email required")
    private String email;

    private String address;
    private String city;
    private String state;
    private String country;
    private String postalCode;
    private String taxId;
    private String notes;
    private String status;
}