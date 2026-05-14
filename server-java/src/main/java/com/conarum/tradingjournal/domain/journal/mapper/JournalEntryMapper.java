package com.conarum.tradingjournal.domain.journal.mapper;

import com.conarum.tradingjournal.domain.journal.dto.JournalEntryRequestDto;
import com.conarum.tradingjournal.domain.journal.dto.JournalEntryResponseDto;
import com.conarum.tradingjournal.domain.journal.model.JournalEntry;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.ReportingPolicy;

import java.util.List;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface JournalEntryMapper {
    
    JournalEntry toEntity(JournalEntryRequestDto dto);
    
    void updateEntityFromDto(JournalEntryRequestDto dto, @MappingTarget JournalEntry entity);
    
    JournalEntryResponseDto toDto(JournalEntry entity);
    
    List<JournalEntryResponseDto> toDtoList(List<JournalEntry> entities);
}
