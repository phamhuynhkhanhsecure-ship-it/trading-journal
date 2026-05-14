package com.conarum.tradingjournal.domain.rule.model;

import com.conarum.tradingjournal.common.model.BaseEntity;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.mongodb.core.mapping.Document;

@Getter
@Setter
@Document(collection = "rules")
public class Rule extends BaseEntity {
    private String name;
    private String description = "";
    private String category = "general";
    private boolean isActive = true;
    private int sortOrder = 0;
}
