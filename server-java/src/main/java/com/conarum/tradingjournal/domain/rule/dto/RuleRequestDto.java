package com.conarum.tradingjournal.domain.rule.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RuleRequestDto {
    @NotBlank(message = "Rule name is required")
    private String name;
    
    private String description = "";
    private String category = "general";
    
    @com.fasterxml.jackson.annotation.JsonProperty("isActive")
    private boolean isActive = true;
    
    private int sortOrder = 0;
}
