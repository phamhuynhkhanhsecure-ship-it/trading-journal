package com.conarum.userservice.config;

import org.mockito.Mockito;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.security.oauth2.jwt.JwtDecoder;

/**
 * Mock JwtDecoder for WebEnvironment.NONE integration tests.
 * See server-java equivalent for full explanation.
 */
@TestConfiguration
public class TestSecurityConfig {

    @Bean
    public JwtDecoder testJwtDecoder() {
        return Mockito.mock(JwtDecoder.class);
    }
}
