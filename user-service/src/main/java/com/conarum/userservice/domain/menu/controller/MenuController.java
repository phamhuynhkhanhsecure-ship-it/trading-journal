package com.conarum.userservice.domain.menu.controller;

import com.conarum.userservice.common.dto.ApiResponse;
import com.conarum.userservice.domain.menu.dto.MenuDto;
import com.conarum.userservice.domain.menu.service.MenuService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/menus")
@RequiredArgsConstructor
@Tag(name = "Admin - Menus", description = "Menu/navigation management APIs")
public class MenuController {

    private final MenuService menuService;

    @GetMapping
    @Operation(summary = "Get all menus")
    public ResponseEntity<ApiResponse<List<MenuDto>>> getAllMenus() {
        return ResponseEntity.ok(ApiResponse.success(menuService.getAllMenus()));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get menu by ID")
    public ResponseEntity<ApiResponse<MenuDto>> getMenuById(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success(menuService.getMenuById(id)));
    }

    @PostMapping
    @Operation(summary = "Create a new menu")
    public ResponseEntity<ApiResponse<MenuDto>> createMenu(@RequestBody MenuDto dto) {
        return ResponseEntity.ok(ApiResponse.success(menuService.createMenu(dto)));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update an existing menu")
    public ResponseEntity<ApiResponse<MenuDto>> updateMenu(@PathVariable String id, @RequestBody MenuDto dto) {
        return ResponseEntity.ok(ApiResponse.success(menuService.updateMenu(id, dto)));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a menu")
    public ResponseEntity<ApiResponse<Void>> deleteMenu(@PathVariable String id) {
        menuService.deleteMenu(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
