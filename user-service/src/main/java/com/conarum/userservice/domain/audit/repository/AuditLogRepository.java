package com.conarum.userservice.domain.audit.repository;

import com.conarum.userservice.domain.audit.model.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AuditLogRepository extends MongoRepository<AuditLog, String> {
    Page<AuditLog> findByTargetEntityId(String targetEntityId, Pageable pageable);
    Page<AuditLog> findByPerformedBy(String performedBy, Pageable pageable);
}
