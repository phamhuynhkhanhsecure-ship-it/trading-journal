package com.conarum.tradingjournal.integration.client;

import com.conarum.tradingjournal.common.dto.ApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.List;

@FeignClient(name = "user-service")
public interface UserServiceClient {

    @PostMapping("/api/internal/users/sync")
    ApiResponse<List<String>> syncUser(@RequestBody UserSyncRequest syncRequest);
    
    record UserSyncRequest(String email, String name, String avatar) {}
}
