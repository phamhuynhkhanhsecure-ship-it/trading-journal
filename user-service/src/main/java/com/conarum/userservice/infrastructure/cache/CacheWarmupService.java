package com.conarum.userservice.infrastructure.cache;

import com.conarum.userservice.domain.group.model.Group;
import com.conarum.userservice.domain.group.repository.GroupRepository;
import com.conarum.userservice.domain.role.model.ApiLine;
import com.conarum.userservice.domain.role.model.Role;
import com.conarum.userservice.domain.role.repository.RoleRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class CacheWarmupService {

    private final GroupRepository groupRepository;
    private final RoleRepository roleRepository;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    @EventListener(ApplicationReadyEvent.class)
    public void warmupCache() {
        log.info("Starting Redis Cache Warmup for RBAC...");
        
        try {
            List<Group> groups = groupRepository.findAll();
            for (Group group : groups) {
                String cacheKey = "cache:group_roles:" + group.getId();
                redisTemplate.delete(cacheKey);
                if (group.getRoleIds() != null && !group.getRoleIds().isEmpty()) {
                    redisTemplate.opsForList().rightPushAll(cacheKey, group.getRoleIds());
                    redisTemplate.expire(cacheKey, java.time.Duration.ofHours(24));
                }
            }
            log.info("Warmed up {} groups in Redis.", groups.size());

            List<Role> roles = roleRepository.findAll();
            for (Role role : roles) {
                String cacheKey = "cache:role_permissions:" + role.getId();
                redisTemplate.delete(cacheKey);
                
                if (role.getPermissions() != null && !role.getPermissions().isEmpty()) {
                    List<ApiLine> allApiLines = new ArrayList<>();
                    role.getPermissions().forEach(permission -> {
                        if (permission.getApiLines() != null) {
                            allApiLines.addAll(permission.getApiLines());
                        }
                    });
                    
                    if (!allApiLines.isEmpty()) {
                        String apiLinesJson = objectMapper.writeValueAsString(allApiLines);
                        redisTemplate.opsForHash().put(cacheKey, "api_lines", apiLinesJson);
                        redisTemplate.expire(cacheKey, java.time.Duration.ofHours(24));
                    }
                }
            }
            log.info("Warmed up {} roles in Redis.", roles.size());
            
        } catch (Exception e) {
            log.error("Failed to warmup RBAC cache", e);
        }
    }
}
