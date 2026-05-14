package com.conarum.userservice.domain.user.repository;

import com.conarum.userservice.domain.user.model.User;

public interface UserRepositoryCustom {
    User upsertUser(User user);
}
