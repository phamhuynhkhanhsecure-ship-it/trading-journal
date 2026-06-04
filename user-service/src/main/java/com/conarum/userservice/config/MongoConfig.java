package com.conarum.userservice.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.MongoDatabaseFactory;
import org.springframework.data.mongodb.MongoTransactionManager;

/**
 * Enables multi-document transactions on MongoDB (requires replica set or Atlas).
 * Disabled in test profile via app.mongo.transactions.enabled=false
 * because embedded MongoDB (standalone) does not support multi-document transactions.
 */
@Configuration
@ConditionalOnProperty(name = "app.mongo.transactions.enabled", havingValue = "true", matchIfMissing = true)
public class MongoConfig {

    @Bean
    public MongoTransactionManager transactionManager(MongoDatabaseFactory dbFactory) {
        return new MongoTransactionManager(dbFactory);
    }
}
