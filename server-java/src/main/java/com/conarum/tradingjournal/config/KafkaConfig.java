package com.conarum.tradingjournal.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

@Configuration
public class KafkaConfig {

    public static final String TRADING_EVENTS_TOPIC = "trading-events";

    @Bean
    public NewTopic tradingEventsTopic() {
        return TopicBuilder.name(TRADING_EVENTS_TOPIC)
                .partitions(1)
                .replicas(1)
                .build();
    }
}
