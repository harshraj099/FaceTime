import { apiRequest } from './client';

// Stream tokens are minted by the backend with the Stream API secret
export const tokenProvider = async () => {
  const { token } = await apiRequest('/api/stream/token');

  return token;
};
