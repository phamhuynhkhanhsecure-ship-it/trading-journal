package com.conarum.tradingjournal.domain.playbook.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class PlaybookResponseDto {
    private String id;
    private String name;
    private String description;
    private List<String> setupRules;
    private String entryCriteria;
    private String exitCriteria;
    private String riskRules;
    private String color;
    private boolean isActive;
    private int sortOrder;
    private String createdAt;
    private String updatedAt;

    // Statistics
    private int tradeCount;
    private int winCount;
    private double totalPnl;
    private double avgPnl;
    private double winRate;
}
