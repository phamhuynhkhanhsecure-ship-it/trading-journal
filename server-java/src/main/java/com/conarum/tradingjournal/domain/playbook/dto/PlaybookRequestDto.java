package com.conarum.tradingjournal.domain.playbook.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
public class PlaybookRequestDto {
    @NotBlank(message = "Playbook name is required")
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
