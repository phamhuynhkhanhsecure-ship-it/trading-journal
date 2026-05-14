package com.conarum.userservice.domain.audit.service;

import com.conarum.userservice.domain.audit.model.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * Service interface for Audit Log read operations.
 * Follows DIP: Controller depends on this interface, not the implementation.
 */
public interface AuditLogService {
    Page<AuditLog> getAuditLogs(String targetEntityId, String performedBy, Pageable pageable);
}
