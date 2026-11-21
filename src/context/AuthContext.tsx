import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  actualizarPerfilRequest,
  limpiarSesion,
  loginRequest,
  verificarCodigoRequest,
  cambiarDosFactoresRequest,
  confirmarDosFactoresRequest,
  recuperarSesion,
  registerRequest,
} from '../services/authService';
import { UNAUTHORIZED_EVENT } from '../services/apiClient';
import type {
  ConfirmacionPendiente, PerfilData, RegisterData, ResultadoLogin, User,
} from '../services/authService';
import { AuthContext } from './authContextDefinition';
import type { AuthContextType } from './authContextDefinition';

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

  const login = useCallback(async (email: string, password: string): Promise<ResultadoLogin> => {
    const resultado = await loginRequest(email, password);
    if (resultado.tipo === 'sesion') setUser(resultado.user);
    return resultado;
  }, []);

  const verificarCodigo = useCallback(async (desafio: string, codigo: string): Promise<User> => {
    const signedInUser = await verificarCodigoRequest(desafio, codigo);
    setUser(signedInUser);
    return signedInUser;
  }, []);

  const cambiarDosFactores = useCallback(
    async (activo: boolean, password: string): Promise<ConfirmacionPendiente | null> => {
      const resultado = await cambiarDosFactoresRequest(activo, password);
      if ('user' in resultado) {
        setUser(resultado.user);
        return null;
      }
      return resultado;
    },
    [],
  );

  const confirmarDosFactores = useCallback(async (desafio: string, codigo: string): Promise<void> => {
    setUser(await confirmarDosFactoresRequest(desafio, codigo));
  }, []);

  const register = useCallback(async (data: RegisterData): Promise<User> => {
    const createdUser = await registerRequest(data);
    setUser(createdUser);
    return createdUser;
  }, []);

  const actualizarPerfil = useCallback(async (data: PerfilData): Promise<void> => {
    setUser(await actualizarPerfilRequest(data));
  }, []);

  const logout = useCallback((): void => {
    limpiarSesion();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user, isAuthenticated: user !== null, isLoading, login, verificarCodigo, cambiarDosFactores, confirmarDosFactores,
      register, actualizarPerfil, logout,
    }),
    [user, isLoading, login, verificarCodigo, cambiarDosFactores, confirmarDosFactores, register, actualizarPerfil, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
