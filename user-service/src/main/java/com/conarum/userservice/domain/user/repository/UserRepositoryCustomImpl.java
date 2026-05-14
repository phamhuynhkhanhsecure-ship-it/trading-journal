package com.conarum.userservice.domain.user.repository;

import com.conarum.userservice.domain.user.model.User;
import lombok.RequiredArgsConstructor;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;

import java.time.Instant;

@RequiredArgsConstructor
public class UserRepositoryCustomImpl implements UserRepositoryCustom {

    private final MongoTemplate mongoTemplate;

    @Override
    public User upsertUser(User user) {
        Query query = new Query(Criteria.where("_id").is(user.getEmail()));
        
        Update update = new Update()
                .set("name", user.getName())
                .set("avatar", user.getAvatar())
                .set("lastLoginAt", Instant.now().toString());

        // Use setOnInsert for fields that should only be set when creating
        update.setOnInsert("createdAt", Instant.now().toString());
        if (user.getGroupIds() != null && !user.getGroupIds().isEmpty()) {
            update.setOnInsert("groupIds", user.getGroupIds());
        }

        FindAndModifyOptions options = new FindAndModifyOptions()
                .returnNew(true)
                .upsert(true);

        return mongoTemplate.findAndModify(query, update, options, User.class);
    }
}
