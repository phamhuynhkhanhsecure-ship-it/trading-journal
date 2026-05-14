package com.conarum.tradingjournal.domain.rule.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RuleResponseDto {
    private String id;
    private String name;
    private String description;
    private String category;
    
    @com.fasterxml.jackson.annotation.JsonProperty("isActive")
    private boolean isActive;
    
    private int sortOrder;
    private String createdAt;
    private String updatedAt;
}
