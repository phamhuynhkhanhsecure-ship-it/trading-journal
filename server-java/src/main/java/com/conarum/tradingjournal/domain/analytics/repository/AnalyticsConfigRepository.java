package com.conarum.tradingjournal.domain.analytics.repository;

import com.conarum.tradingjournal.domain.analytics.model.AnalyticsConfig;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AnalyticsConfigRepository extends MongoRepository<AnalyticsConfig, String> {
    Optional<AnalyticsConfig> findByUserEmail(String userEmail);
}
