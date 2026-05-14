package com.conarum.userservice.domain.user.model;

import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Version;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Document(collection = "users")
public class User {

    @Id
    private String email;

    @Version
    private Long version;

    private String name;
    
    private String avatar;

    private List<String> groupIds = new ArrayList<>();

    private String createdAt;

    private String lastLoginAt;

    public void prePersist() {
        if (this.createdAt == null) {
            this.createdAt = Instant.now().toString();
        }
        this.lastLoginAt = Instant.now().toString();
    }

    public void preUpdate() {
        // Here we could update an updatedAt field if we had one.
        // For now, this just satisfies the method call.
    }
}
