export type CategoriaTramite = 'certificados' | 'permisos' | 'reclamos' | 'solicitudes';

export type EstadoSolicitud = 'pendiente' | 'en_revision' | 'aprobado' | 'rechazado';

export interface Tramite {
  id: string;
  nombre: string;
  categoria: CategoriaTramite;
  descripcion: string;
  requisitos: string[];
  icono: string;
}

export interface Solicitud {
  id: string;
  tramiteId: string;
  vecinoNombre: string;
  fecha: string;
  estado: EstadoSolicitud;
  observaciones?: string;
}

export interface NuevaSolicitud {
  tramiteId: string;
  vecinoNombre: string;
  observaciones?: string;
}

export interface Notificacion {
  id: string;
  titulo: string;
  mensaje: string;
  fecha: string;
  leida: boolean;
}

const TRAMITES: Tramite[] = [
  {
    id: 'cert-residencia',
    nombre: 'Certificado de residencia',
    categoria: 'certificados',
    descripcion: 'Acredita tu domicilio dentro de la comuna de Santo Domingo.',
    requisitos: [
      'Cédula de identidad vigente',
      'Comprobante de domicilio de los últimos 3 meses',
      'Declaración jurada simple',
    ],
    icono: 'documentTextOutline',
  },
  {
    id: 'cert-numero-municipal',
    nombre: 'Certificado de número municipal',
    categoria: 'certificados',
    descripcion: 'Certifica el número asignado a tu propiedad por la municipalidad.',
    requisitos: ['Rol de avalúo de la propiedad', 'Cédula de identidad del propietario'],
    icono: 'homeOutline',
  },
  {
    id: 'permiso-obra-menor',
    nombre: 'Permiso de obra menor',
    categoria: 'permisos',
    descripcion: 'Autorización para ampliaciones y remodelaciones de baja escala.',
    requisitos: [
      'Planos de la obra firmados',
      'Certificado de informaciones previas',
      'Cédula de identidad del propietario',
    ],
    icono: 'constructOutline',
  },
  {
    id: 'permiso-evento',
    nombre: 'Permiso para evento en vía pública',
    categoria: 'permisos',
    descripcion: 'Solicita autorización para ferias, actividades deportivas o culturales.',
    requisitos: [
      'Carta de solicitud dirigida al alcalde',
      'Plano de ubicación del evento',
      'Plan de seguridad y emergencias',
    ],
    icono: 'megaphoneOutline',
  },
  {
    id: 'reclamo-alumbrado',
    nombre: 'Reclamo por alumbrado público',
    categoria: 'reclamos',
    descripcion: 'Informa luminarias apagadas o en mal estado en tu sector.',
    requisitos: ['Dirección exacta del punto afectado', 'Fotografía del problema (opcional)'],
    icono: 'bulbOutline',
  },
  {
    id: 'solicitud-retiro-escombros',
    nombre: 'Solicitud de retiro de escombros',
    categoria: 'solicitudes',
    descripcion: 'Agenda el retiro de escombros y residuos voluminosos desde tu domicilio.',
    requisitos: ['Dirección del retiro', 'Descripción del volumen aproximado'],
    icono: 'trashBinOutline',
  },
];

let solicitudes: Solicitud[] = [
  {
    id: 'SOL-1001',
    tramiteId: 'cert-residencia',
    vecinoNombre: 'María Contreras',
    fecha: '2026-09-12',
    estado: 'pendiente',
  },
  {
    id: 'SOL-1002',
    tramiteId: 'permiso-obra-menor',
    vecinoNombre: 'Juan Pérez',
    fecha: '2026-09-14',
    estado: 'en_revision',
    observaciones: 'Faltan planos firmados por el arquitecto.',
  },
  {
    id: 'SOL-1003',
    tramiteId: 'reclamo-alumbrado',
    vecinoNombre: 'Vecino Demo',
    fecha: '2026-09-16',
    estado: 'aprobado',
    observaciones: 'Cuadrilla asignada para el 20 de septiembre.',
  },
  {
    id: 'SOL-1004',
    tramiteId: 'permiso-evento',
    vecinoNombre: 'Club Deportivo Rocas de Santo Domingo',
    fecha: '2026-09-18',
    estado: 'rechazado',
    observaciones: 'El plan de seguridad no cumple con el aforo declarado.',
  },
  {
    id: 'SOL-1005',
    tramiteId: 'solicitud-retiro-escombros',
    vecinoNombre: 'Vecino Demo',
    fecha: '2026-09-20',
    estado: 'pendiente',
  },
];

const NOTIFICACIONES: Notificacion[] = [
  {
    id: 'NOT-1',
    titulo: 'Solicitud aprobada',
    mensaje: 'Tu reclamo por alumbrado público fue aprobado y asignado a una cuadrilla.',
    fecha: '2026-09-16',
    leida: false,
  },
  {
    id: 'NOT-2',
    titulo: 'Documentos pendientes',
    mensaje: 'Recuerda adjuntar el comprobante de domicilio a tu certificado de residencia.',
    fecha: '2026-09-13',
    leida: false,
  },
  {
    id: 'NOT-3',
    titulo: 'Horario de atención',
    mensaje: 'La oficina de partes atenderá de 8:30 a 14:00 durante septiembre.',
    fecha: '2026-09-05',
    leida: true,
  },
];

export const ETIQUETA_ESTADO: Record<EstadoSolicitud, string> = {
  pendiente: 'Pendiente',
  en_revision: 'En revisión',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
};

export const COLOR_ESTADO: Record<EstadoSolicitud, string> = {
  pendiente: 'warning',
  en_revision: 'secondary',
  aprobado: 'success',
  rechazado: 'danger',
};

export const ETIQUETA_CATEGORIA: Record<CategoriaTramite, string> = {
  certificados: 'Certificados',
  permisos: 'Permisos',
  reclamos: 'Reclamos',
  solicitudes: 'Solicitudes',
};

export const getTramites = (): Tramite[] => [...TRAMITES];

export const buscarTramites = (termino: string): Tramite[] => {
  const texto = termino.trim().toLowerCase();
  if (texto === '') {
    return getTramites();
  }
  return TRAMITES.filter(
    (tramite) =>
      tramite.nombre.toLowerCase().includes(texto) ||
      tramite.descripcion.toLowerCase().includes(texto) ||
      ETIQUETA_CATEGORIA[tramite.categoria].toLowerCase().includes(texto)
  );
};

export const getTramiteById = (id: string): Tramite | undefined =>
  TRAMITES.find((tramite) => tramite.id === id);

export const getSolicitudes = (): Solicitud[] => [...solicitudes];

export const getSolicitudesPorVecino = (vecinoNombre: string): Solicitud[] =>
  solicitudes.filter((solicitud) => solicitud.vecinoNombre === vecinoNombre);

export const getSolicitudById = (id: string): Solicitud | undefined =>
  solicitudes.find((solicitud) => solicitud.id === id);

export const crearSolicitud = (datos: NuevaSolicitud): Solicitud => {
  const nueva: Solicitud = {
    id: `SOL-${1000 + solicitudes.length + 1}`,
    tramiteId: datos.tramiteId,
    vecinoNombre: datos.vecinoNombre,
    fecha: new Date().toISOString().slice(0, 10),
    estado: 'pendiente',
    observaciones: datos.observaciones,
  };
  solicitudes = [nueva, ...solicitudes];
  return nueva;
};

export const actualizarEstadoSolicitud = (
  id: string,
  estado: EstadoSolicitud,
  observaciones?: string
): Solicitud | undefined => {
  let actualizada: Solicitud | undefined;
  solicitudes = solicitudes.map((solicitud) => {
    if (solicitud.id !== id) {
      return solicitud;
    }
    actualizada = { ...solicitud, estado, observaciones: observaciones ?? solicitud.observaciones };
    return actualizada;
  });
  return actualizada;
};

export const getNotificaciones = (): Notificacion[] => [...NOTIFICACIONES];

export const getResumenPorEstado = (): Record<EstadoSolicitud, number> => {
  const resumen: Record<EstadoSolicitud, number> = {
    pendiente: 0,
    en_revision: 0,
    aprobado: 0,
    rechazado: 0,
  };
  solicitudes.forEach((solicitud) => {
    resumen[solicitud.estado] += 1;
  });
  return resumen;
};
