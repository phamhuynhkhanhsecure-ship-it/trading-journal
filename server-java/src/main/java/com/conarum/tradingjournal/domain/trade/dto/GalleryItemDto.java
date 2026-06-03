package com.conarum.tradingjournal.domain.trade.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class GalleryItemDto {
    private String id;           // imageId — matches TradeImage.id on FE
    private String tradeId;
    private String tradeDate;
    private String instrument;
    private String side;
    private java.math.BigDecimal pnl;
    private String filename;
    private String originalName;
    private String caption;
    private String mimeType;
    private String driveFileId;
}
