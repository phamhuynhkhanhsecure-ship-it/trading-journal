package com.conarum.tradingjournal.domain.export.service;

import com.conarum.tradingjournal.domain.analytics.dto.AnalyticsResponseDto.*;
import com.conarum.tradingjournal.domain.analytics.dto.DateRangeFilterDto;
import com.conarum.tradingjournal.domain.analytics.service.AnalyticsService;
import com.conarum.tradingjournal.domain.trade.model.Trade;
import com.conarum.tradingjournal.domain.trade.repository.TradeRepository;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ExportServiceImpl implements ExportService {

    private final AnalyticsService analyticsService;
    private final TradeRepository tradeRepository;

    @Override
    public byte[] exportAnalyticsToExcel(String userEmail, DateRangeFilterDto filter) {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            
            // Gather Data
            Overview overview = analyticsService.getOverview(userEmail, filter);
            List<Trade> trades = getTrades(userEmail, filter);
            List<ByCategory> byDayOfWeek = analyticsService.getByDayOfWeek(userEmail, filter);
            List<ByCategory> byInstrument = analyticsService.getByInstrument(userEmail, filter);

            // Create Sheets
            createOverviewSheet(workbook, overview);
            createTradesSheet(workbook, trades);
            createCategorySheet(workbook, "By Day Of Week", byDayOfWeek);
            createCategorySheet(workbook, "By Instrument", byInstrument);

            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Failed to export Excel file", e);
        }
    }

    private List<Trade> getTrades(String userEmail, DateRangeFilterDto filter) {
        return tradeRepository.findTradesWithFilter(userEmail, filter);
    }

    private void createOverviewSheet(Workbook workbook, Overview overview) {
        Sheet sheet = workbook.createSheet("Overview");
        
        CellStyle headerStyle = workbook.createCellStyle();
        Font headerFont = workbook.createFont();
        headerFont.setBold(true);
        headerStyle.setFont(headerFont);

        int rowNum = 0;
        String[][] data = {
            {"Total Trades", String.valueOf(overview.getTotalTrades())},
            {"Total PnL", String.format("%.2f", overview.getTotalPnl())},
            {"Total Fees", String.format("%.2f", overview.getTotalFees())},
            {"Win Rate", String.format("%.2f%%", overview.getWinRate())},
            {"Profit Factor", String.format("%.2f", overview.getProfitFactor())},
            {"Avg RR", String.format("%.2f", overview.getAvgRR())},
            {"Max Drawdown", String.format("%.2f", overview.getMaxDrawdown())}
        };

        for (String[] rowData : data) {
            Row row = sheet.createRow(rowNum++);
            Cell labelCell = row.createCell(0);
            labelCell.setCellValue(rowData[0]);
            labelCell.setCellStyle(headerStyle);
            
            Cell valueCell = row.createCell(1);
            valueCell.setCellValue(rowData[1]);
        }
        
        sheet.autoSizeColumn(0);
        sheet.autoSizeColumn(1);
    }

    private void createTradesSheet(Workbook workbook, List<Trade> trades) {
        Sheet sheet = workbook.createSheet("Trades List");
        
        CellStyle headerStyle = workbook.createCellStyle();
        Font headerFont = workbook.createFont();
        headerFont.setBold(true);
        headerStyle.setFont(headerFont);

        Row headerRow = sheet.createRow(0);
        String[] headers = {"Date", "Instrument", "Side", "Entry Price", "Exit Price", "Quantity", "Stop Loss", "Take Profit", "PnL", "Fees", "Net PnL", "Tags", "Playbook ID", "Rating", "Notes"};
        for (int i = 0; i < headers.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(headerStyle);
        }

        int rowNum = 1;
        for (Trade t : trades) {
            Row row = sheet.createRow(rowNum++);
            row.createCell(0).setCellValue(t.getDate());
            row.createCell(1).setCellValue(t.getInstrument());
            row.createCell(2).setCellValue(t.getSide());
            row.createCell(3).setCellValue(t.getEntryPrice());
            row.createCell(4).setCellValue(t.getExitPrice());
            row.createCell(5).setCellValue(t.getQuantity());
            row.createCell(6).setCellValue(t.getStopLoss());
            row.createCell(7).setCellValue(t.getTakeProfit());
            row.createCell(8).setCellValue(t.getPnl());
            row.createCell(9).setCellValue(t.getFees());
            row.createCell(10).setCellValue(t.getPnl() - t.getFees());
            row.createCell(11).setCellValue(t.getTags() != null ? String.join(", ", t.getTags()) : "");
            row.createCell(12).setCellValue(t.getPlaybookId() != null ? t.getPlaybookId() : "");
            row.createCell(13).setCellValue(t.getRating());
            row.createCell(14).setCellValue(t.getNotes() != null ? t.getNotes() : "");
        }
    }

    private void createCategorySheet(Workbook workbook, String sheetName, List<ByCategory> data) {
        Sheet sheet = workbook.createSheet(sheetName);
        
        CellStyle headerStyle = workbook.createCellStyle();
        Font headerFont = workbook.createFont();
        headerFont.setBold(true);
        headerStyle.setFont(headerFont);

        Row headerRow = sheet.createRow(0);
        String[] headers = {"Category", "Trades", "PnL", "Win Rate (%)", "Avg PnL"};
        for (int i = 0; i < headers.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(headerStyle);
        }

        int rowNum = 1;
        for (ByCategory item : data) {
            Row row = sheet.createRow(rowNum++);
            row.createCell(0).setCellValue(item.getCategory());
            row.createCell(1).setCellValue(item.getTrades());
            row.createCell(2).setCellValue(item.getPnl());
            row.createCell(3).setCellValue(item.getWinRate());
            row.createCell(4).setCellValue(item.getAvgPnl());
        }
        
        for (int i = 0; i < headers.length; i++) {
            sheet.autoSizeColumn(i);
        }
    }
}
