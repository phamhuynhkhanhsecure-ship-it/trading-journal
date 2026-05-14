package com.conarum.tradingjournal.domain.journal.model;

import com.conarum.tradingjournal.common.model.BaseEntity;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

@Getter
@Setter
@Document(collection = "journalentries")
@CompoundIndex(name = "date_userEmail_unique", def = "{'date': 1, 'userEmail': 1}", unique = true)
public class JournalEntry extends BaseEntity {
    private String date; // Format: YYYY-MM-DD
    private String content = "";
    private String mood = "neutral";
    private String preMarketNotes = "";
    private String postMarketNotes = "";
    private String marketCondition = "";
    private boolean isChecklistDone = false;
}
