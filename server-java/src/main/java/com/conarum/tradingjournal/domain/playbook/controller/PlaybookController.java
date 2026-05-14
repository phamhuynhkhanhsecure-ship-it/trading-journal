package com.conarum.tradingjournal.domain.playbook.controller;

import com.conarum.tradingjournal.common.dto.ApiResponse;
import com.conarum.tradingjournal.config.SecurityUtils;
import com.conarum.tradingjournal.domain.playbook.dto.PlaybookRequestDto;
import com.conarum.tradingjournal.domain.playbook.dto.PlaybookResponseDto;
import com.conarum.tradingjournal.domain.playbook.service.PlaybookService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/playbooks")
@RequiredArgsConstructor
public class PlaybookController {

    private final PlaybookService playbookService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<PlaybookResponseDto>>> getAllPlaybooks() {
        String userEmail = SecurityUtils.getCurrentUserEmail();
        List<PlaybookResponseDto> playbooks = playbookService.getAllPlaybooks(userEmail);
        return ResponseEntity.ok(ApiResponse.success(playbooks));
    }

    @GetMapping("/active")
    public ResponseEntity<ApiResponse<List<PlaybookResponseDto>>> getActivePlaybooks() {
        String userEmail = SecurityUtils.getCurrentUserEmail();
        List<PlaybookResponseDto> playbooks = playbookService.getActivePlaybooks(userEmail);
        return ResponseEntity.ok(ApiResponse.success(playbooks));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PlaybookResponseDto>> getPlaybookById(@PathVariable String id) {
        String userEmail = SecurityUtils.getCurrentUserEmail();
        PlaybookResponseDto playbook = playbookService.getPlaybookById(id, userEmail);
        return ResponseEntity.ok(ApiResponse.success(playbook));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<PlaybookResponseDto>> createPlaybook(@Valid @RequestBody PlaybookRequestDto request) {
        String userEmail = SecurityUtils.getCurrentUserEmail();
        PlaybookResponseDto playbook = playbookService.createPlaybook(request, userEmail);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(playbook));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<PlaybookResponseDto>> updatePlaybook(
            @PathVariable String id, 
            @Valid @RequestBody PlaybookRequestDto request) {
        String userEmail = SecurityUtils.getCurrentUserEmail();
        PlaybookResponseDto playbook = playbookService.updatePlaybook(id, request, userEmail);
        return ResponseEntity.ok(ApiResponse.success(playbook));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deletePlaybook(@PathVariable String id) {
        String userEmail = SecurityUtils.getCurrentUserEmail();
        playbookService.deletePlaybook(id, userEmail);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
