package com.conarum.userservice.domain.menu.service;

import com.conarum.userservice.domain.menu.dto.MenuDto;
import java.util.List;

public interface MenuService {
    List<MenuDto> getAllMenus();
    MenuDto getMenuById(String id);
    MenuDto createMenu(MenuDto dto);
    MenuDto updateMenu(String id, MenuDto dto);
    void deleteMenu(String id);
}
