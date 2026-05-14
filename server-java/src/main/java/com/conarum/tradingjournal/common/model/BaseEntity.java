package com.conarum.tradingjournal.common.model;

import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.Id;

import java.time.Instant;

@Getter
@Setter
public abstract class BaseEntity {

    @Id
    private String id;

    private String createdAt;

    private String updatedAt;
    
    private String userEmail;

    public void prePersist() {
        if (this.createdAt == null) {
            this.createdAt = Instant.now().toString();
        }
        this.updatedAt = Instant.now().toString();
    }

    public void preUpdate() {
        this.updatedAt = Instant.now().toString();
    }
}
