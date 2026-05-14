package com.conarum.userservice.domain.billing.controller;

import com.conarum.userservice.common.dto.ApiResponse;
import com.conarum.userservice.domain.billing.dto.BillingTransactionResponseDto;
import com.conarum.userservice.domain.billing.service.BillingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/billing")
@RequiredArgsConstructor
@Tag(name = "Billing", description = "SaaS Billing & Premium Subscription APIs")
public class BillingController {

    private final BillingService billingService;

    @PostMapping("/purchase-premium")
    @Operation(summary = "Purchase Premium subscription", description = "Initiates the Saga choreography to upgrade user to Premium plan")
    public ResponseEntity<ApiResponse<BillingTransactionResponseDto>> purchasePremium(@AuthenticationPrincipal Jwt jwt) {
        String email = jwt != null ? jwt.getClaimAsString("email") : "system";
        BillingTransactionResponseDto result = billingService.purchasePremium(email);
        return ResponseEntity.ok(ApiResponse.success(result));
    }
}
