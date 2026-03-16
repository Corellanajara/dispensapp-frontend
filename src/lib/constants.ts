import type {
  OrderStatus,
  PatientStatus,
  ProductStatus,
  ProductionStatus,
  ProductType,
  MovementType,
  PaymentStatus,
  SignatureStatus,
  DeliveryType,
  TransactionType,
} from '@/types';

// ── Order Status ──

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pendiente_revision: 'Pendiente Revisión',
  aprobado: 'Aprobado',
  en_preparacion: 'En Preparación',
  listo_retiro: 'Listo para Retiro',
  en_despacho: 'En Despacho',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

export const ORDER_STATUS_VARIANTS: Record<OrderStatus, string> = {
  pendiente_revision: 'bg-warning/15 text-warning border-warning/25',
  aprobado: 'bg-info/15 text-info border-info/25',
  en_preparacion: 'bg-primary/15 text-primary border-primary/25',
  listo_retiro: 'bg-success/15 text-success border-success/25',
  en_despacho: 'bg-warning/15 text-warning border-warning/25',
  entregado: 'bg-success/15 text-success border-success/25',
  cancelado: 'bg-destructive/15 text-destructive border-destructive/25',
};

// ── Patient Status ──

export const PATIENT_STATUS_LABELS: Record<PatientStatus, string> = {
  pendiente: 'Pendiente',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
  suspendido: 'Suspendido',
};

export const PATIENT_STATUS_VARIANTS: Record<PatientStatus, string> = {
  pendiente: 'bg-warning/15 text-warning border-warning/25',
  aprobado: 'bg-success/15 text-success border-success/25',
  rechazado: 'bg-destructive/15 text-destructive border-destructive/25',
  suspendido: 'bg-muted text-muted-foreground border-border',
};

// ── Product Status ──

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  disponible: 'Disponible',
  reservado: 'Reservado',
  agotado: 'Agotado',
};

export const PRODUCT_STATUS_VARIANTS: Record<ProductStatus, string> = {
  disponible: 'bg-success/15 text-success border-success/25',
  reservado: 'bg-warning/15 text-warning border-warning/25',
  agotado: 'bg-destructive/15 text-destructive border-destructive/25',
};

// ── Product Type ──

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  flor: 'Flor',
  aceite: 'Aceite',
  crema: 'Crema',
  capsula: 'Cápsula',
  tintura: 'Tintura',
  comestible: 'Comestible',
  otro: 'Otro',
};

// ── Production Status ──

export const PRODUCTION_STATUS_LABELS: Record<ProductionStatus, string> = {
  en_proceso: 'En Proceso',
  completado: 'Completado',
  cancelado: 'Cancelado',
};

export const PRODUCTION_STATUS_VARIANTS: Record<ProductionStatus, string> = {
  en_proceso: 'bg-primary/15 text-primary border-primary/25',
  completado: 'bg-success/15 text-success border-success/25',
  cancelado: 'bg-destructive/15 text-destructive border-destructive/25',
};

// ── Movement Type ──

export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  produccion: 'Producción',
  ingreso: 'Ingreso',
  ajuste: 'Ajuste',
  venta: 'Venta',
  merma: 'Merma',
  transferencia: 'Transferencia',
};

// ── Payment Status ──

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pendiente: 'Pendiente',
  procesando: 'Procesando',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
  cancelado: 'Cancelado',
  error: 'Error',
};

export const PAYMENT_STATUS_VARIANTS: Record<PaymentStatus, string> = {
  pendiente: 'bg-warning/15 text-warning border-warning/25',
  procesando: 'bg-info/15 text-info border-info/25',
  aprobado: 'bg-success/15 text-success border-success/25',
  rechazado: 'bg-destructive/15 text-destructive border-destructive/25',
  cancelado: 'bg-muted text-muted-foreground border-border',
  error: 'bg-destructive/15 text-destructive border-destructive/25',
};

// ── Signature Status ──

export const SIGNATURE_STATUS_LABELS: Record<SignatureStatus, string> = {
  pendiente: 'Pendiente',
  enviado: 'Enviado',
  firmado: 'Firmado',
  rechazado: 'Rechazado',
  expirado: 'Expirado',
  error: 'Error',
};

export const SIGNATURE_STATUS_VARIANTS: Record<SignatureStatus, string> = {
  pendiente: 'bg-warning/15 text-warning border-warning/25',
  enviado: 'bg-info/15 text-info border-info/25',
  firmado: 'bg-success/15 text-success border-success/25',
  rechazado: 'bg-destructive/15 text-destructive border-destructive/25',
  expirado: 'bg-muted text-muted-foreground border-border',
  error: 'bg-destructive/15 text-destructive border-destructive/25',
};

// ── Delivery Type ──

export const DELIVERY_TYPE_LABELS: Record<DeliveryType, string> = {
  retiro: 'Retiro en Tienda',
  despacho: 'Despacho a Domicilio',
};

// ── Transaction Type ──

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  ingreso: 'Ingreso',
  egreso: 'Egreso',
};

// ── Finance Categories ──

export const FINANCE_CATEGORY_LABELS: Record<string, string> = {
  produccion: 'Producción',
  ventas: 'Ventas',
  administracion: 'Administración',
  logistica: 'Logística',
  marketing: 'Marketing',
  sueldos: 'Sueldos',
  insumos: 'Insumos',
  proveedores: 'Proveedores',
  venta_productos: 'Venta de Productos',
  pago_pedido: 'Pago de Pedido',
  otro: 'Otro',
};

// ── Document Types ──

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  receta_medica: 'Receta Médica',
  certificado_antecedentes: 'Certificado de Antecedentes',
  cedula_identidad: 'Cédula de Identidad',
  otro: 'Otro',
};

// ── Document Status ──

export const DOCUMENT_STATUS_LABELS: Record<string, string> = {
  pendiente: 'Pendiente',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
};

export const DOCUMENT_STATUS_VARIANTS: Record<string, string> = {
  pendiente: 'bg-warning/15 text-warning border-warning/25',
  aprobado: 'bg-success/15 text-success border-success/25',
  rechazado: 'bg-destructive/15 text-destructive border-destructive/25',
};

// ── User Roles ──

export const USER_ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  operador: 'Operador',
  produccion: 'Producción',
  finanzas: 'Finanzas',
  paciente: 'Paciente',
};

// ── Waste Types ──

export const WASTE_TYPE_LABELS: Record<string, string> = {
  proceso: 'Proceso',
  calidad: 'Calidad',
  almacenamiento: 'Almacenamiento',
  otro: 'Otro',
};
