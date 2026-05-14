package com.conarum.userservice.common.util;

import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import java.security.Principal;

public class SecurityUtils {
    public static String getEmailFromPrincipal(Principal principal) {
        if (principal instanceof JwtAuthenticationToken jwtAuth) {
            Object emailObj = jwtAuth.getTokenAttributes().get("email");
            if (emailObj != null) {
                return emailObj.toString();
            }
        }
        return principal != null ? principal.getName() : "system";
    }
}
