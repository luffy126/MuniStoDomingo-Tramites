import { createContext } from 'react';
import type {
  ConfirmacionPendiente, PerfilData, RegisterData, ResultadoLogin, User,
} from '../services/authService';

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<ResultadoLogin>;
  verificarCodigo: (desafio: string, codigo: string) => Promise<User>;
  /** Al activar devuelve el desafío a confirmar; al desactivar, null. */
  cambiarDosFactores: (activo: boolean, password: string) => Promise<ConfirmacionPendiente | null>;
  confirmarDosFactores: (desafio: string, codigo: string) => Promise<void>;
  register: (data: RegisterData) => Promise<User>;
  actualizarPerfil: (data: PerfilData) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
