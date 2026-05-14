import type {
  Trade, TradeImage, GalleryImage, Rule, ApiResponse, User,
  Tag, JournalEntry, JournalCreateInput, Playbook,
  TradeFilters, AnalyticsOverview, DayOfWeekData, InstrumentData, SideData,
  TagPerformance, PlaybookPerformance, MoodPerformance, StreakData, RiskData, RollingData,
  Group, Role
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
export const API_HOST = import.meta.env.VITE_API_HOST || 'http://localhost:8000';

/**
 * Get the display URL for a trade image.
 * Uses Google Drive proxy if driveFileId exists, otherwise falls back to local uploads.
 */
export function getImageUrl(img: { driveFileId?: string; filename: string }): string {
  if (img.driveFileId) {
    return `${API_BASE}/images/${img.driveFileId}`;
  }
  return `${API_HOST}/uploads/${img.filename}`;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('google_auth_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      ...headers,
      ...options?.headers,
    },
  });
  
  if (res.status === 401) {
    localStorage.removeItem('google_auth_token');
    window.location.reload();
  }

  if (res.status === 403) {
    throw new Error('Bạn không có quyền truy cập tài nguyên này.');
  }

  const json: ApiResponse<T> = await res.json();
  if (!json.success) {
    throw new Error(json.error || 'API request failed');
  }
  return json.data as T;
}

function buildParams(params: Record<string, string | undefined>): string {
  const filtered = Object.entries(params).filter(([, v]) => v !== undefined && v !== '');
  if (filtered.length === 0) return '';
  return '?' + filtered.map(([k, v]) => `${k}=${encodeURIComponent(v!)}`).join('&');
}

export const tradeApi = {
  getAll: (year?: number, month?: number, filters?: TradeFilters): Promise<Trade[]> => {
    const params: Record<string, string | undefined> = {
      ...(year && month ? { year: String(year), month: String(month) } : {}),
      ...filters,
    };
    return request<Trade[]>(`/trades${buildParams(params)}`);
  },

  getById: (id: string): Promise<Trade> => {
    return request<Trade>(`/trades/${id}`);
  },

  create: (trade: Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>): Promise<Trade> => {
    return request<Trade>('/trades', {
      method: 'POST',
      body: JSON.stringify(trade),
    });
  },

  update: (id: string, trade: Partial<Trade>): Promise<Trade> => {
    return request<Trade>(`/trades/${id}`, {
      method: 'PUT',
      body: JSON.stringify(trade),
    });
  },

  delete: (id: string): Promise<Trade> => {
    return request<Trade>(`/trades/${id}`, {
      method: 'DELETE',
    });
  },

  // Image endpoints
  uploadImages: async (tradeId: string, files: File[]): Promise<TradeImage[]> => {
    const formData = new FormData();
    for (const file of files) {
      formData.append('images', file);
    }
    
    const token = localStorage.getItem('google_auth_token');
    const headers: HeadersInit = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/trades/${tradeId}/images`, {
      method: 'POST',
      headers,
      body: formData,
    });
    
    if (res.status === 401) {
      localStorage.removeItem('google_auth_token');
      window.location.reload();
    }

    const json: ApiResponse<TradeImage[]> = await res.json();
    if (!json.success) throw new Error(json.error || 'Upload failed');
    return json.data as TradeImage[];
  },

  deleteImage: async (tradeId: string, imageId: string): Promise<void> => {
    const token = localStorage.getItem('google_auth_token');
    const headers: HeadersInit = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/trades/${tradeId}/images/${imageId}`, {
      method: 'DELETE',
      headers,
    });
    
    if (res.status === 401) {
      localStorage.removeItem('google_auth_token');
      window.location.reload();
    }

    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Delete failed');
  },

  getGallery: (): Promise<GalleryImage[]> => {
    return request<GalleryImage[]>('/trades/gallery/all');
  },
};

export const rulesApi = {
  getAll: (activeOnly = false): Promise<Rule[]> => {
    const params = activeOnly ? '?active=true' : '';
    return request<Rule[]>(`/rules${params}`);
  },

  create: (data: { name: string; description?: string; category?: string }): Promise<Rule> => {
    return request<Rule>('/rules', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: (id: string, data: Partial<Rule>): Promise<Rule> => {
    return request<Rule>(`/rules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: (id: string): Promise<Rule> => {
    return request<Rule>(`/rules/${id}`, {
      method: 'DELETE',
    });
  },

  reorder: (order: { id: string; sortOrder: number }[]): Promise<null> => {
    return request<null>('/rules/reorder/batch', {
      method: 'PUT',
      body: JSON.stringify({ order }),
    });
  },
};

export const journalApi = {
  getAll: (year?: number, month?: number): Promise<JournalEntry[]> => {
    const params = year && month ? `?year=${year}&month=${month}` : '';
    return request<JournalEntry[]>(`/journal${params}`);
  },

  getByDate: (date: string): Promise<JournalEntry | null> => {
    return request<JournalEntry | null>(`/journal/${date}`);
  },

  save: (data: JournalCreateInput): Promise<JournalEntry> => {
    return request<JournalEntry>('/journal', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: (date: string, data: Partial<JournalCreateInput>): Promise<JournalEntry> => {
    return request<JournalEntry>(`/journal/${date}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: (date: string): Promise<JournalEntry> => {
    return request<JournalEntry>(`/journal/${date}`, {
      method: 'DELETE',
    });
  },
};

export const tagsApi = {
  getAll: (): Promise<Tag[]> => {
    return request<Tag[]>('/tags');
  },

  getSuggestions: (): Promise<string[]> => {
    return request<string[]>('/tags/suggestions');
  },

  create: (data: { name: string; color?: string }): Promise<Tag> => {
    return request<Tag>('/tags', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: (id: string, data: { name?: string; color?: string }): Promise<Tag> => {
    return request<Tag>(`/tags/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: (id: string): Promise<Tag> => {
    return request<Tag>(`/tags/${id}`, {
      method: 'DELETE',
    });
  },
};

export const playbookApi = {
  getAll: (): Promise<Playbook[]> => {
    return request<Playbook[]>('/playbooks');
  },

  getById: (id: string): Promise<Playbook> => {
    return request<Playbook>(`/playbooks/${id}`);
  },

  create: (data: Partial<Playbook>): Promise<Playbook> => {
    return request<Playbook>('/playbooks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: (id: string, data: Partial<Playbook>): Promise<Playbook> => {
    return request<Playbook>(`/playbooks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: (id: string): Promise<Playbook> => {
    return request<Playbook>(`/playbooks/${id}`, {
      method: 'DELETE',
    });
  },
};

export const analyticsApi = {
  overview: (dateFrom?: string, dateTo?: string): Promise<AnalyticsOverview> => {
    return request<AnalyticsOverview>(`/analytics/overview${buildParams({ dateFrom, dateTo })}`);
  },
  byDayOfWeek: (dateFrom?: string, dateTo?: string): Promise<DayOfWeekData[]> => {
    return request<DayOfWeekData[]>(`/analytics/by-day-of-week${buildParams({ dateFrom, dateTo })}`);
  },
  byInstrument: (dateFrom?: string, dateTo?: string): Promise<InstrumentData[]> => {
    return request<InstrumentData[]>(`/analytics/by-instrument${buildParams({ dateFrom, dateTo })}`);
  },
  bySide: (dateFrom?: string, dateTo?: string): Promise<SideData[]> => {
    return request<SideData[]>(`/analytics/by-side${buildParams({ dateFrom, dateTo })}`);
  },
  byTag: (dateFrom?: string, dateTo?: string): Promise<TagPerformance[]> => {
    return request<TagPerformance[]>(`/analytics/by-tag${buildParams({ dateFrom, dateTo })}`);
  },
  byPlaybook: (dateFrom?: string, dateTo?: string): Promise<PlaybookPerformance[]> => {
    return request<PlaybookPerformance[]>(`/analytics/by-playbook${buildParams({ dateFrom, dateTo })}`);
  },
  byMood: (dateFrom?: string, dateTo?: string): Promise<MoodPerformance[]> => {
    return request<MoodPerformance[]>(`/analytics/by-mood${buildParams({ dateFrom, dateTo })}`);
  },
  streaks: (dateFrom?: string, dateTo?: string): Promise<StreakData> => {
    return request<StreakData>(`/analytics/streaks${buildParams({ dateFrom, dateTo })}`);
  },
  risk: (dateFrom?: string, dateTo?: string): Promise<RiskData> => {
    return request<RiskData>(`/analytics/risk${buildParams({ dateFrom, dateTo })}`);
  },
  rolling: (window = 30): Promise<RollingData[]> => {
    return request<RollingData[]>(`/analytics/rolling?window=${window}`);
  },
  exportExcel: async (dateFrom?: string, dateTo?: string): Promise<void> => {
    const token = localStorage.getItem('google_auth_token');
    const headers: HeadersInit = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const params = buildParams({ dateFrom, dateTo, format: 'xlsx' });
    const res = await fetch(`${API_BASE}/analytics/export${params}`, { headers });

    if (res.status === 401) {
      localStorage.removeItem('google_auth_token');
      window.location.reload();
      return;
    }
    if (!res.ok) throw new Error('Export failed');

    const blob = await res.blob();
    const disposition = res.headers.get('Content-Disposition') || '';
    const filenameMatch = disposition.match(/filename="?([^"]+)"?/);
    const filename = filenameMatch?.[1] || 'trading-journal-analytics.xlsx';

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};

export const aiApi = {
  chat: (messages: any[], language?: string): Promise<string> => {
    return request<string>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ messages, language }),
    });
  },
  coach: (): Promise<string> => {
    return request<string>('/ai/coach', {
      method: 'POST',
    });
  },
  vision: (imageBase64: string): Promise<any> => {
    return request<any>('/ai/vision', {
      method: 'POST',
      body: JSON.stringify({ imageBase64 }),
    });
  },
};

export const adminApi = {
  // Legacy user management
  checkAdmin: (): Promise<void> => {
    return request<void>('/v1/admin/users/me/is-admin');
  },
  getUsers: (): Promise<User[]> => {
    return request<User[]>('/v1/admin/users');
  },
  updateUserRoles: (email: string, roles: string[]): Promise<User> => {
    return request<User>(`/v1/admin/users/${email}/roles`, {
      method: 'PUT',
      body: JSON.stringify(roles),
    });
  },
  updateUserGroups: (email: string, groupIds: string[]): Promise<User> => {
    return request<User>(`/v1/admin/users/${email}/groups`, {
      method: 'PUT',
      body: JSON.stringify(groupIds),
    });
  },

  // Groups
  getGroups: (): Promise<Group[]> => {
    return request<Group[]>('/v1/admin/groups');
  },
  createGroup: (data: Partial<Group>): Promise<Group> => {
    return request<Group>('/v1/admin/groups', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  updateGroup: (id: string, data: Partial<Group>): Promise<Group> => {
    return request<Group>(`/v1/admin/groups/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  deleteGroup: (id: string): Promise<void> => {
    return request<void>(`/v1/admin/groups/${id}`, { method: 'DELETE' });
  },

  // Roles
  getRoles: (): Promise<Role[]> => {
    return request<Role[]>('/v1/admin/roles');
  },
  createRole: (data: Partial<Role>): Promise<Role> => {
    return request<Role>('/v1/admin/roles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  updateRole: (id: string, data: Partial<Role>): Promise<Role> => {
    return request<Role>(`/v1/admin/roles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  deleteRole: (id: string): Promise<void> => {
    return request<void>(`/v1/admin/roles/${id}`, { method: 'DELETE' });
  },
};

export interface AuditLog {
  id: string;
  action: string;
  performedBy: string;
  targetEntity: string;
  targetEntityId: string;
  details: string;
  timestamp: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export const auditApi = {
  getAuditLogs: (params?: { targetEntityId?: string; performedBy?: string; page?: number; size?: number }): Promise<PageResponse<AuditLog>> => {
    const p: Record<string, string> = {};
    if (params?.targetEntityId) p.targetEntityId = params.targetEntityId;
    if (params?.performedBy) p.performedBy = params.performedBy;
    if (params?.page !== undefined) p.page = params.page.toString();
    if (params?.size !== undefined) p.size = params.size.toString();
    
    return request<PageResponse<AuditLog>>(`/v1/admin/audit-logs${buildParams(p)}`);
  }
};
