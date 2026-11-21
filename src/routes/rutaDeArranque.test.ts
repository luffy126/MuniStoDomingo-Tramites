import { describe, expect, it } from 'vitest';
import { rutaDeArranque } from './rutaDeArranque';
import type { User } from '../services/authService';

const vecino = { id: '1', nombre: 'V', email: 'v@x.cl', rol: 'vecino' } as User;
const funcionario = { id: '2', nombre: 'F', email: 'f@x.cl', rol: 'funcionario' } as User;

describe('rutaDeArranque', () => {
  it('la raíz va al inicio del rol o al login', () => {
    expect(rutaDeArranque('/', vecino)).toBe('/vecino/dashboard');
    expect(rutaDeArranque('/', funcionario)).toBe('/funcionario/solicitudes');
    expect(rutaDeArranque('/', null)).toBe('/login');
  });

  it('las páginas reales no redirigen', () => {
    expect(rutaDeArranque('/vecino/dashboard', vecino)).toBeNull();
    expect(rutaDeArranque('/vecino/tramite/7', vecino)).toBeNull();
    expect(rutaDeArranque('/funcionario/solicitud/3', funcionario)).toBeNull();
    expect(rutaDeArranque('/login', null)).toBeNull();
    expect(rutaDeArranque('/register', null)).toBeNull();
    expect(rutaDeArranque('/recuperar-password', null)).toBeNull();
    expect(rutaDeArranque('/recuperar-password', vecino)).toBeNull();
    expect(rutaDeArranque('/terminos', null)).toBeNull();
    expect(rutaDeArranque('/vecino/mis-tramites/STD-2026-000001', vecino)).toBeNull();
  });

  it('sin sesión, un área privada va al login', () => {
    expect(rutaDeArranque('/vecino/perfil', null)).toBe('/login');
    expect(rutaDeArranque('/funcionario/reportes', null)).toBe('/login');
  });

  it('con el rol equivocado va al inicio del rol propio', () => {
    expect(rutaDeArranque('/funcionario/reportes', vecino)).toBe('/vecino/dashboard');
    expect(rutaDeArranque('/vecino/dashboard', funcionario)).toBe('/funcionario/solicitudes');
  });

  it('con sesión, login y registro van al inicio', () => {
    expect(rutaDeArranque('/login', vecino)).toBe('/vecino/dashboard');
  });

  it('rutas desconocidas o incompletas van a la principal', () => {
    expect(rutaDeArranque('/vecino', vecino)).toBe('/vecino/dashboard');
    expect(rutaDeArranque('/vecino/nada', vecino)).toBe('/vecino/dashboard');
    expect(rutaDeArranque('/vecinoX', vecino)).toBe('/vecino/dashboard');
    expect(rutaDeArranque('/otra', null)).toBe('/login');
  });

  it('quita la barra final', () => {
    expect(rutaDeArranque('/vecino/perfil/', vecino)).toBe('/vecino/perfil');
  });
});
