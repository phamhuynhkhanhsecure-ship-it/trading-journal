package com.conarum.tradingjournal.domain.ai.service;

import java.util.Map;

public interface AiService {
    String getCoaching(String userEmail);
    Map<String, Object> analyzeImage(String imageBase64);
    String chat(Object messages, String userEmail, String language);
}
