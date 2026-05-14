package com.conarum.tradingjournal.domain.trade.mapper;

import com.conarum.tradingjournal.domain.trade.dto.TradeRequestDto;
import com.conarum.tradingjournal.domain.trade.dto.TradeResponseDto;
import com.conarum.tradingjournal.domain.trade.model.Trade;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.ReportingPolicy;

import java.util.List;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface TradeMapper {
    
    Trade toEntity(TradeRequestDto dto);
    
    void updateEntityFromDto(TradeRequestDto dto, @MappingTarget Trade entity);
    
    TradeResponseDto toDto(Trade entity);
    
    List<TradeResponseDto> toDtoList(List<Trade> entities);
}
