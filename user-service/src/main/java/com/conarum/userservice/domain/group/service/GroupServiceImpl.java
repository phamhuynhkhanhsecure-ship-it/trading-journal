package com.conarum.userservice.domain.group.service;

import com.conarum.userservice.common.exception.ResourceNotFoundException;
import com.conarum.userservice.domain.audit.dto.AuditLogEvent;
import com.conarum.userservice.domain.audit.producer.KafkaAuditProducerService;
import com.conarum.userservice.domain.group.dto.GroupDto;
import com.conarum.userservice.domain.group.mapper.GroupMapper;
import com.conarum.userservice.domain.group.model.Group;
import com.conarum.userservice.domain.group.repository.GroupRepository;
import com.conarum.userservice.domain.role.model.Role;
import com.conarum.userservice.domain.role.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class GroupServiceImpl implements GroupService {

    private final GroupRepository groupRepository;
    private final RoleRepository roleRepository;
    private final GroupMapper groupMapper;
    private final StringRedisTemplate redisTemplate;
    private final KafkaAuditProducerService auditProducerService;

    @Override
    public List<GroupDto> getAllGroups() {
        return groupMapper.toDtoList(groupRepository.findAll());
    }

    @Override
    public GroupDto getGroupById(String id) {
        Group group = groupRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found"));
        return groupMapper.toDto(group);
    }

    @Override
    @Transactional
    public GroupDto createGroup(GroupDto dto, String performedBy) {
        Group group = groupMapper.toEntity(dto);
        Group saved = groupRepository.save(group);
        
        auditProducerService.sendAuditLog(AuditLogEvent.builder()
                .action("CREATE_GROUP")
                .performedBy(performedBy)
                .targetEntity("GROUP")
                .targetEntityId(saved.getName())
                .details("Created Group: " + saved.getName())
                .timestamp(Instant.now())
                .build());
                
        return groupMapper.toDto(saved);
    }

    @Override
    @Transactional
    public GroupDto updateGroup(String id, GroupDto dto, String performedBy) {
        Group group = groupRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found"));
        
        group.setName(dto.getName());
        group.setDescription(dto.getDescription());
        group.setRoleIds(dto.getRoleIds());
        
        Group saved = groupRepository.save(group);
        
        // Cache Eviction
        String cacheKey = "cache:group_roles:" + id;
        redisTemplate.delete(cacheKey);
        
        // Clear all user roles cache because a group change might affect many users
        Set<String> keys = redisTemplate.keys("user_roles::*");
        if (keys != null && !keys.isEmpty()) {
            redisTemplate.delete(keys);
        }
        
        if (saved.getRoleIds() != null && !saved.getRoleIds().isEmpty()) {
            redisTemplate.opsForList().rightPushAll(cacheKey, saved.getRoleIds());
            redisTemplate.expire(cacheKey, Duration.ofHours(24));
        }

        List<String> roleNames = (saved.getRoleIds() != null && !saved.getRoleIds().isEmpty()) ?
                roleRepository.findAllById(saved.getRoleIds()).stream().map(Role::getName).toList() :
                Collections.emptyList();

        auditProducerService.sendAuditLog(AuditLogEvent.builder()
                .action("UPDATE_GROUP")
                .performedBy(performedBy)
                .targetEntity("GROUP")
                .targetEntityId(saved.getName())
                .details("Updated Group: " + saved.getName() + ", Roles: " + roleNames)
                .timestamp(Instant.now())
                .build());

        return groupMapper.toDto(saved);
    }

    @Override
    @Transactional
    public void deleteGroup(String id, String performedBy) {
        Group group = groupRepository.findById(id).orElse(null);
        String groupName = group != null ? group.getName() : id;
        
        groupRepository.deleteById(id);
        
        // Cache Eviction
        redisTemplate.delete("cache:group_roles:" + id);
        Set<String> keys = redisTemplate.keys("user_roles::*");
        if (keys != null && !keys.isEmpty()) {
            redisTemplate.delete(keys);
        }
        
        auditProducerService.sendAuditLog(AuditLogEvent.builder()
                .action("DELETE_GROUP")
                .performedBy(performedBy)
                .targetEntity("GROUP")
                .targetEntityId(groupName)
                .details("Deleted Group: " + groupName)
                .timestamp(Instant.now())
                .build());
    }
}
