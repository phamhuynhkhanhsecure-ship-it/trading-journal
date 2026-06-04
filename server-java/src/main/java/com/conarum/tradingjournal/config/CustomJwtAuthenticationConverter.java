package com.conarum.tradingjournal.config;

import com.conarum.tradingjournal.common.dto.ApiResponse;
import com.conarum.tradingjournal.integration.client.UserServiceClient;
import com.conarum.tradingjournal.integration.client.UserServiceClient.UserSyncRequest;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.context.annotation.Lazy;
import lombok.extern.slf4j.Slf4j;

import java.util.Collection;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Component
public class CustomJwtAuthenticationConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    private final UserServiceClient userServiceClient;
    private final CustomJwtAuthenticationConverter self;

    public CustomJwtAuthenticationConverter(UserServiceClient userServiceClient, @Lazy CustomJwtAuthenticationConverter self) {
        this.userServiceClient = userServiceClient;
        this.self = self;
    }

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        String email = jwt.getClaimAsString("email");
        String name = jwt.getClaimAsString("name");
        String picture = jwt.getClaimAsString("picture");

        List<String> roles = self.getCachedRoles(email, name, picture);
        
        log.info("Roles for user {}: {}", email, roles);

        Collection<GrantedAuthority> authorities = roles.stream()
                .map(SimpleGrantedAuthority::new)
                .collect(Collectors.toList());

        return new JwtAuthenticationToken(jwt, authorities);
    }

    @Cacheable(value = "user_roles", key = "#email")
    public List<String> getCachedRoles(String email, String name, String picture) {
        try {
            UserSyncRequest syncRequest = new UserSyncRequest(email, name, picture);
            
            ApiResponse<List<String>> apiResponse = userServiceClient.syncUser(syncRequest);
            List<String> roles = (apiResponse != null && apiResponse.isSuccess()) ? apiResponse.getData() : List.of();
            return roles != null ? roles : List.of();
        } catch (Exception e) {
            log.error("Failed to sync user '{}' with user-service: {}", email, e.getMessage());
            return List.of();
        }
    }
}
