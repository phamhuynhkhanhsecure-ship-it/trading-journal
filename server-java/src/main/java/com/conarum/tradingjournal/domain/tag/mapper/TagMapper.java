package com.conarum.tradingjournal.domain.tag.mapper;

import com.conarum.tradingjournal.domain.tag.dto.TagRequestDto;
import com.conarum.tradingjournal.domain.tag.dto.TagResponseDto;
import com.conarum.tradingjournal.domain.tag.model.Tag;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.ReportingPolicy;

import java.util.List;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface TagMapper {
    
    Tag toEntity(TagRequestDto dto);
    
    void updateEntityFromDto(TagRequestDto dto, @MappingTarget Tag entity);
    
    TagResponseDto toDto(Tag entity);
    
    List<TagResponseDto> toDtoList(List<Tag> entities);
}
