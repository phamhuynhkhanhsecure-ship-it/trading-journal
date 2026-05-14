package com.conarum.userservice.domain.billing.service;

import com.conarum.userservice.domain.billing.dto.BillingTransactionResponseDto;

/**
 * Service interface for Billing operations.
 * Follows DIP: Controller depends on this interface, not the implementation.
 */
public interface BillingService {
    BillingTransactionResponseDto purchasePremium(String userEmail);
}
