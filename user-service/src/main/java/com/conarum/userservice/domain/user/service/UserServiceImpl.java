package com.conarum.userservice.domain.user.service;

import com.conarum.userservice.common.exception.ResourceNotFoundException;
import com.conarum.userservice.domain.audit.dto.AuditLogEvent;
import com.conarum.userservice.domain.audit.producer.KafkaAuditProducerService;
import com.conarum.userservice.domain.group.model.Group;
import com.conarum.userservice.domain.group.repository.GroupRepository;
import com.conarum.userservice.domain.menu.mapper.MenuMapper;
import com.conarum.userservice.domain.menu.model.Menu;
import com.conarum.userservice.domain.menu.repository.MenuRepository;
import com.conarum.userservice.domain.role.model.Permission;
import com.conarum.userservice.domain.role.model.Role;
import com.conarum.userservice.domain.role.repository.RoleRepository;
import com.conarum.userservice.domain.user.dto.UserDto;
import com.conarum.userservice.domain.user.dto.UserProfileDto;
import com.conarum.userservice.domain.user.dto.UserSyncRequestDto;
import com.conarum.userservice.domain.user.mapper.UserMapper;
import com.conarum.userservice.domain.user.model.User;
import com.conarum.userservice.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final GroupRepository groupRepository;
    private final RoleRepository roleRepository;
    private final MenuRepository menuRepository;
    private final UserMapper userMapper;
    private final MenuMapper menuMapper;
    private final StringRedisTemplate redisTemplate;
    private final KafkaAuditProducerService auditProducerService;

    @Value("${app.security.super-admins:}")
    private String superAdmins;

    @Override
    public List<UserDto> getAllUsers() {
        return userMapper.toDtoList(userRepository.findAll());
    }

    @Override
    public UserDto checkAdmin(String email) {
        User user = userRepository.findById(email).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return userMapper.toDto(user);
    }

    @Override
    @Transactional
    public UserDto updateUserGroups(String email, List<String> groupIds, String performedBy) {
        User user = userRepository.findById(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + email));
                
        user.setGroupIds(groupIds);
        user.preUpdate();
        User savedUser = userRepository.save(user);
        
        // Cache user groups
        String cacheKey = "cache:user_groups:" + email;
        String rolesCacheKey = "user_roles::" + email;
        redisTemplate.delete(cacheKey);
        redisTemplate.delete(rolesCacheKey);
        if (groupIds != null && !groupIds.isEmpty()) {
            redisTemplate.opsForList().rightPushAll(cacheKey, groupIds);
            redisTemplate.expire(cacheKey, Duration.ofHours(24));
        }
        
        List<String> groupNames = groupIds != null && !groupIds.isEmpty() ? 
                groupRepository.findAllById(groupIds).stream().map(Group::getName).toList() : 
                Collections.emptyList();
                
        // Send Audit Log
        auditProducerService.sendAuditLog(AuditLogEvent.builder()
                .action("UPDATE_USER_GROUPS")
                .performedBy(performedBy)
                .targetEntity("USER")
                .targetEntityId(email)
                .details("Updated user groups: " + groupNames)
                .timestamp(Instant.now())
                .build());
        
        return userMapper.toDto(savedUser);
    }

    @Override
    public List<String> syncUser(UserSyncRequestDto request) {
        if (request.email() == null) {
            return List.of();
        }

        // Initialize default group if not exists
        Group defaultGroup = groupRepository.findFirstByName("Default User").orElseGet(() -> {
            Group group = new Group();
            group.setName("Default User");
            group.setDescription("Nhóm người dùng mặc định");
            group.setRoleIds(new ArrayList<>(List.of("ROLE_USER")));
            return groupRepository.save(group);
        });

        // Atomic sync using custom repository (upsert)
        User user = new User();
        user.setEmail(request.email());
        user.setName(request.name());
        user.setAvatar(request.avatar());
        user.setGroupIds(new ArrayList<>(List.of(defaultGroup.getId())));
        
        user = userRepository.upsertUser(user);

        // Fetch all roleIds from user's groups
        Set<String> roleIds = new HashSet<>();
        List<Group> userGroups = (List<Group>) groupRepository.findAllById(user.getGroupIds());
        for (Group group : userGroups) {
            if (group.getRoleIds() != null) {
                roleIds.addAll(group.getRoleIds());
            }
        }

        // Check super admin (hardcoded logic)
        if (superAdmins != null && !superAdmins.isEmpty()) {
            List<String> adminList = Arrays.stream(superAdmins.split(","))
                    .map(String::trim)
                    .toList();
            if (adminList.contains(request.email().trim())) {
                roleIds.add("ROLE_SUPER_ADMIN");
                roleIds.add("ROLE_ADMIN");
            }
        }

        // Cache user groups
        String cacheKey = "cache:user_groups:" + request.email();
        String rolesCacheKey = "user_roles::" + request.email();
        redisTemplate.delete(cacheKey);
        redisTemplate.delete(rolesCacheKey);
        if (user.getGroupIds() != null && !user.getGroupIds().isEmpty()) {
            redisTemplate.opsForList().rightPushAll(cacheKey, user.getGroupIds());
            redisTemplate.expire(cacheKey, Duration.ofHours(24));
        }

        return new ArrayList<>(roleIds);
    }

    @Override
    public UserProfileDto getCurrentUserProfile(String email) {
        User user = userRepository.findById(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        UserProfileDto profile = new UserProfileDto();
        profile.setEmail(user.getEmail());
        profile.setName(user.getName());
        profile.setAvatar(user.getAvatar());

        Set<String> permissionNames = new HashSet<>();
        Set<String> menuIds = new HashSet<>();

        if (user.getGroupIds() != null) {
            List<String> validGroupIds = new ArrayList<>();
            for (String id : user.getGroupIds()) {
                if (id != null) validGroupIds.add(id);
            }
            List<Group> groups = (List<Group>) groupRepository.findAllById(validGroupIds);
            for (Group group : groups) {
                if (group.getRoleIds() != null) {
                    List<String> validRoleIds = new ArrayList<>();
                    for (String id : group.getRoleIds()) {
                        if (id != null) validRoleIds.add(id);
                    }
                    List<Role> roles = (List<Role>) roleRepository.findAllById(validRoleIds);
                    for (Role role : roles) {
                        if (role.getPermissions() != null) {
                            for (Permission perm : role.getPermissions()) {
                                if (perm.getPermissionName() != null) {
                                    permissionNames.add(perm.getPermissionName());
                                }
                                if (perm.getAssignedMenuIds() != null) {
                                    for (String mId : perm.getAssignedMenuIds()) {
                                        if (mId != null) menuIds.add(mId);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // Fetch menus and map to DTO
        List<Menu> menus = (List<Menu>) menuRepository.findAllById(menuIds);
        
        List<String> allPermissions = new ArrayList<>(permissionNames);
        allPermissions.addAll(menuIds);
        
        // Check super admin bypass
        if (superAdmins != null && !superAdmins.isEmpty()) {
            List<String> adminList = Arrays.stream(superAdmins.split(","))
                    .map(String::trim)
                    .toList();
            if (adminList.contains(email.trim())) {
                allPermissions.add("ROLE_SUPER_ADMIN");
                allPermissions.add("ROLE_ADMIN");
            }
        }
        
        profile.setPermissions(allPermissions);
        profile.setMenus(menuMapper.toDtoList(menus));

        return profile;
    }
}
