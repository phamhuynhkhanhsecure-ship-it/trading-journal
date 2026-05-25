package com.conarum.tradingjournal;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.data.mongodb.config.EnableMongoAuditing;
import org.springframework.scheduling.annotation.EnableScheduling;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.info.Info;

import org.springframework.cloud.openfeign.EnableFeignClients;

@SpringBootApplication
@EnableMongoAuditing
@EnableDiscoveryClient
@EnableFeignClients
@EnableScheduling
@OpenAPIDefinition(info = @Info(title = "Trading Journal Server API", version = "v1"))
public class TradingJournalApplication {

    public static void main(String[] args) {
        SpringApplication.run(TradingJournalApplication.class, args);
    }
}
