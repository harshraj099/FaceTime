import { apiRequest } from './client';

export const signIn = (identifier, password) =>
  apiRequest('/api/auth/sign-in', {
    method: 'POST',
    body: { identifier, password },
  });

export const signUp = (username, email, password) =>
  apiRequest('/api/auth/sign-up', {
    method: 'POST',
    body: { username, email, password },
  });

export const getCurrentUser = () => apiRequest('/api/auth/me');
