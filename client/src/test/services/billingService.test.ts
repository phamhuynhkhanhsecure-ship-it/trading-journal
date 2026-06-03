import { describe, it, expect, vi, beforeEach } from 'vitest';
import { billingApi } from '../../services/billingService';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('billingService — billingApi', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('should call POST /purchase-premium with Authorization header', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { id: 'txn-001' } }),
    });

    const result = await billingApi.purchasePremium('my-token');

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain('/purchase-premium');
    expect(options.method).toBe('POST');
    expect(options.headers['Authorization']).toBe('Bearer my-token');
    expect(result).toEqual({ success: true, data: { id: 'txn-001' } });
  });

  it('should throw when response is not ok', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    });

    await expect(billingApi.purchasePremium('bad-token')).rejects.toThrow('Payment failed');
  });

  it('should send Content-Type: application/json', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    await billingApi.purchasePremium('token');

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers['Content-Type']).toBe('application/json');
  });
});
