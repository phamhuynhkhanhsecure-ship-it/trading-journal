package com.conarum.userservice.domain.menu.model;

import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Getter
@Setter
@Document(collection = "menus")
public class Menu {
    @Id
    private String id;
    private String title;
    private String url;
    private String icon;
    private String parentId;
    private Integer order;
}
