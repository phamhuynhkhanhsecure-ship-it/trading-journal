package com.conarum.userservice.domain.role.controller;

import com.conarum.userservice.common.dto.ApiResponse;
import com.conarum.userservice.domain.role.dto.RoleDto;
import com.conarum.userservice.domain.role.service.RoleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/roles")
@RequiredArgsConstructor
@Tag(name = "Admin - Roles", description = "Role & permission management APIs")
public class RoleController {

    private final RoleService roleService;

    @GetMapping
    @Operation(summary = "Get all roles")
    public ResponseEntity<ApiResponse<List<RoleDto>>> getAllRoles() {
        return ResponseEntity.ok(ApiResponse.success(roleService.getAllRoles()));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get role by ID")
    public ResponseEntity<ApiResponse<RoleDto>> getRoleById(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success(roleService.getRoleById(id)));
    }

    @PostMapping
    @Operation(summary = "Create a new role")
    public ResponseEntity<ApiResponse<RoleDto>> createRole(@RequestBody RoleDto dto, @AuthenticationPrincipal Jwt jwt) {
        String performedBy = jwt != null ? jwt.getClaimAsString("email") : "system";
        return ResponseEntity.ok(ApiResponse.success(roleService.createRole(dto, performedBy)));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update an existing role")
    public ResponseEntity<ApiResponse<RoleDto>> updateRole(@PathVariable String id, @RequestBody RoleDto dto, @AuthenticationPrincipal Jwt jwt) {
        String performedBy = jwt != null ? jwt.getClaimAsString("email") : "system";
        return ResponseEntity.ok(ApiResponse.success(roleService.updateRole(id, dto, performedBy)));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a role")
    public ResponseEntity<ApiResponse<Void>> deleteRole(@PathVariable String id, @AuthenticationPrincipal Jwt jwt) {
        String performedBy = jwt != null ? jwt.getClaimAsString("email") : "system";
        roleService.deleteRole(id, performedBy);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
