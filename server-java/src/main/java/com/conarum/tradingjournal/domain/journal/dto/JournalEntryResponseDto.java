package com.conarum.tradingjournal.domain.journal.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class JournalEntryResponseDto {
    private String id;
    private String date;
    private String content;
    private String mood;
    private String preMarketNotes;
    private String postMarketNotes;
    private String marketCondition;
    
    @com.fasterxml.jackson.annotation.JsonProperty("isChecklistDone")
    private boolean isChecklistDone;
    
    private String createdAt;
    private String updatedAt;
}
