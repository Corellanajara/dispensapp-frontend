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
  DocumentType,
  UbicacionTipo,
  TransferenciaEstado,
} from '@/types';

// ── Nota de dispensación (antes "pedido") ──
// La API sigue usando "orders"; en la interfaz se llama nota de dispensación, no venta.

export const ORDER_LABEL = 'Nota de dispensación';
export const ORDERS_LABEL = 'Notas de dispensación';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pendiente_revision: 'Pendiente de revisión',
  aprobado: 'Aprobada',
  en_preparacion: 'En preparación',
  listo_retiro: 'Lista para retiro',
  en_despacho: 'En despacho',
  entregado: 'Entregada',
  cancelado: 'Anulada',
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
  aprobado: 'Activo',
  rechazado: 'Rechazado',
  suspendido: 'Suspendido',
};

export const SUSPENSION_REASON_LABELS: Record<string, string> = {
  receta_vencida: 'Receta vencida',
  manual: 'Suspensión manual',
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
  cosecha: 'Cosecha',
  ingreso: 'Ingreso',
  ajuste: 'Ajuste',
  merma: 'Merma',
  dispensacion: 'Dispensación',
  transferencia_salida: 'Transferencia (salida)',
  transferencia_entrada: 'Transferencia (entrada)',
  transferencia_anulada: 'Transferencia anulada',
  venta: 'Venta (antiguo)',
  transferencia: 'Transferencia (antiguo)',
};

// ── Ubicaciones ──

export const UBICACION_TIPO_LABELS: Record<UbicacionTipo, string> = {
  sala_cultivo: 'Sala de cultivo',
  bodega: 'Bodega',
  dispensario: 'Dispensario',
};

// ── Transferencias ──

export const TRANSFERENCIA_ESTADO_LABELS: Record<TransferenciaEstado, string> = {
  en_transito: 'En tránsito',
  recibida: 'Recibida',
  anulada: 'Anulada',
};

export const TRANSFERENCIA_ESTADO_VARIANTS: Record<TransferenciaEstado, string> = {
  en_transito: 'bg-warning/15 text-warning border-warning/25',
  recibida: 'bg-success/15 text-success border-success/25',
  anulada: 'bg-muted text-muted-foreground border-border',
};

// ── Cultivo ──

export const ESPACIO_ESTADO_LABELS: Record<string, string> = {
  activo: 'Activo',
  cerrado: 'Cerrado',
};

export const COSECHA_ESTADO_LABELS: Record<string, string> = {
  registrada: 'Registrada',
  en_inventario: 'En inventario',
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
  retiro: 'Retiro en dispensario',
  despacho: 'Despacho a domicilio',
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
  venta_productos: 'Ventas (antiguo)',
  pago_pedido: 'Pagos de pedidos (antiguo)',
  otro: 'Otro',
};

// ── Document Types ──

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  receta_medica: 'Receta médica',
  certificado_antecedentes: 'Certificado de antecedentes',
  reglamento_interno: 'Reglamento interno',
  mandato_contrato: 'Mandato o contrato',
  cedula_identidad: 'Cédula de identidad',
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
  cultivo: 'Cultivo',
  finanzas: 'Finanzas',
  paciente: 'Paciente',
};

// ── Auditoría ──

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  login: 'Inicio de sesión',
  bloqueo_cuenta: 'Bloqueo de cuenta',
  desbloquear: 'Desbloqueo de cuenta',
  crear: 'Crear',
  actualizar: 'Actualizar',
  cambiar_estado: 'Cambiar estado',
  cambiar_sucursal: 'Cambiar dispensario',
  subir_documento: 'Subir documento',
  revisar_documento: 'Revisar documento',
  ver_documento: 'Ver documento',
  solicitar_firma: 'Solicitar firma',
  exportar_expediente: 'Exportar expediente',
  exportar_reporte: 'Exportar reporte',
  consultar_reporte: 'Consultar reporte',
  suspension_automatica: 'Suspensión automática',
  escanear_qr: 'Escanear QR',
  regenerar_qr: 'Regenerar QR',
  registrar_cosecha: 'Registrar cosecha',
  ingresar_cosecha: 'Ingresar cosecha',
  enviar: 'Enviar',
  recibir: 'Recibir',
  anular: 'Anular',
  cancelar: 'Anular',
  cerrar: 'Cerrar',
  toggle_activo: 'Activar/desactivar',
  registrar_merma: 'Registrar merma',
  completar: 'Completar',
  eliminar: 'Eliminar',
};

// ── Waste Types ──

export const WASTE_TYPE_LABELS: Record<string, string> = {
  proceso: 'Proceso',
  calidad: 'Calidad',
  almacenamiento: 'Almacenamiento',
  otro: 'Otro',
};
