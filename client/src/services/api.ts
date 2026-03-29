import type { Trade, TradeImage, GalleryImage, Rule, ApiResponse } from '../types';

const API_BASE = 'http://localhost:3001/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const json: ApiResponse<T> = await res.json();
  if (!json.success) {
    throw new Error(json.error || 'API request failed');
  }
  return json.data as T;
}

export const tradeApi = {
  getAll: (year?: number, month?: number): Promise<Trade[]> => {
    const params = year && month ? `?year=${year}&month=${month}` : '';
    return request<Trade[]>(`/trades${params}`);
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
    const res = await fetch(`${API_BASE}/trades/${tradeId}/images`, {
      method: 'POST',
      body: formData,
    });
    const json: ApiResponse<TradeImage[]> = await res.json();
    if (!json.success) throw new Error(json.error || 'Upload failed');
    return json.data as TradeImage[];
  },

  deleteImage: async (tradeId: string, imageId: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/trades/${tradeId}/images/${imageId}`, {
      method: 'DELETE',
    });
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
