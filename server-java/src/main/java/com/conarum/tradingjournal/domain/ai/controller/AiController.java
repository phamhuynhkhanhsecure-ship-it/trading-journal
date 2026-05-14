package com.conarum.tradingjournal.domain.ai.controller;

import com.conarum.tradingjournal.common.dto.ApiResponse;
import com.conarum.tradingjournal.config.SecurityUtils;
import com.conarum.tradingjournal.domain.ai.dto.AiChatRequestDto;
import com.conarum.tradingjournal.domain.ai.dto.AiVisionRequestDto;
import com.conarum.tradingjournal.domain.ai.service.AiService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiService aiService;

    @PostMapping("/coach")
    public ResponseEntity<ApiResponse<String>> getCoaching() {
        String userEmail = SecurityUtils.getCurrentUserEmail();
        String response = aiService.getCoaching(userEmail);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/vision")
    public ResponseEntity<ApiResponse<Map<String, Object>>> analyzeImage(@RequestBody AiVisionRequestDto request) {
        Map<String, Object> response = aiService.analyzeImage(request.getImageBase64());
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/chat")
    public ResponseEntity<ApiResponse<String>> chat(@RequestBody AiChatRequestDto request) {
        String userEmail = SecurityUtils.getCurrentUserEmail();
        String response = aiService.chat(request.getMessages(), userEmail, request.getLanguage());
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
