package com.conarum.userservice.domain.role.model;

import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
public class Permission {
    private String permissionName;
    private List<String> assignedMenuIds = new ArrayList<>();
    private List<ApiLine> apiLines = new ArrayList<>();
}
