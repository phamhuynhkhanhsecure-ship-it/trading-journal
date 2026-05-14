package com.conarum.tradingjournal.domain.playbook.model;

import com.conarum.tradingjournal.common.model.BaseEntity;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Document(collection = "playbooks")
public class Playbook extends BaseEntity {
    private String name;
    private String description = "";
    private List<String> setupRules = new ArrayList<>();
    private String entryCriteria = "";
    private String exitCriteria = "";
    private String riskRules = "";
    private String color = "#58a6ff";
    private boolean isActive = true;
    private int sortOrder = 0;
}
