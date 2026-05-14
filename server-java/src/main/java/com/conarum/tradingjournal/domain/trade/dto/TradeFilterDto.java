package com.conarum.tradingjournal.domain.trade.dto;

import lombok.Getter;
import lombok.Setter;

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
    private Double pnlMin;
    private Double pnlMax;
    private String search;
    private String playbookId;
    private Integer rating;
}
