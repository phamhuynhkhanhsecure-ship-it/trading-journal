package com.conarum.userservice.domain.role.dto;

import lombok.Data;
import java.util.List;

@Data
public class PermissionDto {
    private String permissionName;
    private List<String> assignedMenuIds;
    private List<ApiLineDto> apiLines;
}
