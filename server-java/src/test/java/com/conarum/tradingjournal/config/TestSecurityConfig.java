package com.conarum.tradingjournal.config;

import org.mockito.Mockito;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.security.oauth2.jwt.JwtDecoder;

/**
 * Provides a mock JwtDecoder for integration tests that use WebEnvironment.NONE.
 *
 * Without this, Spring Security's WebSecurityConfiguration cannot create filter chains
 * because OAuth2ResourceServerAutoConfiguration is @ConditionalOnWebApplication(SERVLET)
 * and is skipped when there is no servlet context (WebEnvironment.NONE).
 *
 * Service layer integration tests don't need real JWT validation — the mock satisfies
 * the dependency without any network calls.
 *
 * Usage: @Import(TestSecurityConfig.class) on any @SpringBootTest(webEnvironment=NONE)
 */
@TestConfiguration
public class TestSecurityConfig {

    @Bean
    public JwtDecoder testJwtDecoder() {
        return Mockito.mock(JwtDecoder.class);
    }
}
