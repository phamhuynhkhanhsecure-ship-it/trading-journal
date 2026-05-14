package com.conarum.tradingjournal.domain.rule.mapper;

import com.conarum.tradingjournal.domain.rule.dto.RuleRequestDto;
import com.conarum.tradingjournal.domain.rule.dto.RuleResponseDto;
import com.conarum.tradingjournal.domain.rule.model.Rule;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.ReportingPolicy;

import java.util.List;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface RuleMapper {
    
    Rule toEntity(RuleRequestDto dto);
    
    void updateEntityFromDto(RuleRequestDto dto, @MappingTarget Rule entity);
    
    RuleResponseDto toDto(Rule entity);
    
    List<RuleResponseDto> toDtoList(List<Rule> entities);
}
