package com.conarum.userservice.domain.group.controller;

import com.conarum.userservice.common.dto.ApiResponse;
import com.conarum.userservice.domain.group.dto.GroupDto;
import com.conarum.userservice.domain.group.service.GroupService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/groups")
@RequiredArgsConstructor
@Tag(name = "Admin - Groups", description = "Group management APIs")
public class GroupController {

    private final GroupService groupService;

    @GetMapping
    @Operation(summary = "Get all groups")
    public ResponseEntity<ApiResponse<List<GroupDto>>> getAllGroups() {
        return ResponseEntity.ok(ApiResponse.success(groupService.getAllGroups()));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get group by ID")
    public ResponseEntity<ApiResponse<GroupDto>> getGroupById(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success(groupService.getGroupById(id)));
    }

    @PostMapping
    @Operation(summary = "Create a new group")
    public ResponseEntity<ApiResponse<GroupDto>> createGroup(@RequestBody GroupDto dto, @AuthenticationPrincipal Jwt jwt) {
        String performedBy = jwt != null ? jwt.getClaimAsString("email") : "system";
        return ResponseEntity.ok(ApiResponse.success(groupService.createGroup(dto, performedBy)));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update an existing group")
    public ResponseEntity<ApiResponse<GroupDto>> updateGroup(@PathVariable String id, @RequestBody GroupDto dto, @AuthenticationPrincipal Jwt jwt) {
        String performedBy = jwt != null ? jwt.getClaimAsString("email") : "system";
        return ResponseEntity.ok(ApiResponse.success(groupService.updateGroup(id, dto, performedBy)));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a group")
    public ResponseEntity<ApiResponse<Void>> deleteGroup(@PathVariable String id, @AuthenticationPrincipal Jwt jwt) {
        String performedBy = jwt != null ? jwt.getClaimAsString("email") : "system";
        groupService.deleteGroup(id, performedBy);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
