package com.conarum.userservice.domain.user.controller;

import com.conarum.userservice.common.dto.ApiResponse;
import com.conarum.userservice.domain.user.dto.UserSyncRequestDto;
import com.conarum.userservice.domain.user.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/internal/users")
@RequiredArgsConstructor
@Tag(name = "Internal - Users", description = "Internal user sync APIs (service-to-service)")
public class InternalUserController {

    private final UserService userService;

    @GetMapping("/test-env")
    @Operation(summary = "Health check for internal controller")
    public String testEnv() {
        return "Internal Controller is active.";
    }

    @PostMapping("/sync")
    @Operation(summary = "Sync user from OAuth provider")
    public ResponseEntity<ApiResponse<List<String>>> syncUser(@RequestBody UserSyncRequestDto request) {
        return ResponseEntity.ok(ApiResponse.success(userService.syncUser(request)));
    }
}
