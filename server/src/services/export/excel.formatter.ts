import ExcelJS from 'exceljs';
import type { IExportFormatter, AnalyticsExportData } from '../../interfaces/export.interfaces.js';

/**
 * Excel formatter — implements IExportFormatter (Strategy Pattern).
 * SRP: ONLY responsible for transforming AnalyticsExportData → Excel buffer.
 * No data fetching, no HTTP concerns.
 */
export class ExcelFormatter implements IExportFormatter {
  readonly mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  readonly fileExtension = 'xlsx';

  // ───── Color Palette ─────
  private readonly HEADER_FILL: ExcelJS.FillPattern = {
    type: 'pattern', pattern: 'solid',
    fgColor: { argb: 'FF1A1A2E' },
  };
  private readonly HEADER_FONT: Partial<ExcelJS.Font> = {
    bold: true, color: { argb: 'FFFFFFFF' }, size: 11,
  };
  private readonly PROFIT_FONT: Partial<ExcelJS.Font> = { color: { argb: 'FF2EA043' } };
  private readonly LOSS_FONT: Partial<ExcelJS.Font> = { color: { argb: 'FFDA3633' } };
  private readonly TITLE_FONT: Partial<ExcelJS.Font> = {
    bold: true, size: 14, color: { argb: 'FF58A6FF' },
  };
  private readonly BORDER_STYLE: Partial<ExcelJS.Borders> = {
    bottom: { style: 'thin', color: { argb: 'FF30363D' } },
  };

  async format(data: AnalyticsExportData): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Trading Journal';
    wb.created = new Date();

    this.buildOverviewSheet(wb, data);
    this.buildAllTradesSheet(wb, data);
    this.buildDayOfWeekSheet(wb, data);
    this.buildInstrumentSheet(wb, data);
    this.buildSideSheet(wb, data);
    this.buildTagSheet(wb, data);
    this.buildPlaybookSheet(wb, data);
    this.buildMoodSheet(wb, data);
    this.buildStreaksSheet(wb, data);
    this.buildRiskSheet(wb, data);

    const arrayBuffer = await wb.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }

  // ───── Sheet Builders ─────

  private buildOverviewSheet(wb: ExcelJS.Workbook, data: AnalyticsExportData): void {
    const ws = wb.addWorksheet('Overview', { properties: { tabColor: { argb: 'FF58A6FF' } } });
    const o = data.overview;

    // Title
    ws.mergeCells('A1:B1');
    const titleCell = ws.getCell('A1');
    titleCell.value = '📊 Trading Journal — Analytics Overview';
    titleCell.font = this.TITLE_FONT;
    ws.getRow(1).height = 30;

    // Export info
    ws.getCell('A2').value = 'Exported At:';
    ws.getCell('B2').value = data.exportedAt;
    ws.getCell('A3').value = 'Date Range:';
    ws.getCell('B3').value = this.formatDateRange(data.filter);
    ws.getRow(2).font = { italic: true, color: { argb: 'FF8B949E' } };
    ws.getRow(3).font = { italic: true, color: { argb: 'FF8B949E' } };

    // Metrics table (start from row 5)
    const metrics: [string, string | number][] = [
      ['Total Trades', o.totalTrades],
      ['Trading Days', o.tradingDays],
      ['Total PnL', o.totalPnl],
      ['Total Fees', o.totalFees],
      ['Winners', o.winners],
      ['Losers', o.losers],
      ['Breakeven', o.breakeven],
      ['Win Rate', `${o.winRate.toFixed(1)}%`],
      ['Avg Win', o.avgWin],
      ['Avg Loss', o.avgLoss],
      ['Gross Profit', o.grossProfit],
      ['Gross Loss', o.grossLoss],
      ['Profit Factor', o.profitFactor === -1 ? '∞' : o.profitFactor.toFixed(2)],
      ['Expectancy', o.expectancy],
      ['Sharpe Ratio', o.sharpeRatio === -1 ? '∞' : o.sharpeRatio.toFixed(2)],
      ['Max Drawdown', o.maxDrawdown],
      ['Current Drawdown', o.currentDrawdown],
      ['Avg R:R', o.avgRR.toFixed(2)],
    ];

    // Header
    this.addHeaderRow(ws, 5, ['Metric', 'Value']);

    metrics.forEach(([label, value], i) => {
      const row = ws.getRow(6 + i);
      row.getCell(1).value = label;
      row.getCell(2).value = value;
      row.getCell(1).font = { bold: true };
      row.border = this.BORDER_STYLE;

      // Color PnL values
      if (typeof value === 'number') {
        this.applyPnlColor(row.getCell(2), value);
        if (['Total PnL', 'Total Fees', 'Avg Win', 'Avg Loss', 'Gross Profit', 'Gross Loss',
             'Expectancy', 'Max Drawdown', 'Current Drawdown'].includes(label)) {
          row.getCell(2).numFmt = '#,##0.00';
        }
      }
    });

    ws.getColumn(1).width = 22;
    ws.getColumn(2).width = 18;
  }

  private buildAllTradesSheet(wb: ExcelJS.Workbook, data: AnalyticsExportData): void {
    const ws = wb.addWorksheet('All Trades', { properties: { tabColor: { argb: 'FF2EA043' } } });
    const headers = [
      'Date', 'Instrument', 'Side', 'Entry', 'Exit', 'Qty',
      'SL', 'TP', 'PnL', 'Fees', 'Net PnL', 'Tags', 'Rating', 'Notes',
    ];
    this.addHeaderRow(ws, 1, headers);

    data.trades.forEach((t, i) => {
      const row = ws.getRow(i + 2);
      row.values = [
        t.date, t.instrument, t.side, t.entryPrice, t.exitPrice, t.quantity,
        t.stopLoss, t.takeProfit, t.pnl, t.fees, t.netPnl, t.tags, t.rating, t.notes,
      ];
      this.applyPnlColor(row.getCell(9), t.pnl);
      this.applyPnlColor(row.getCell(11), t.netPnl);
      row.getCell(4).numFmt = '#,##0.00';
      row.getCell(5).numFmt = '#,##0.00';
      row.getCell(7).numFmt = '#,##0.00';
      row.getCell(8).numFmt = '#,##0.00';
      row.getCell(9).numFmt = '#,##0.00';
      row.getCell(10).numFmt = '#,##0.00';
      row.getCell(11).numFmt = '#,##0.00';
      row.border = this.BORDER_STYLE;
    });

    this.autoWidth(ws, headers.length);
  }

  private buildDayOfWeekSheet(wb: ExcelJS.Workbook, data: AnalyticsExportData): void {
    const ws = wb.addWorksheet('By Day of Week', { properties: { tabColor: { argb: 'FFD29922' } } });
    const headers = ['Day', 'Trades', 'PnL', 'Win Rate (%)', 'Avg PnL'];
    this.addHeaderRow(ws, 1, headers);

    data.byDayOfWeek.forEach((d, i) => {
      const row = ws.getRow(i + 2);
      row.values = [d.day, d.trades, d.pnl, d.winRate, d.avgPnl];
      this.applyPnlColor(row.getCell(3), d.pnl);
      this.applyPnlColor(row.getCell(5), d.avgPnl);
      row.getCell(3).numFmt = '#,##0.00';
      row.getCell(4).numFmt = '0.0';
      row.getCell(5).numFmt = '#,##0.00';
      row.border = this.BORDER_STYLE;
    });

    this.autoWidth(ws, headers.length);
  }

  private buildInstrumentSheet(wb: ExcelJS.Workbook, data: AnalyticsExportData): void {
    const ws = wb.addWorksheet('By Instrument', { properties: { tabColor: { argb: 'FF8957E5' } } });
    const headers = ['Instrument', 'Trades', 'PnL', 'Win Rate (%)', 'Avg PnL'];
    this.addHeaderRow(ws, 1, headers);

    data.byInstrument.forEach((d, i) => {
      const row = ws.getRow(i + 2);
      row.values = [d.instrument, d.trades, d.pnl, d.winRate, d.avgPnl];
      this.applyPnlColor(row.getCell(3), d.pnl);
      this.applyPnlColor(row.getCell(5), d.avgPnl);
      row.getCell(3).numFmt = '#,##0.00';
      row.getCell(4).numFmt = '0.0';
      row.getCell(5).numFmt = '#,##0.00';
      row.border = this.BORDER_STYLE;
    });

    this.autoWidth(ws, headers.length);
  }

  private buildSideSheet(wb: ExcelJS.Workbook, data: AnalyticsExportData): void {
    const ws = wb.addWorksheet('By Side', { properties: { tabColor: { argb: 'FF3FB950' } } });
    const headers = ['Side', 'Trades', 'PnL', 'Win Rate (%)', 'Avg PnL'];
    this.addHeaderRow(ws, 1, headers);

    data.bySide.forEach((d, i) => {
      const row = ws.getRow(i + 2);
      row.values = [d.side, d.trades, d.pnl, d.winRate, d.avgPnl];
      this.applyPnlColor(row.getCell(3), d.pnl);
      this.applyPnlColor(row.getCell(5), d.avgPnl);
      row.getCell(3).numFmt = '#,##0.00';
      row.getCell(4).numFmt = '0.0';
      row.getCell(5).numFmt = '#,##0.00';
      row.border = this.BORDER_STYLE;
    });

    this.autoWidth(ws, headers.length);
  }

  private buildTagSheet(wb: ExcelJS.Workbook, data: AnalyticsExportData): void {
    const ws = wb.addWorksheet('By Tag', { properties: { tabColor: { argb: 'FFE3B341' } } });
    const headers = ['Tag', 'Trades', 'PnL', 'Win Rate (%)', 'Avg PnL'];
    this.addHeaderRow(ws, 1, headers);

    data.byTag.forEach((d, i) => {
      const row = ws.getRow(i + 2);
      row.values = [d.tag, d.trades, d.pnl, d.winRate, d.avgPnl];
      this.applyPnlColor(row.getCell(3), d.pnl);
      this.applyPnlColor(row.getCell(5), d.avgPnl);
      row.getCell(3).numFmt = '#,##0.00';
      row.getCell(4).numFmt = '0.0';
      row.getCell(5).numFmt = '#,##0.00';
      row.border = this.BORDER_STYLE;
    });

    this.autoWidth(ws, headers.length);
  }

  private buildPlaybookSheet(wb: ExcelJS.Workbook, data: AnalyticsExportData): void {
    const ws = wb.addWorksheet('By Playbook', { properties: { tabColor: { argb: 'FFBC8CFF' } } });
    const headers = ['Playbook', 'Trades', 'PnL', 'Win Rate (%)', 'Avg PnL'];
    this.addHeaderRow(ws, 1, headers);

    data.byPlaybook.forEach((d, i) => {
      const row = ws.getRow(i + 2);
      row.values = [d.name, d.trades, d.pnl, d.winRate, d.avgPnl];
      this.applyPnlColor(row.getCell(3), d.pnl);
      this.applyPnlColor(row.getCell(5), d.avgPnl);
      row.getCell(3).numFmt = '#,##0.00';
      row.getCell(4).numFmt = '0.0';
      row.getCell(5).numFmt = '#,##0.00';
      row.border = this.BORDER_STYLE;
    });

    this.autoWidth(ws, headers.length);
  }

  private buildMoodSheet(wb: ExcelJS.Workbook, data: AnalyticsExportData): void {
    const ws = wb.addWorksheet('By Mood', { properties: { tabColor: { argb: 'FFF778BA' } } });
    const headers = ['Mood', 'Days', 'Total PnL', 'Avg PnL/Day', 'Total Trades', 'Win Rate (%)'];
    this.addHeaderRow(ws, 1, headers);

    data.byMood.forEach((d, i) => {
      const row = ws.getRow(i + 2);
      row.values = [d.mood, d.days, d.totalPnl, d.avgPnlPerDay, d.totalTrades, d.winRate];
      this.applyPnlColor(row.getCell(3), d.totalPnl);
      this.applyPnlColor(row.getCell(4), d.avgPnlPerDay);
      row.getCell(3).numFmt = '#,##0.00';
      row.getCell(4).numFmt = '#,##0.00';
      row.getCell(6).numFmt = '0.0';
      row.border = this.BORDER_STYLE;
    });

    this.autoWidth(ws, headers.length);
  }

  private buildStreaksSheet(wb: ExcelJS.Workbook, data: AnalyticsExportData): void {
    const ws = wb.addWorksheet('Streaks & Heatmap', { properties: { tabColor: { argb: 'FFDB6D28' } } });
    const s = data.streaks;

    // Streak summary
    this.addHeaderRow(ws, 1, ['Streak Metric', 'Value']);
    const streakMetrics: [string, number][] = [
      ['Current Streak', s.currentStreak],
      ['Max Win Streak', s.maxWinStreak],
      ['Max Loss Streak', s.maxLossStreak],
    ];
    streakMetrics.forEach(([label, value], i) => {
      const row = ws.getRow(i + 2);
      row.values = [label, value];
      row.getCell(1).font = { bold: true };
      this.applyPnlColor(row.getCell(2), value);
      row.border = this.BORDER_STYLE;
    });

    // Heatmap from row 7
    const heatmapStart = 7;
    ws.getCell(`A${heatmapStart - 1}`).value = 'Daily PnL Heatmap';
    ws.getCell(`A${heatmapStart - 1}`).font = { bold: true, size: 12 };
    this.addHeaderRow(ws, heatmapStart, ['Date', 'PnL']);

    s.heatmap.forEach((h, i) => {
      const row = ws.getRow(heatmapStart + 1 + i);
      row.values = [h.date, h.pnl];
      this.applyPnlColor(row.getCell(2), h.pnl);
      row.getCell(2).numFmt = '#,##0.00';
      row.border = this.BORDER_STYLE;
    });

    // Compliance after heatmap
    if (s.compliance.length > 0) {
      const compStart = heatmapStart + 2 + s.heatmap.length;
      ws.getCell(`A${compStart - 1}`).value = 'Rule Compliance';
      ws.getCell(`A${compStart - 1}`).font = { bold: true, size: 12 };
      this.addHeaderRow(ws, compStart, ['Date', 'Score (%)']);

      s.compliance.forEach((c, i) => {
        const row = ws.getRow(compStart + 1 + i);
        row.values = [c.date, c.score];
        row.getCell(2).numFmt = '0';
        row.border = this.BORDER_STYLE;
      });
    }

    ws.getColumn(1).width = 16;
    ws.getColumn(2).width = 14;
  }

  private buildRiskSheet(wb: ExcelJS.Workbook, data: AnalyticsExportData): void {
    const ws = wb.addWorksheet('Risk Analysis', { properties: { tabColor: { argb: 'FFDA3633' } } });
    const r = data.risk;

    // Summary
    this.addHeaderRow(ws, 1, ['Risk Metric', 'Value']);
    const riskMetrics: [string, string | number][] = [
      ['Trades with SL', r.tradesWithSL],
      ['Trades with TP', r.tradesWithTP],
      ['Avg R:R', r.avgRR.toFixed(2)],
      ['TP Hit Rate', `${r.tpHitRate.toFixed(1)}%`],
      ['SL Hit Rate', `${r.slHitRate.toFixed(1)}%`],
    ];
    riskMetrics.forEach(([label, value], i) => {
      const row = ws.getRow(i + 2);
      row.values = [label, value];
      row.getCell(1).font = { bold: true };
      row.border = this.BORDER_STYLE;
    });

    // R:R Detail from row 9
    const rrStart = 9;
    ws.getCell(`A${rrStart - 1}`).value = 'R:R Detail per Trade';
    ws.getCell(`A${rrStart - 1}`).font = { bold: true, size: 12 };
    const rrHeaders = ['Date', 'Instrument', 'Side', 'Risk (Pips)', 'Actual R:R', 'Planned R:R', 'PnL', 'Hit TP', 'Hit SL'];
    this.addHeaderRow(ws, rrStart, rrHeaders);

    r.rrData.forEach((d, i) => {
      const row = ws.getRow(rrStart + 1 + i);
      row.values = [
        d.date, d.instrument, d.side, d.riskPips,
        d.actualRR, d.plannedRR, d.pnl,
        d.hitTP ? 'Yes' : 'No', d.hitSL ? 'Yes' : 'No',
      ];
      this.applyPnlColor(row.getCell(7), d.pnl);
      row.getCell(4).numFmt = '#,##0.00';
      row.getCell(5).numFmt = '0.00';
      row.getCell(6).numFmt = '0.00';
      row.getCell(7).numFmt = '#,##0.00';
      row.border = this.BORDER_STYLE;
    });

    // Drawdown curve
    if (r.drawdownCurve.length > 0) {
      const ddStart = rrStart + 2 + r.rrData.length;
      ws.getCell(`A${ddStart - 1}`).value = 'Drawdown Curve';
      ws.getCell(`A${ddStart - 1}`).font = { bold: true, size: 12 };
      this.addHeaderRow(ws, ddStart, ['Date', 'Cum. PnL', 'Drawdown', 'Peak']);

      r.drawdownCurve.forEach((d, i) => {
        const row = ws.getRow(ddStart + 1 + i);
        row.values = [d.date, d.cumPnl, d.drawdown, d.peak];
        this.applyPnlColor(row.getCell(2), d.cumPnl);
        row.getCell(2).numFmt = '#,##0.00';
        row.getCell(3).numFmt = '#,##0.00';
        row.getCell(4).numFmt = '#,##0.00';
        row.border = this.BORDER_STYLE;
      });
    }

    this.autoWidth(ws, 9);
  }

  // ───── Shared Helpers ─────

  private addHeaderRow(ws: ExcelJS.Worksheet, rowNumber: number, headers: string[]): void {
    const row = ws.getRow(rowNumber);
    row.values = headers;
    row.eachCell((cell) => {
      cell.fill = this.HEADER_FILL;
      cell.font = this.HEADER_FONT;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    row.height = 24;
  }

  private applyPnlColor(cell: ExcelJS.Cell, value: number): void {
    if (value > 0) cell.font = { ...cell.font, ...this.PROFIT_FONT };
    else if (value < 0) cell.font = { ...cell.font, ...this.LOSS_FONT };
  }

  private autoWidth(ws: ExcelJS.Worksheet, colCount: number): void {
    for (let i = 1; i <= colCount; i++) {
      const col = ws.getColumn(i);
      let maxLen = 10;
      col.eachCell({ includeEmpty: false }, (cell) => {
        const len = String(cell.value ?? '').length;
        if (len > maxLen) maxLen = len;
      });
      col.width = Math.min(maxLen + 4, 40);
    }
  }

  private formatDateRange(filter: { dateFrom?: string; dateTo?: string }): string {
    if (filter.dateFrom && filter.dateTo) return `${filter.dateFrom} → ${filter.dateTo}`;
    if (filter.dateFrom) return `From ${filter.dateFrom}`;
    if (filter.dateTo) return `Until ${filter.dateTo}`;
    return 'All time';
  }
}
