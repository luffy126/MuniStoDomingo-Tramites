import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  guardarSesion,
  limpiarSesion,
  loginRequest,
  recuperarSesion,
  registerRequest,
} from '../services/authService';
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
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    setUser(recuperarSesion());
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    const encontrado = await loginRequest(email, password);
    if (encontrado === null) {
      return false;
    }
    guardarSesion(encontrado);
    setUser(encontrado);
    return true;
  }, []);

  const register = useCallback(async (data: RegisterData): Promise<boolean> => {
    const creado = await registerRequest(data);
    if (creado === null) {
      return false;
    }
    guardarSesion(creado);
    setUser(creado);
    return true;
  }, []);

  const logout = useCallback((): void => {
    limpiarSesion();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({ user, isAuthenticated: user !== null, isLoading, login, register, logout }),
    [user, isLoading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const contexto = useContext(AuthContext);
  if (contexto === undefined) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return contexto;
};
