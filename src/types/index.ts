// Auth
export type UserRole = 'admin' | 'operador' | 'produccion' | 'finanzas' | 'paciente';

export interface User {
  _id: string;
  email: string;
  nombre: string;
  apellido: string;
  rut: string;
  role: UserRole;
  telefono?: string;
  activo: boolean;
  ultimoAcceso?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    nombre: string;
    apellido: string;
    role: UserRole;
  };
}

// Patient
export type PatientStatus = 'pendiente' | 'aprobado' | 'rechazado' | 'suspendido';

export interface PatientDocument {
  _id: string;
  tipo: 'receta_medica' | 'certificado_antecedentes' | 'cedula_identidad' | 'otro';
  nombre: string;
  archivo: string;
  fechaSubida: string;
  fechaVencimiento?: string;
  estado: 'pendiente' | 'aprobado' | 'rechazado';
  observaciones?: string;
}

export interface Patient {
  _id: string;
  rut: string;
  nombre: string;
  apellido: string;
  fechaNacimiento: string;
  direccion: {
    calle: string;
    numero: string;
    comuna: string;
    ciudad: string;
    region: string;
    codigoPostal?: string;
  };
  telefono: string;
  email: string;
  medicoTratante: {
    nombre: string;
    especialidad?: string;
    telefono?: string;
    email?: string;
  };
  documentos: PatientDocument[];
  estado: PatientStatus;
  limiteCompra: number;
  observaciones?: string;
  createdAt: string;
  updatedAt: string;
}

// Product
export type ProductStatus = 'disponible' | 'reservado' | 'agotado';
export type ProductType = 'flor' | 'aceite' | 'crema' | 'capsula' | 'tintura' | 'comestible' | 'otro';

export interface Product {
  _id: string;
  nombre: string;
  tipo: ProductType;
  descripcion?: string;
  concentracion?: string;
  presentacion?: string;
  usoTerapeutico?: string;
  precio: number;
  lote: string;
  fechaProduccion: string;
  fechaVencimiento: string;
  cantidadDisponible: number;
  cantidadReservada: number;
  estado: ProductStatus;
  imagen?: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

// Order
export type OrderStatus =
  | 'pendiente_revision'
  | 'aprobado'
  | 'en_preparacion'
  | 'listo_retiro'
  | 'en_despacho'
  | 'entregado'
  | 'cancelado';

export type DeliveryType = 'retiro' | 'despacho';

export interface OrderItem {
  producto: string | Product;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface Order {
  _id: string;
  numeroPedido: string;
  paciente: string | Patient;
  items: OrderItem[];
  total: number;
  estado: OrderStatus;
  recetaMedica: string;
  tipoEntrega: DeliveryType;
  direccionEntrega?: {
    calle: string;
    numero: string;
    comuna: string;
    ciudad: string;
    region: string;
  };
  fechaRetiroProgramado?: string;
  fechaEntrega?: string;
  observaciones?: string;
  historialEstados: {
    estado: OrderStatus;
    fecha: string;
    usuario?: string;
    observacion?: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

// Inventory
export type MovementType = 'produccion' | 'ingreso' | 'ajuste' | 'venta' | 'merma' | 'transferencia';

export interface InventoryMovement {
  _id: string;
  producto: string | Product;
  tipo: MovementType;
  cantidad: number;
  cantidadAnterior: number;
  cantidadNueva: number;
  lote: string;
  motivo: string;
  usuario: string | User;
  createdAt: string;
}

// Production
export type ProductionStatus = 'en_proceso' | 'completado' | 'cancelado';

export interface RawMaterial {
  nombre: string;
  cantidad: number;
  unidad: string;
  lote?: string;
}

export interface Waste {
  _id?: string;
  tipo: 'proceso' | 'calidad' | 'almacenamiento' | 'otro';
  cantidad: number;
  motivo: string;
  fecha: string;
}

export interface Production {
  _id: string;
  codigoProduccion: string;
  productoFinal: string | Product;
  lote: string;
  materiasPrimas: RawMaterial[];
  cantidadInicial: number;
  cantidadProducida: number;
  mermas: Waste[];
  totalMermas: number;
  estado: ProductionStatus;
  fechaInicio: string;
  fechaFin?: string;
  responsable: string | User;
  observaciones?: string;
  createdAt: string;
  updatedAt: string;
}

// Finance
export type TransactionType = 'ingreso' | 'egreso';

export interface FinanceTransaction {
  _id: string;
  tipo: TransactionType;
  monto: number;
  descripcion: string;
  categoria: string;
  fecha: string;
  comprobante?: string;
  usuario: string | User;
  observaciones?: string;
  createdAt: string;
}

// API Response
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

// Dashboard
export interface DashboardData {
  pacientes: { total: number; aprobados: number };
  productos: { total: number; agotados: number };
  pedidos: { mes: number; pendientes: number };
  finanzas: { ingresosMes: number; egresosMes: number; balance: number };
}

// Audit
export interface AuditLog {
  _id: string;
  usuario: string | User;
  accion: string;
  entidad: string;
  entidadId?: string;
  detalles?: Record<string, unknown>;
  ip?: string;
  createdAt: string;
}
