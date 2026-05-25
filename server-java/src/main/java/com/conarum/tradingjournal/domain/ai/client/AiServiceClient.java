package com.conarum.tradingjournal.domain.ai.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.Map;

@FeignClient(name = "gemini-client", url = "https://generativelanguage.googleapis.com")
public interface AiServiceClient {

    @PostMapping(value = "/v1beta/models/gemini-2.5-flash:generateContent")
    Map<String, Object> generateContent(
        @RequestParam("key") String apiKey, 
        @RequestBody Map<String, Object> request
    );
}
