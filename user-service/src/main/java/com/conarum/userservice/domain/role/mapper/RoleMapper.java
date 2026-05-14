package com.conarum.userservice.domain.role.mapper;

import com.conarum.userservice.domain.role.dto.RoleDto;
import com.conarum.userservice.domain.role.model.Role;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

import java.util.List;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface RoleMapper {
    RoleDto toDto(Role role);
    Role toEntity(RoleDto dto);
    List<RoleDto> toDtoList(List<Role> roles);
}
