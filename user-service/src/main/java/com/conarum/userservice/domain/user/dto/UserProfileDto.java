package com.conarum.userservice.domain.user.dto;

import com.conarum.userservice.domain.menu.dto.MenuDto;
import lombok.Data;
import java.util.List;

@Data
public class UserProfileDto {
    private String email;
    private String name;
    private String avatar;
    private List<String> permissions; // Flattened permission names
    private List<MenuDto> menus;      // Flattened menus
}
