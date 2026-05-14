import type { IExportFormatter } from '../../interfaces/export.interfaces.js';
import { ExcelFormatter } from './excel.formatter.js';

/**
 * Factory for creating export formatters (OCP).
 * To add a new format (e.g. CSV, PDF), create a new class implementing
 * IExportFormatter and add a case here — no changes needed elsewhere.
 */
export function createExportFormatter(format: string): IExportFormatter {
  switch (format.toLowerCase()) {
    case 'xlsx':
    case 'excel':
      return new ExcelFormatter();
    default:
      throw new Error(`Unsupported export format: ${format}. Supported: xlsx`);
  }
}
