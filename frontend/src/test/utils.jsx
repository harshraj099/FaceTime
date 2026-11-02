import { render } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { vi } from 'vitest';

import App from '@/App';
import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from '@/components/ui/toaster';

export const signedInUser = {
  id: 'user-1',
  username: 'harsh',
  email: 'harsh@example.com',
};

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

// Fake backend: routes are "METHOD /path" -> [status, body] or (requestBody) => [status, body].
// Returns the list of requests the app made.
export const mockApi = (routes = {}) => {
  const requests = [];
  const allRoutes = {
    'GET /api/auth/me': [200, signedInUser],
    'GET /api/stream/token': [200, { token: 'stream-token' }],
    ...routes,
  };

  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init = {}) => {
    const key = `${init.method ?? 'GET'} ${url}`;
    const body = init.body ? JSON.parse(init.body) : undefined;
    requests.push({ key, body, headers: init.headers });

    const route = allRoutes[key];
    if (!route) return json(500, { message: `Unmocked request ${key}` });

    const [status, responseBody] = typeof route === 'function' ? route(body) : route;
    return json(status, responseBody);
  });

  return requests;
};

const LocationDisplay = () => {
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
};

export const renderApp = (route = '/', { signedIn = true } = {}) => {
  if (signedIn) localStorage.setItem('yoom_token', 'valid-token');

  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>
        <Toaster />
        <App />
        <LocationDisplay />
      </AuthProvider>
    </MemoryRouter>,
  );
};
