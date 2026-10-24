import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  limpiarSesion,
  loginRequest,
  recuperarSesion,
  registerRequest,
} from '../services/authService';
import { UNAUTHORIZED_EVENT } from '../services/apiClient';
import type { RegisterData, User } from '../services/authService';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (data: RegisterData) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const restore = async (): Promise<void> => {
      try {
        const restoredUser = await recuperarSesion();
        if (!cancelled) setUser(restoredUser);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    const handleUnauthorized = (): void => setUser(null);
    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    void restore();
    return () => {
      cancelled = true;
      window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    };
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    const signedInUser = await loginRequest(email, password);
    setUser(signedInUser);
    return true;
  }, []);

  const register = useCallback(async (data: RegisterData): Promise<boolean> => {
    const createdUser = await registerRequest(data);
    setUser(createdUser);
    return true;
  }, []);

  const logout = useCallback((): void => {
    limpiarSesion();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({ user, isAuthenticated: user !== null, isLoading, login, register, logout }),
    [user, isLoading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth debe usarse dentro de un AuthProvider');
  return context;
};
