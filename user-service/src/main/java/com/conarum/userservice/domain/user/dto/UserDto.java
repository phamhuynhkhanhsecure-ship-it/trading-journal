package com.conarum.userservice.domain.user.dto;

import lombok.Data;
import java.util.List;

@Data
public class UserDto {
    private String email;
    private String name;
    private String avatar;
    private List<String> groupIds;
    private String createdAt;
    private String lastLoginAt;
}
