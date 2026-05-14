package com.conarum.tradingjournal.domain.ai.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.List;
import java.util.Map;

@Getter
@Setter
public class AiChatRequestDto {
    private List<Map<String, String>> messages; // e.g. [{"role": "user", "parts": [{"text": "hello"}]}]
    private String language = "vi";
}
