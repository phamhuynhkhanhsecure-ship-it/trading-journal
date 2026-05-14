package com.conarum.userservice.domain.role.service;

import com.conarum.userservice.common.exception.ResourceNotFoundException;
import com.conarum.userservice.domain.audit.dto.AuditLogEvent;
import com.conarum.userservice.domain.audit.producer.KafkaAuditProducerService;
import com.conarum.userservice.domain.role.dto.RoleDto;
import com.conarum.userservice.domain.role.mapper.RoleMapper;
import com.conarum.userservice.domain.role.model.ApiLine;
import com.conarum.userservice.domain.role.model.Role;
import com.conarum.userservice.domain.role.repository.RoleRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RoleServiceImpl implements RoleService {

    private final RoleRepository roleRepository;
    private final RoleMapper roleMapper;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final KafkaAuditProducerService auditProducerService;

    @Override
    public List<RoleDto> getAllRoles() {
        return roleMapper.toDtoList(roleRepository.findAll());
    }

    @Override
    public RoleDto getRoleById(String id) {
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found"));
        return roleMapper.toDto(role);
    }

    @Override
    @Transactional
    public RoleDto createRole(RoleDto dto, String performedBy) {
        Role role = roleMapper.toEntity(dto);
        Role saved = roleRepository.save(role);
        
        auditProducerService.sendAuditLog(AuditLogEvent.builder()
                .action("CREATE_ROLE")
                .performedBy(performedBy)
                .targetEntity("ROLE")
                .targetEntityId(saved.getName())
                .details("Created Role: " + saved.getName())
                .timestamp(Instant.now())
                .build());
                
        return roleMapper.toDto(saved);
    }

    @Override
    @Transactional
    public RoleDto updateRole(String id, RoleDto dto, String performedBy) {
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found"));
        
        role.setName(dto.getName());
        role.setDescription(dto.getDescription());
        Role updatedEntity = roleMapper.toEntity(dto);
        role.setPermissions(updatedEntity.getPermissions());
        
        Role saved = roleRepository.save(role);
        
        // Cache Eviction & Update
        String cacheKey = "cache:role_permissions:" + id;
        redisTemplate.delete(cacheKey);
        
        if (saved.getPermissions() != null && !saved.getPermissions().isEmpty()) {
            List<ApiLine> allApiLines = new ArrayList<>();
            saved.getPermissions().forEach(permission -> {
                if (permission.getApiLines() != null) {
                    allApiLines.addAll(permission.getApiLines());
                }
            });
            
            if (!allApiLines.isEmpty()) {
                try {
                    String apiLinesJson = objectMapper.writeValueAsString(allApiLines);
                    redisTemplate.opsForHash().put(cacheKey, "api_lines", apiLinesJson);
                    redisTemplate.expire(cacheKey, Duration.ofHours(24));
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        }

        auditProducerService.sendAuditLog(AuditLogEvent.builder()
                .action("UPDATE_ROLE")
                .performedBy(performedBy)
                .targetEntity("ROLE")
                .targetEntityId(saved.getName())
                .details("Updated Role: " + saved.getName())
                .timestamp(Instant.now())
                .build());

        return roleMapper.toDto(saved);
    }

    @Override
    @Transactional
    public void deleteRole(String id, String performedBy) {
        Role role = roleRepository.findById(id).orElse(null);
        String roleName = role != null ? role.getName() : id;
        
        roleRepository.deleteById(id);
        
        // Cache Eviction
        redisTemplate.delete("cache:role_permissions:" + id);
        
        auditProducerService.sendAuditLog(AuditLogEvent.builder()
                .action("DELETE_ROLE")
                .performedBy(performedBy)
                .targetEntity("ROLE")
                .targetEntityId(roleName)
                .details("Deleted Role: " + roleName)
                .timestamp(Instant.now())
                .build());
    }
}
