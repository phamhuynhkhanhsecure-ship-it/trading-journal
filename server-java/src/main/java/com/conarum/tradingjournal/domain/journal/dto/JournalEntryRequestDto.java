package com.conarum.tradingjournal.domain.journal.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class JournalEntryRequestDto {
    @NotBlank(message = "Date is required")
    private String date; // Format: YYYY-MM-DD
    
    private String content = "";
    private String mood = "neutral";
    private String preMarketNotes = "";
    private String postMarketNotes = "";
    private String marketCondition = "";
    
    @com.fasterxml.jackson.annotation.JsonProperty("isChecklistDone")
    private boolean isChecklistDone = false;
}
