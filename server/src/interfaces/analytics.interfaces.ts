import type { DateRangeFilter } from '../types.js';

/** Contract for analytics business logic. */
export interface IAnalyticsService {
  getOverview(userEmail: string, filter: DateRangeFilter): Promise<any>;
  getByDayOfWeek(userEmail: string, filter: DateRangeFilter): Promise<any[]>;
  getByInstrument(userEmail: string, filter: DateRangeFilter): Promise<any[]>;
  getBySide(userEmail: string, filter: DateRangeFilter): Promise<any[]>;
  getByTag(userEmail: string, filter: DateRangeFilter): Promise<any[]>;
  getByPlaybook(userEmail: string, filter: DateRangeFilter): Promise<any[]>;
  getStreaks(userEmail: string, filter: DateRangeFilter): Promise<any>;
  getRisk(userEmail: string, filter: DateRangeFilter): Promise<any>;
  getByMood(userEmail: string, filter: DateRangeFilter): Promise<any[]>;
  getRolling(userEmail: string, window: number): Promise<any[]>;
}
