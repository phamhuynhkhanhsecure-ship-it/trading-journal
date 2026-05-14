package com.conarum.userservice.domain.menu.service;

import com.conarum.userservice.common.exception.ResourceNotFoundException;
import com.conarum.userservice.domain.menu.dto.MenuDto;
import com.conarum.userservice.domain.menu.mapper.MenuMapper;
import com.conarum.userservice.domain.menu.model.Menu;
import com.conarum.userservice.domain.menu.repository.MenuRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MenuServiceImpl implements MenuService {

    private final MenuRepository menuRepository;
    private final MenuMapper menuMapper;

    @Override
    public List<MenuDto> getAllMenus() {
        return menuMapper.toDtoList(menuRepository.findAll());
    }

    @Override
    public MenuDto getMenuById(String id) {
        Menu menu = menuRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Menu not found"));
        return menuMapper.toDto(menu);
    }

    @Override
    @Transactional
    public MenuDto createMenu(MenuDto dto) {
        Menu menu = menuMapper.toEntity(dto);
        Menu saved = menuRepository.save(menu);
        return menuMapper.toDto(saved);
    }

    @Override
    @Transactional
    public MenuDto updateMenu(String id, MenuDto dto) {
        Menu menu = menuRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Menu not found"));
        
        menu.setTitle(dto.getTitle());
        menu.setUrl(dto.getUrl());
        menu.setIcon(dto.getIcon());
        menu.setParentId(dto.getParentId());
        menu.setOrder(dto.getOrder());
        
        Menu saved = menuRepository.save(menu);
        return menuMapper.toDto(saved);
    }

    @Override
    @Transactional
    public void deleteMenu(String id) {
        menuRepository.deleteById(id);
    }
}
