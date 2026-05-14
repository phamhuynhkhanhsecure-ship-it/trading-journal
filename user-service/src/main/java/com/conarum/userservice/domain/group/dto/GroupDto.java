package com.conarum.userservice.domain.group.dto;

import lombok.Data;
import java.util.List;

@Data
public class GroupDto {
    private String id;
    private String name;
    private String description;
    private List<String> roleIds;
}
