package com.conarum.tradingjournal.domain.trade.dto;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class TradeFilterDto {
    private Integer year;
    private Integer month;
    private String instrument;
    private String side;
    private String tag;
    private String dateFrom;
    private String dateTo;
    private BigDecimal pnlMin;
    private BigDecimal pnlMax;
    private String search;
    private String playbookId;
    private Integer rating;
}
