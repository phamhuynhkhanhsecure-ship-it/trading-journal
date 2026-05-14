package com.conarum.tradingjournal.domain.tag.model;

import com.conarum.tradingjournal.common.model.BaseEntity;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

@Getter
@Setter
@Document(collection = "tags")
@CompoundIndex(name = "name_userEmail_unique", def = "{'name': 1, 'userEmail': 1}", unique = true)
public class Tag extends BaseEntity {
    private String name;
    private String color = "#58a6ff";
}
