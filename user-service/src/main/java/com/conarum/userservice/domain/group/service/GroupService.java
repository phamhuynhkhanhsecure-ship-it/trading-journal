package com.conarum.userservice.domain.group.service;

import com.conarum.userservice.domain.group.dto.GroupDto;
import java.util.List;

public interface GroupService {
    List<GroupDto> getAllGroups();
    GroupDto getGroupById(String id);
    GroupDto createGroup(GroupDto dto, String performedBy);
    GroupDto updateGroup(String id, GroupDto dto, String performedBy);
    void deleteGroup(String id, String performedBy);
}
