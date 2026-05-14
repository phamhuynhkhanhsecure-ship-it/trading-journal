package com.conarum.userservice.domain.audit.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "audit_logs")
public class AuditLog {
    @Id
    private String id;
    private String action;
    @Indexed
    private String performedBy;
    @Indexed
    private String targetEntity;
    @Indexed
    private String targetEntityId;
    private String details;
    @Indexed(expireAfterSeconds = 7776000) // TTL Index: 90 days retention
    private Instant timestamp;
}
