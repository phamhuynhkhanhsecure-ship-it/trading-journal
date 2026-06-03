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

        // Fix 3: single Redis call — user-service pre-builds flattened permission list on login/role change
        String permKey = "cache:user_permissions:" + email;
        return redisTemplate.opsForValue().get(permKey)
                .map(json -> {
                    try {
                        ApiLine[] permissions = objectMapper.readValue(json, ApiLine[].class);
                        return java.util.Arrays.stream(permissions).anyMatch(p -> isMatch(p, path, method));
                    } catch (Exception e) {
                        log.error("Failed to parse permissions for user '{}': {}", email, e.getMessage());
                        return false;
                    }
                })
                .defaultIfEmpty(false)
                .onErrorResume(e -> {
                    log.error("Redis error checking permissions for user '{}'", email, e);
                    return Mono.just(false);
                });
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
