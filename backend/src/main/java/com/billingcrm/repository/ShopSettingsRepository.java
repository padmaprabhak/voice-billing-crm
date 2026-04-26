package com.billingcrm.repository;

import com.billingcrm.model.ShopSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ShopSettingsRepository extends JpaRepository<ShopSettings, Long> {
    // Single-row settings table — always access by id = 1
}