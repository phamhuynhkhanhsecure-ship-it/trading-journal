package com.conarum.userservice.domain.user.repository;

import com.conarum.userservice.domain.user.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserRepository extends MongoRepository<User, String>, UserRepositoryCustom {
}
