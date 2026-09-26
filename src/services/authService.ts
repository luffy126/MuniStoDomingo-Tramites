export type Rol = 'vecino' | 'funcionario';

export interface User {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
}

export interface RegisterData {
  nombre: string;
  email: string;
  password: string;
  rol?: Rol;
}

interface StoredUser extends User {
  password: string;
}

const STORAGE_KEY = 'munisd.sesion';
const LATENCIA_MS = 400;

const usuarios: StoredUser[] = [
  {
    id: 'u-1',
    nombre: 'Vecino Demo',
    email: 'vecino@test.com',
    password: 'Test1234',
    rol: 'vecino',
  },
  {
    id: 'u-2',
    nombre: 'Funcionario Demo',
    email: 'funcionario@test.com',
    password: 'Test1234',
    rol: 'funcionario',
  },
];

const esperar = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const sinPassword = (usuario: StoredUser): User => ({
  id: usuario.id,
  nombre: usuario.nombre,
  email: usuario.email,
  rol: usuario.rol,
});

export const loginRequest = async (email: string, password: string): Promise<User | null> => {
  await esperar(LATENCIA_MS);
  const encontrado = usuarios.find(
    (usuario) => usuario.email.toLowerCase() === email.trim().toLowerCase() && usuario.password === password
  );
  return encontrado ? sinPassword(encontrado) : null;
};

export const registerRequest = async (datos: RegisterData): Promise<User | null> => {
  await esperar(LATENCIA_MS);
  const email = datos.email.trim().toLowerCase();
  const yaExiste = usuarios.some((usuario) => usuario.email.toLowerCase() === email);
  if (yaExiste) {
    return null;
  }
  const nuevo: StoredUser = {
    id: `u-${usuarios.length + 1}`,
    nombre: datos.nombre.trim(),
    email,
    password: datos.password,
    rol: datos.rol ?? 'vecino',
  };
  usuarios.push(nuevo);
  return sinPassword(nuevo);
};

/** el almacenamiento puede no existir */
const getAlmacenamiento = (): Storage | null => {
  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
};

export const guardarSesion = (user: User): void => {
  getAlmacenamiento()?.setItem(STORAGE_KEY, JSON.stringify(user));
};

export const limpiarSesion = (): void => {
  getAlmacenamiento()?.removeItem(STORAGE_KEY);
};

export const recuperarSesion = (): User | null => {
  const guardado = getAlmacenamiento()?.getItem(STORAGE_KEY);
  if (guardado === undefined || guardado === null) {
    return null;
  }
  try {
    return JSON.parse(guardado) as User;
  } catch {
    limpiarSesion();
    return null;
  }
};

export const rutaInicialPorRol = (rol: Rol): string =>
  rol === 'funcionario' ? '/funcionario/solicitudes' : '/vecino/dashboard';
