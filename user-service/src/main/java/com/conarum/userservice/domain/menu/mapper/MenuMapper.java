package com.conarum.userservice.domain.menu.mapper;

import com.conarum.userservice.domain.menu.dto.MenuDto;
import com.conarum.userservice.domain.menu.model.Menu;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

import java.util.List;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface MenuMapper {
    MenuDto toDto(Menu menu);
    Menu toEntity(MenuDto dto);
    List<MenuDto> toDtoList(List<Menu> menus);
}
