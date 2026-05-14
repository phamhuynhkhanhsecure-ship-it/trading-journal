package com.conarum.tradingjournal.domain.playbook.mapper;

import com.conarum.tradingjournal.domain.playbook.dto.PlaybookRequestDto;
import com.conarum.tradingjournal.domain.playbook.dto.PlaybookResponseDto;
import com.conarum.tradingjournal.domain.playbook.model.Playbook;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.ReportingPolicy;

import java.util.List;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface PlaybookMapper {
    
    Playbook toEntity(PlaybookRequestDto dto);
    
    void updateEntityFromDto(PlaybookRequestDto dto, @MappingTarget Playbook entity);
    
    PlaybookResponseDto toDto(Playbook entity);
    
    List<PlaybookResponseDto> toDtoList(List<Playbook> entities);
}
