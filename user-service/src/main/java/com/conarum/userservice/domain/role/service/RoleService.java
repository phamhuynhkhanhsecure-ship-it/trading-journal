package com.conarum.userservice.domain.role.service;

import com.conarum.userservice.domain.role.dto.RoleDto;
import java.util.List;

public interface RoleService {
    List<RoleDto> getAllRoles();
    RoleDto getRoleById(String id);
    RoleDto createRole(RoleDto dto, String performedBy);
    RoleDto updateRole(String id, RoleDto dto, String performedBy);
    void deleteRole(String id, String performedBy);
}
