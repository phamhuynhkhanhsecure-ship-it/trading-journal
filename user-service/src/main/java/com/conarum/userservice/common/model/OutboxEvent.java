package com.conarum.userservice.common.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "outbox_events")
public class OutboxEvent {
    @Id
    private String id;
    private String topic;
    private String aggregateId;
    private String eventType;
    private String payload; // JSON representation of the event
    private String status; // PENDING, COMPLETED, FAILED
    private Instant createdAt;
    private Instant processedAt;
}
