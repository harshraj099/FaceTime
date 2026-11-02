import { describe, expect, it } from 'vitest';

import { ApiError, apiRequest, setAuthToken } from '@/api/client';
import { tokenProvider } from '@/api/stream';
import { mockApi } from './utils';

describe('api client', () => {
  it('sends JSON and the bearer token', async () => {
    const requests = mockApi({ 'POST /api/echo': (body) => [200, { got: body }] });
    setAuthToken('abc');

    await expect(apiRequest('/api/echo', { method: 'POST', body: { a: 1 } })).resolves.toEqual({
      got: { a: 1 },
    });
    expect(requests[0].headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer abc',
    });
  });

  it('omits the Authorization header when signed out', async () => {
    const requests = mockApi({ 'GET /api/thing': [200, {}] });
    setAuthToken(null);

    await apiRequest('/api/thing');
    expect(requests[0].headers.Authorization).toBeUndefined();
  });

  it('throws ApiError with the backend message and status', async () => {
    mockApi({ 'GET /api/fail': [409, { message: 'Nope' }] });

    const error = await apiRequest('/api/fail').catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).toBe('Nope');
    expect(error.status).toBe(409);
  });

  it('tokenProvider returns the Stream token from the backend', async () => {
    mockApi();
    await expect(tokenProvider()).resolves.toBe('stream-token');
  });
});
