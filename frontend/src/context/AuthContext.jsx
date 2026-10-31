import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import * as authApi from '@/api/auth';
import { getAuthToken, setAuthToken } from '@/api/client';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!getAuthToken()) {
      setIsLoaded(true);
      return;
    }

    authApi
      .getCurrentUser()
      .then(setUser)
      .catch(() => setAuthToken(null))
      .finally(() => setIsLoaded(true));
  }, []);

  const signIn = useCallback(async (identifier, password) => {
    const { token, user } = await authApi.signIn(identifier, password);
    setAuthToken(token);
    setUser(user);
  }, []);

  const signUp = useCallback(async (username, email, password) => {
    const { token, user } = await authApi.signUp(username, email, password);
    setAuthToken(token);
    setUser(user);
  }, []);

  const signOut = useCallback(() => {
    setAuthToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoaded, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(AuthContext);

  if (!context) throw new Error('useUser must be used within an AuthProvider');

  return context;
};
