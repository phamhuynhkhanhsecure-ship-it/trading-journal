package com.conarum.userservice.domain.group.repository;

import com.conarum.userservice.domain.group.model.Group;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface GroupRepository extends MongoRepository<Group, String> {
    Optional<Group> findFirstByName(String name);
}
