package com.conarum.userservice.domain.audit.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLogEvent {
    private String action;          // e.g., "UPDATE_USER_GROUPS", "CREATE_ROLE"
    private String performedBy;     // Admin's email
    private String targetEntity;    // e.g., "USER", "GROUP", "ROLE"
    private String targetEntityId;  // User's email or Group/Role ID
    private String details;         // Human readable description
    private Instant timestamp;      // When the action occurred
}
