package com.conarum.userservice.domain.role.dto;

import lombok.Data;

@Data
public class ApiLineDto {
    private String controller;
    private String action;
    private String path;
}
