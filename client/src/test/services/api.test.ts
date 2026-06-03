import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { tradeApi, getImageUrl } from '../../services/api';

// ===== Mock fetch globally =====
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// ===== Mock localStorage =====
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
vi.stubGlobal('localStorage', localStorageMock);

// ===== Helpers =====
function mockApiResponse<T>(data: T, success = true) {
  mockFetch.mockResolvedValueOnce({
    status: 200,
    json: async () => ({ success, data, error: null }),
  });
}

function mockApiError(errorMessage: string) {
  mockFetch.mockResolvedValueOnce({
    status: 200,
    json: async () => ({ success: false, data: null, error: errorMessage }),
  });
}

describe('api.ts — tradeApi', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    localStorage.clear();
  });

  // ===== getImageUrl =====
  describe('getImageUrl', () => {
    it('should return Google Drive proxy URL when driveFileId exists', () => {
      const url = getImageUrl({ driveFileId: 'abc123', filename: 'test.png' });
      expect(url).toContain('/images/abc123');
    });

    it('should return local upload URL when no driveFileId', () => {
      const url = getImageUrl({ filename: 'test.png' });
      expect(url).toContain('/uploads/test.png');
    });
  });

  // ===== tradeApi.getAll =====
  describe('tradeApi.getAll', () => {
    it('should call GET /trades and return data', async () => {
      const trades = [{ id: 'trade-001', instrument: 'BTCUSDT' }];
      mockApiResponse(trades);

      const result = await tradeApi.getAll();

      expect(mockFetch).toHaveBeenCalledOnce();
      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('/trades');
      expect(result).toEqual(trades);
    });

    it('should append year and month as query params', async () => {
      mockApiResponse([]);

      await tradeApi.getAll(2024, 1);

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('year=2024');
      expect(url).toContain('month=1');
    });

    it('should include Authorization header when token exists', async () => {
      localStorage.setItem('google_auth_token', 'my-token');
      mockApiResponse([]);

      await tradeApi.getAll();

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers['Authorization']).toBe('Bearer my-token');
    });

    it('should throw when API returns success: false', async () => {
      mockApiError('Unauthorized');

      await expect(tradeApi.getAll()).rejects.toThrow('Unauthorized');
    });
  });

  // ===== tradeApi.getById =====
  describe('tradeApi.getById', () => {
    it('should call GET /trades/:id', async () => {
      const trade = { id: 'trade-001', instrument: 'ETHUSDT' };
      mockApiResponse(trade);

      const result = await tradeApi.getById('trade-001');

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('/trades/trade-001');
      expect(result).toEqual(trade);
    });
  });

  // ===== tradeApi.create =====
  describe('tradeApi.create', () => {
    it('should call POST /trades with correct body', async () => {
      const newTrade = { instrument: 'BTCUSDT', side: 'LONG', pnl: 500 };
      mockApiResponse({ id: 'trade-new', ...newTrade });

      await tradeApi.create(newTrade as any);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/trades');
      expect(options.method).toBe('POST');
      expect(JSON.parse(options.body)).toMatchObject(newTrade);
    });
  });

  // ===== tradeApi.update =====
  describe('tradeApi.update', () => {
    it('should call PUT /trades/:id', async () => {
      mockApiResponse({ id: 'trade-001' });

      await tradeApi.update('trade-001', { instrument: 'SOLUSDT' } as any);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/trades/trade-001');
      expect(options.method).toBe('PUT');
    });
  });

  // ===== tradeApi.delete =====
  describe('tradeApi.delete', () => {
    it('should call DELETE /trades/:id', async () => {
      mockApiResponse(null);

      await tradeApi.delete('trade-001');

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/trades/trade-001');
      expect(options.method).toBe('DELETE');
    });
  });

  // ===== 401 handling =====
  describe('401 handling', () => {
    it('should remove token and reload on 401', async () => {
      localStorage.setItem('google_auth_token', 'expired-token');
      const reloadMock = vi.fn();
      vi.stubGlobal('location', { reload: reloadMock });

      mockFetch.mockResolvedValueOnce({
        status: 401,
        json: async () => ({ success: false, data: null }),
      });

      // Trigger call — won't throw but will reload
      try { await tradeApi.getAll(); } catch (_) { /* expected */ }

      expect(localStorage.getItem('google_auth_token')).toBeNull();
    });
  });

  // ===== 403 handling =====
  describe('403 handling', () => {
    it('should throw permission error on 403', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 403,
        json: async () => ({}),
      });

      await expect(tradeApi.getAll()).rejects.toThrow('Bạn không có quyền truy cập tài nguyên này.');
    });
  });
});
