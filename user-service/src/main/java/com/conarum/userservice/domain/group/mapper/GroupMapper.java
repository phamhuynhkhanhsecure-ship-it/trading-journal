package com.conarum.userservice.domain.group.mapper;

import com.conarum.userservice.domain.group.dto.GroupDto;
import com.conarum.userservice.domain.group.model.Group;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

import java.util.List;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface GroupMapper {
    GroupDto toDto(Group group);
    Group toEntity(GroupDto dto);
    List<GroupDto> toDtoList(List<Group> groups);
}
