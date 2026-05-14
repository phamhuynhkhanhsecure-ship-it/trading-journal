package com.conarum.userservice.domain.audit.service;

import com.conarum.userservice.domain.audit.model.AuditLog;
import com.conarum.userservice.domain.audit.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditLogServiceImpl implements AuditLogService {

    private final AuditLogRepository auditLogRepository;

    @Override
    @Transactional(readOnly = true)
    public Page<AuditLog> getAuditLogs(String targetEntityId, String performedBy, Pageable pageable) {
        if (targetEntityId != null && !targetEntityId.isEmpty()) {
            return auditLogRepository.findByTargetEntityId(targetEntityId, pageable);
        } else if (performedBy != null && !performedBy.isEmpty()) {
            return auditLogRepository.findByPerformedBy(performedBy, pageable);
        } else {
            return auditLogRepository.findAll(pageable);
        }
    }
}
