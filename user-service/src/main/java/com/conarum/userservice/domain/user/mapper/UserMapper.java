package com.conarum.userservice.domain.user.mapper;

import com.conarum.userservice.domain.user.dto.UserDto;
import com.conarum.userservice.domain.user.model.User;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

import java.util.List;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface UserMapper {
    UserDto toDto(User user);
    List<UserDto> toDtoList(List<User> users);
}
