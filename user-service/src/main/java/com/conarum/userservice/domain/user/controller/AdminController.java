package com.conarum.userservice.domain.user.controller;

import com.conarum.userservice.common.dto.ApiResponse;
import com.conarum.userservice.domain.user.dto.UserDto;
import com.conarum.userservice.domain.user.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/users")
@RequiredArgsConstructor
@Tag(name = "Admin - Users", description = "Admin user management APIs")
public class AdminController {

    private final UserService userService;

    @GetMapping
    @Operation(summary = "Get all users")
    public ResponseEntity<ApiResponse<List<UserDto>>> getAllUsers() {
        return ResponseEntity.ok(ApiResponse.success(userService.getAllUsers()));
    }

    @GetMapping("/me/is-admin")
    @Operation(summary = "Check if current user is admin")
    public ResponseEntity<ApiResponse<Boolean>> checkAdmin() {
        return ResponseEntity.ok(ApiResponse.success(true));
    }

    @PutMapping("/{email}/groups")
    @Operation(summary = "Update user group assignments")
    public ResponseEntity<ApiResponse<UserDto>> updateUserGroups(
            @PathVariable String email,
            @RequestBody List<String> groupIds,
            @AuthenticationPrincipal Jwt jwt) {
        String performedBy = jwt != null ? jwt.getClaimAsString("email") : "system";
        return ResponseEntity.ok(ApiResponse.success(userService.updateUserGroups(email, groupIds, performedBy)));
    }
}
