package com.conarum.userservice.domain.role.model;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ApiLine {
    private String controller;
    private String action;
    private String path;
}
