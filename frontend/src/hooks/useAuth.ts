import { useContext } from 'react';
import { AuthContext } from '../context/authContextDefinition';
import type { AuthContextType } from '../context/authContextDefinition';

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth debe usarse dentro de un AuthProvider');
  return context;
};
