package com.conarum.tradingjournal.domain.tag.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class TagResponseDto {
    private String id;
    private String name;
    private String color;
    private String createdAt;
}
