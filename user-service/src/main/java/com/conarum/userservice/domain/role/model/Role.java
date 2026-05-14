package com.conarum.userservice.domain.role.model;

import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Version;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Document(collection = "roles")
public class Role {
    @Id
    private String id;

    @Version
    private Long version;
    private String name;
    private String description;
    private List<Permission> permissions = new ArrayList<>();
}
