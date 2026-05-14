package com.conarum.userservice.domain.user.service;

import com.conarum.userservice.domain.user.dto.UserDto;
import com.conarum.userservice.domain.user.dto.UserSyncRequestDto;
import com.conarum.userservice.domain.user.dto.UserProfileDto;

import java.util.List;

public interface UserService {
    List<UserDto> getAllUsers();
    UserDto checkAdmin(String email);
    UserDto updateUserGroups(String email, List<String> groupIds, String performedBy);
    List<String> syncUser(UserSyncRequestDto request);
    UserProfileDto getCurrentUserProfile(String email);
}
