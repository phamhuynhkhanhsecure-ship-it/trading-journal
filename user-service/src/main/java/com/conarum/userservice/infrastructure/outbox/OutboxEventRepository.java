package com.conarum.userservice.infrastructure.outbox;

import com.conarum.userservice.common.model.OutboxEvent;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OutboxEventRepository extends MongoRepository<OutboxEvent, String> {
    List<OutboxEvent> findByStatusOrderByCreatedAtAsc(String status);
}
