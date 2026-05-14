package com.conarum.tradingjournal.config;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

public class SecurityUtils {
    
    private SecurityUtils() {
        // Utility class
    }

    /**
     * Get the current authenticated user's email from the JWT token.
     * Google ID tokens typically contain the email in the "email" claim.
     */
    public static String getCurrentUserEmail() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof Jwt jwt) {
            return jwt.getClaimAsString("email");
        }
        return "anonymous"; // Fallback or throw exception
    }
}
