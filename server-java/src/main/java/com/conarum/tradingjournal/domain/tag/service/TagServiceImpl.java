package com.conarum.tradingjournal.domain.tag.service;

import com.conarum.tradingjournal.common.exception.ResourceNotFoundException;
import com.conarum.tradingjournal.domain.tag.dto.TagRequestDto;
import com.conarum.tradingjournal.domain.tag.dto.TagResponseDto;
import com.conarum.tradingjournal.domain.tag.mapper.TagMapper;
import com.conarum.tradingjournal.domain.tag.model.Tag;
import com.conarum.tradingjournal.domain.tag.repository.TagRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class TagServiceImpl implements TagService {

    private final TagRepository tagRepository;
    private final TagMapper tagMapper;

    @Override
    public List<TagResponseDto> getAllTags(String userEmail) {
        return tagMapper.toDtoList(tagRepository.findByUserEmailOrderByNameAsc(userEmail));
    }

    @Override
    public TagResponseDto createTag(TagRequestDto request, String userEmail) {
        // Prevent duplicate tags for same user
        Optional<Tag> existing = tagRepository.findByNameAndUserEmail(request.getName(), userEmail);
        if (existing.isPresent()) {
            throw new IllegalArgumentException("Tag with name '" + request.getName() + "' already exists");
        }

        Tag tag = tagMapper.toEntity(request);
        tag.setUserEmail(userEmail);
        tag.prePersist();
        
        Tag savedTag = tagRepository.save(tag);
        return tagMapper.toDto(savedTag);
    }

    @Override
    public TagResponseDto updateTag(String id, TagRequestDto request, String userEmail) {
        Tag tag = tagRepository.findById(id)
                .filter(t -> t.getUserEmail().equals(userEmail))
                .orElseThrow(() -> new ResourceNotFoundException("Tag", "id", id));
                
        // Check for duplicate name if name changed
        if (!tag.getName().equals(request.getName())) {
            Optional<Tag> existing = tagRepository.findByNameAndUserEmail(request.getName(), userEmail);
            if (existing.isPresent()) {
                throw new IllegalArgumentException("Tag with name '" + request.getName() + "' already exists");
            }
        }
                
        tagMapper.updateEntityFromDto(request, tag);
        tag.preUpdate();
        
        Tag updatedTag = tagRepository.save(tag);
        return tagMapper.toDto(updatedTag);
    }

    @Override
    public void deleteTag(String id, String userEmail) {
        Tag tag = tagRepository.findById(id)
                .filter(t -> t.getUserEmail().equals(userEmail))
                .orElseThrow(() -> new ResourceNotFoundException("Tag", "id", id));
                
        tagRepository.delete(tag);
    }
}
