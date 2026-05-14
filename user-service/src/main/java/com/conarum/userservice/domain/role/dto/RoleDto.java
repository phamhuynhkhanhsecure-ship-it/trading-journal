package com.conarum.userservice.domain.role.dto;

import lombok.Data;
import java.util.List;

@Data
public class RoleDto {
    private String id;
    private String name;
    private String description;
    private List<PermissionDto> permissions;
}
