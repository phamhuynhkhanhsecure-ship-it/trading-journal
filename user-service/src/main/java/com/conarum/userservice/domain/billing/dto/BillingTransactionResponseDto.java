package com.conarum.userservice.domain.billing.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BillingTransactionResponseDto {
    private String id;
    private String userEmail;
    private String packageId;
    private BigDecimal amount;
    private String status;
    private Instant createdAt;
}
