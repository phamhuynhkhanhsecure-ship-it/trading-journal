package com.conarum.apigateway.filter;

import com.conarum.apigateway.model.ApiLine;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import org.springframework.data.redis.core.ReactiveStringRedisTemplate;

import com.fasterxml.jackson.databind.ObjectMapper;

@Component
@Slf4j
@RequiredArgsConstructor
public class DynamicAuthorizationFilter implements GlobalFilter, Ordered {

    private final ReactiveStringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final AntPathMatcher pathMatcher = new AntPathMatcher();

    @org.springframework.beans.factory.annotation.Value("${app.security.super-admins:}")
    private String superAdminsStr;

    // Whitelisted paths that don't need DB authorization check (already authenticated)
    private static final String[] WHITELIST_PATHS = {
            "/api/internal/users/sync",
            "/api/v1/users/me",
            "/api/v1/billing/**"
    };

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getURI().getPath();
        String method = request.getMethod().name();

        // Check if path is whitelisted
        for (String whitelistPath : WHITELIST_PATHS) {
            if (pathMatcher.match(whitelistPath, path)) {
                return chain.filter(exchange);
            }
        }

        return exchange.getPrincipal()
                .hasElement()
                .flatMap(hasPrincipal -> {
                    if (!hasPrincipal) {
                        // If no principal, let SecurityConfig handle it (it might be permittedAll, e.g. OPTIONS)
                        return chain.filter(exchange);
                    }

                    return exchange.getPrincipal()
                            .cast(JwtAuthenticationToken.class)
                            .map(jwtAuth -> jwtAuth.getToken().getClaimAsString("email"))
                            .flatMap(email -> {
                                if (email == null) {
                                    return unauthorized(exchange);
                                }
                                return checkAccess(email, path, method)
                                        .flatMap(hasAccess -> {
                                            if (hasAccess) {
                                                return chain.filter(exchange);
                                            } else {
                                                log.warn("Access Denied for user {} to {} {}", email, method, path);
                                                return unauthorized(exchange);
                                            }
                                        });
                            });
                });
    }

    private Mono<Boolean> checkAccess(String email, String path, String method) {
        // Super Admin bypass
        if (superAdminsStr != null) {
            java.util.List<String> adminList = java.util.Arrays.stream(superAdminsStr.split(","))
                    .map(String::trim)
                    .toList();
            if (adminList.contains(email.trim())) {
                return Mono.just(true);
            }
        }
        
        String userGroupsKey = "cache:user_groups:" + email;
        
        return redisTemplate.opsForList().range(userGroupsKey, 0, -1)
                .flatMap(groupId -> {
                    String groupRolesKey = "cache:group_roles:" + groupId;
                    return redisTemplate.opsForList().range(groupRolesKey, 0, -1);
                })
                .flatMap(roleId -> {
                    String rolePermsKey = "cache:role_permissions:" + roleId;
                    return redisTemplate.opsForHash().get(rolePermsKey, "api_lines");
                })
                .cast(String.class)
                .flatMapIterable(apiLinesJson -> {
                    try {
                        ApiLine[] arr = objectMapper.readValue(apiLinesJson, ApiLine[].class);
                        return java.util.Arrays.asList(arr);
                    } catch (Exception e) {
                        log.error("Failed to parse ApiLine JSON", e);
                        return java.util.Collections.emptyList();
                    }
                })
                .any(apiLine -> isMatch(apiLine, path, method))
                // Default to false if nothing matches or if Redis is empty
                .defaultIfEmpty(false);
    }

    private boolean isMatch(ApiLine apiLine, String path, String method) {
        if (apiLine == null || apiLine.getPath() == null) {
            log.debug("isMatch failed: apiLine or path is null");
            return false;
        }
        
        boolean methodMatch = "*".equals(apiLine.getAction()) || method.equalsIgnoreCase(apiLine.getAction());
        boolean pathMatch = pathMatcher.match(apiLine.getPath(), path) || pathMatcher.match(apiLine.getPath(), path + "/");
        
        log.debug("Checking match: req[{}:{}] against perm[{}:{}] -> methodMatch:{}, pathMatch:{}", 
            method, path, apiLine.getAction(), apiLine.getPath(), methodMatch, pathMatch);
            
        return methodMatch && pathMatch;
    }

    private Mono<Void> unauthorized(ServerWebExchange exchange) {
        exchange.getResponse().setStatusCode(HttpStatus.FORBIDDEN);
        return exchange.getResponse().setComplete();
    }

    @Override
    public int getOrder() {
        // Run after Spring Security
        return 0;
    }
}
