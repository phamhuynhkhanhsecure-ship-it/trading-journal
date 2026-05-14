package com.conarum.userservice.domain.menu.repository;

import com.conarum.userservice.domain.menu.model.Menu;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MenuRepository extends MongoRepository<Menu, String> {
}
