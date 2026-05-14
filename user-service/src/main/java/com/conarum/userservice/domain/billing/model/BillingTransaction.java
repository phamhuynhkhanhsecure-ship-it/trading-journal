package com.conarum.userservice.domain.billing.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "billing_transactions")
public class BillingTransaction {
    @Id
    private String id;
    private String userEmail;
    private String packageId;
    private Double amount;
    private String status; // SUCCESS, FAILED
    private Instant createdAt;
}
