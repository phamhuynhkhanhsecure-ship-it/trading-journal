package com.conarum.tradingjournal.domain.trade.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class GalleryItemDto {
    private String tradeId;
    private String date;
    private String instrument;
    private java.math.BigDecimal pnl;
    private String imageId;
    private String filename;
    private String caption;
    private String mimeType;
    private String driveFileId;
}
