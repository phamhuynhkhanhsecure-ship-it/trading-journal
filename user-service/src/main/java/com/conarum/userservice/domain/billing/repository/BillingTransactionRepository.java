package com.conarum.userservice.domain.billing.repository;

import com.conarum.userservice.domain.billing.model.BillingTransaction;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BillingTransactionRepository extends MongoRepository<BillingTransaction, String> {
}
