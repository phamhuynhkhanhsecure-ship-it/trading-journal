package com.conarum.userservice.domain.billing.mapper;

import com.conarum.userservice.domain.billing.dto.BillingTransactionResponseDto;
import com.conarum.userservice.domain.billing.model.BillingTransaction;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface BillingMapper {
    BillingTransactionResponseDto toDto(BillingTransaction entity);
}
