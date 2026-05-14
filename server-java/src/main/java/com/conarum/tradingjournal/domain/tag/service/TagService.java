package com.conarum.tradingjournal.domain.tag.service;

import com.conarum.tradingjournal.domain.tag.dto.TagRequestDto;
import com.conarum.tradingjournal.domain.tag.dto.TagResponseDto;

import java.util.List;

public interface TagService {
    List<TagResponseDto> getAllTags(String userEmail);
    TagResponseDto createTag(TagRequestDto request, String userEmail);
    TagResponseDto updateTag(String id, TagRequestDto request, String userEmail);
    void deleteTag(String id, String userEmail);
}
