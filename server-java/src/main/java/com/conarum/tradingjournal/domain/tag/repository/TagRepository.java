package com.conarum.tradingjournal.domain.tag.repository;

import com.conarum.tradingjournal.domain.tag.model.Tag;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TagRepository extends MongoRepository<Tag, String> {
    List<Tag> findByUserEmailOrderByNameAsc(String userEmail);
    Optional<Tag> findByNameAndUserEmail(String name, String userEmail);
}
