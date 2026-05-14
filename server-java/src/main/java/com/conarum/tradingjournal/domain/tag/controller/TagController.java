package com.conarum.tradingjournal.domain.tag.controller;

import com.conarum.tradingjournal.common.dto.ApiResponse;
import com.conarum.tradingjournal.config.SecurityUtils;
import com.conarum.tradingjournal.domain.tag.dto.TagRequestDto;
import com.conarum.tradingjournal.domain.tag.dto.TagResponseDto;
import com.conarum.tradingjournal.domain.tag.service.TagService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tags")
@RequiredArgsConstructor
public class TagController {

    private final TagService tagService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<TagResponseDto>>> getAllTags() {
        String userEmail = SecurityUtils.getCurrentUserEmail();
        List<TagResponseDto> tags = tagService.getAllTags(userEmail);
        return ResponseEntity.ok(ApiResponse.success(tags));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<TagResponseDto>> createTag(@Valid @RequestBody TagRequestDto request) {
        String userEmail = SecurityUtils.getCurrentUserEmail();
        TagResponseDto tag = tagService.createTag(request, userEmail);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(tag));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<TagResponseDto>> updateTag(
            @PathVariable String id, 
            @Valid @RequestBody TagRequestDto request) {
        String userEmail = SecurityUtils.getCurrentUserEmail();
        TagResponseDto tag = tagService.updateTag(id, request, userEmail);
        return ResponseEntity.ok(ApiResponse.success(tag));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteTag(@PathVariable String id) {
        String userEmail = SecurityUtils.getCurrentUserEmail();
        tagService.deleteTag(id, userEmail);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
