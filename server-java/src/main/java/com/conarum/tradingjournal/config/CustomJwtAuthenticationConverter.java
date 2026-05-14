package com.conarum.tradingjournal.config;

import com.conarum.tradingjournal.common.dto.ApiResponse;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.core.convert.converter.Converter;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.context.annotation.Lazy;

import java.util.Collection;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class CustomJwtAuthenticationConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    private final RestTemplate restTemplate;
    private final CustomJwtAuthenticationConverter self;

    public CustomJwtAuthenticationConverter(RestTemplate restTemplate, @Lazy CustomJwtAuthenticationConverter self) {
        this.restTemplate = restTemplate;
        this.self = self;
    }

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        String email = jwt.getClaimAsString("email");
        String name = jwt.getClaimAsString("name");
        String picture = jwt.getClaimAsString("picture");

        List<String> roles = self.getCachedRoles(email, name, picture);

        Collection<GrantedAuthority> authorities = roles.stream()
                .map(SimpleGrantedAuthority::new)
                .collect(Collectors.toList());

        return new JwtAuthenticationToken(jwt, authorities);
    }

    @Cacheable(value = "user_roles", key = "#email")
    public List<String> getCachedRoles(String email, String name, String picture) {
        try {
            UserSyncRequest syncRequest = new UserSyncRequest(email, name, picture);
            
            ResponseEntity<ApiResponse<List<String>>> response = restTemplate.exchange(
                    "http://user-service/api/internal/users/sync",
                    HttpMethod.POST,
                    new org.springframework.http.HttpEntity<>(syncRequest),
                    new ParameterizedTypeReference<ApiResponse<List<String>>>() {}
            );
            ApiResponse<List<String>> apiResponse = response.getBody();
            List<String> roles = (apiResponse != null && apiResponse.isSuccess()) ? apiResponse.getData() : List.of();
            return roles != null ? roles : List.of();
        } catch (Exception e) {
            e.printStackTrace();
            return List.of();
        }
    }
}

record UserSyncRequest(String email, String name, String avatar) {}
