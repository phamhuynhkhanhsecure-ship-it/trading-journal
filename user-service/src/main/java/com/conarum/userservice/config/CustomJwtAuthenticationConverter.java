package com.conarum.userservice.config;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.List;
import java.util.stream.Collectors;

import com.conarum.userservice.domain.user.dto.UserSyncRequestDto;
import com.conarum.userservice.domain.user.service.UserService;

@Component
public class CustomJwtAuthenticationConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    private final UserService userService;

    public CustomJwtAuthenticationConverter(UserService userService) {
        this.userService = userService;
    }

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        String email = jwt.getClaimAsString("email");
        String name = jwt.getClaimAsString("name");
        String picture = jwt.getClaimAsString("picture");

        if (email == null) {
            return new JwtAuthenticationToken(jwt, List.of());
        }

        // Use UserService to auto-provision and fetch roleIds
        UserSyncRequestDto syncRequest = new UserSyncRequestDto(email, name, picture);
        List<String> roles = userService.syncUser(syncRequest);

        // Map roles to GrantedAuthorities
        Collection<GrantedAuthority> authorities = roles.stream()
                .map(SimpleGrantedAuthority::new)
                .collect(Collectors.toList());

        return new JwtAuthenticationToken(jwt, authorities);
    }
}
