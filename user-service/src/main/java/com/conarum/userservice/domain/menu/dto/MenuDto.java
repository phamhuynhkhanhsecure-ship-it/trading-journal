package com.conarum.userservice.domain.menu.dto;

import lombok.Data;

@Data
public class MenuDto {
    private String id;
    private String title;
    private String url;
    private String icon;
    private String parentId;
    private Integer order;
}
