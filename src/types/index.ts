// Sucursal
export interface Sucursal {
  _id: string;
  nombre: string;
  codigo: string;
  direccion: {
    calle: string;
    numero: string;
    comuna: string;
    ciudad: string;
    region: string;
  };
  telefono?: string;
  email?: string;
  horarioAtencion?: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SucursalStock {
  _id: string;
  sucursal: string | Sucursal;
  producto: string | Product;
  cantidadDisponible: number;
  cantidadReservada: number;
  estado: 'disponible' | 'reservado' | 'agotado';
  precioLocal?: number;
  lote: string;
  /** Vacío = stock general del dispensario (se puede dispensar). */
  ubicacion?: string | UbicacionRef | null;
  cosecha?: string | Pick<Cosecha, '_id' | 'lote' | 'fecha'> | null;
  fechaProduccion?: string;
  fechaVencimiento?: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

// Auth
export type UserRole = 'admin' | 'operador' | 'produccion' | 'cultivo' | 'finanzas' | 'paciente';

export interface SucursalRef {
  _id: string;
  nombre: string;
  codigo: string;
}

export interface User {
  _id: string;
  email: string;
  nombre: string;
  apellido: string;
  rut: string;
  role: UserRole;
  telefono?: string;
  sucursales: SucursalRef[];
  sucursalActiva?: string;
  activo: boolean;
  ultimoAcceso?: string;
  /** Si está en el futuro, la cuenta está bloqueada por intentos fallidos. */
  bloqueadoHasta?: string;
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
    sucursales: SucursalRef[];
    sucursalActiva?: string | null;
  };
}

// Patient
export type PatientStatus = 'pendiente' | 'aprobado' | 'rechazado' | 'suspendido';

export type DocumentType =
  | 'receta_medica'
  | 'certificado_antecedentes'
  | 'reglamento_interno'
  | 'mandato_contrato'
  | 'cedula_identidad'
  | 'otro';

/** Usuario resumido que viene en campos poblados (activadoPor, revisadoPor, etc.). */
export interface UserRef {
  _id: string;
  nombre: string;
  apellido: string;
  email?: string;
  role?: UserRole;
}

export interface DocumentSignature {
  signatureId: string;
  provider: string;
  estado: SignatureStatus;
  signingUrl?: string;
  firmadoPor?: string;
  rutFirmante?: string;
  fechaFirma?: string;
  archivoFirmado?: string;
  fechaSolicitud?: string;
}

export interface PatientDocument {
  _id: string;
  tipo: DocumentType;
  nombre: string;
  /** Referencia interna. Para abrirlo hay que pedir un enlace temporal a la API. */
  archivo: string;
  fechaSubida: string;
  subidoPor?: string | UserRef;
  fechaVencimiento?: string;
  estado: 'pendiente' | 'aprobado' | 'rechazado';
  observaciones?: string;
  revisadoPor?: string | UserRef;
  fechaRevision?: string;
  firma?: DocumentSignature;
}

export interface PatientStatusChange {
  estado: PatientStatus;
  fecha: string;
  usuario?: string | UserRef;
  motivo?: string;
}

export interface ActivationRequirements {
  bloqueantes: string[];
  advertencias: string[];
}

export interface Patient {
  _id: string;
  usuario?: string | UserRef;
  sucursal?: string | SucursalRef | null;
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
  motivoSuspension?: 'receta_vencida' | 'manual';
  activadoPor?: string | UserRef;
  fechaActivacion?: string;
  historialEstados?: PatientStatusChange[];
  /** Unidades que puede retirar en 30 días. 0 = sin límite. */
  limiteMensualUnidades: number;
  observaciones?: string;
  /** Calculado por la API. */
  recetaVigente?: { _id: string; fechaVencimiento: string } | null;
  /** Calculado por la API. */
  requisitosActivacion?: ActivationRequirements;
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

export type PaymentStatus = 'pendiente' | 'procesando' | 'aprobado' | 'rechazado' | 'cancelado' | 'error';
export type SignatureStatus = 'pendiente' | 'enviado' | 'firmado' | 'rechazado' | 'expirado' | 'error';

/** Lote y ubicación desde donde se descontó un ítem. */
export interface OrderItemLot {
  stock: string;
  lote: string;
  cantidad: number;
  ubicacion?: string | UbicacionRef;
  cosecha?: string;
}

export interface OrderItem {
  producto: string | Product;
  nombre: string;
  cantidad: number;
  /** 0 mientras los pagos estén deshabilitados. */
  precioUnitario: number;
  subtotal: number;
  lotes?: OrderItemLot[];
}

export interface PaymentAttempt {
  _id?: string;
  transactionId: string;
  provider: string;
  monto: number;
  metodo: 'debito' | 'credito' | 'flow';
  cuotas?: number;
  estado: PaymentStatus;
  ultimosDigitos?: string;
  codigoAutorizacion?: string;
  mensaje?: string;
  fecha: string;
  flowToken?: string;
  flowOrderNumber?: number;
  redirectUrl?: string;
}

export interface OrderPayment {
  estado: PaymentStatus;
  montoTotal: number;
  montoPagado: number;
  intentos: PaymentAttempt[];
}

export type OrderDocumentSignature = DocumentSignature;

export interface OrderDocument {
  _id: string;
  tipo: string;
  nombre: string;
  archivo: string;
  fechaSubida: string;
  subidoPor?: string;
  firma?: OrderDocumentSignature;
}

export interface Order {
  _id: string;
  numeroPedido: string;
  sucursal: string | Sucursal;
  paciente: string | Patient;
  items: OrderItem[];
  total: number;
  estado: OrderStatus;
  recetaMedica: string;
  /** Documento de receta vigente al crear la nota. */
  receta?: string;
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
  aprobadoPor?: string | UserRef;
  preparadoPor?: string | UserRef;
  pago?: OrderPayment;
  documentos?: OrderDocument[];
  historialEstados: {
    estado: string;
    fecha: string;
    usuario?: string | UserRef;
    observacion?: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

// Inventory
export type MovementType =
  | 'produccion'
  | 'cosecha'
  | 'ingreso'
  | 'ajuste'
  | 'merma'
  | 'dispensacion'
  | 'transferencia_salida'
  | 'transferencia_entrada'
  | 'transferencia_anulada'
  // Tipos antiguos (historial)
  | 'venta'
  | 'transferencia';

export interface InventoryMovement {
  _id: string;
  sucursal: string | Sucursal;
  producto: string | Product;
  tipo: MovementType;
  cantidad: number;
  cantidadAnterior: number;
  cantidadNueva: number;
  lote: string;
  ubicacion?: string | UbicacionRef | null;
  stock?: string;
  motivo: string;
  referencia?: { tipo: 'orden' | 'produccion' | 'ajuste' | 'cosecha' | 'transferencia'; id: string };
  usuario: string | User;
  createdAt: string;
}

// Ubicaciones, cultivo y transferencias
export type UbicacionTipo = 'sala_cultivo' | 'bodega' | 'dispensario';

export interface UbicacionRef {
  _id: string;
  nombre: string;
  codigo: string;
  tipo?: UbicacionTipo;
}

export interface Ubicacion {
  _id: string;
  sucursal: string | SucursalRef;
  nombre: string;
  codigo: string;
  tipo: UbicacionTipo;
  padre?: string | UbicacionRef;
  descripcion?: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PatientRef {
  _id: string;
  nombre: string;
  apellido: string;
  rut: string;
  estado?: PatientStatus;
}

export interface EspacioCultivo {
  _id: string;
  sucursal: string | SucursalRef;
  paciente: string | PatientRef;
  ubicacion: string | UbicacionRef;
  codigo: string;
  /** Token que va dentro del QR. */
  codigoQR: string;
  metrosCuadrados: number;
  flor: string;
  estado: 'activo' | 'cerrado';
  fechaInicio: string;
  fechaCierre?: string;
  observaciones?: string;
  creadoPor?: string | UserRef;
  createdAt: string;
  updatedAt: string;
}

export interface Cosecha {
  _id: string;
  sucursal: string | SucursalRef;
  espacio: string | Pick<EspacioCultivo, '_id' | 'codigo' | 'flor'>;
  paciente: string | PatientRef;
  lote: string;
  fecha: string;
  pesoHumedo?: number;
  pesoSeco?: number;
  producto?: string | Pick<Product, '_id' | 'nombre' | 'tipo'>;
  cantidadIngresada?: number;
  ubicacionDestino?: string | UbicacionRef;
  estado: 'registrada' | 'en_inventario';
  responsable?: string | UserRef;
  observaciones?: string;
  createdAt: string;
}

export type TransferenciaEstado = 'en_transito' | 'recibida' | 'anulada';

export interface TransferenciaItem {
  producto: string | Pick<Product, '_id' | 'nombre' | 'tipo'>;
  nombre: string;
  lote: string;
  cantidad: number;
  stockOrigen: string;
  stockDestino?: string;
  cosecha?: string;
  fechaVencimiento?: string;
}

export interface Transferencia {
  _id: string;
  codigo: string;
  sucursalOrigen: string | SucursalRef;
  ubicacionOrigen?: string | UbicacionRef;
  sucursalDestino: string | SucursalRef;
  ubicacionDestino?: string | UbicacionRef;
  items: TransferenciaItem[];
  estado: TransferenciaEstado;
  enviadoPor: string | UserRef;
  fechaEnvio: string;
  recibidoPor?: string | UserRef;
  fechaRecepcion?: string;
  anuladoPor?: string | UserRef;
  fechaAnulacion?: string;
  observaciones?: string;
  createdAt: string;
}

/** Respuesta de GET /api/inventory/traceability/:lote */
export interface LotTraceability {
  lote: string;
  producto: Product | null;
  cosecha:
    | (Omit<Cosecha, 'espacio' | 'paciente'> & {
        paciente: PatientRef;
        espacio: Pick<EspacioCultivo, '_id' | 'codigo' | 'flor' | 'metrosCuadrados'> & { ubicacion: UbicacionRef };
      })
    | null;
  producciones: Production[];
  transferencias: Transferencia[];
  stock: SucursalStock[];
  dispensaciones: {
    _id: string;
    numeroPedido: string;
    paciente: PatientRef;
    estado: OrderStatus;
    fechaEntrega?: string;
    sucursal: SucursalRef;
    createdAt: string;
    cantidad: number;
  }[];
  movimientos: InventoryMovement[];
  totalMovimientos: number;
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
  sucursal: string | Sucursal;
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
  cosecha?: string | Pick<Cosecha, '_id' | 'lote' | 'fecha'>;
  ubicacionDestino?: string | UbicacionRef;
  observaciones?: string;
  createdAt: string;
  updatedAt: string;
}

// Finance
export type TransactionType = 'ingreso' | 'egreso';

export interface FinanceTransaction {
  _id: string;
  sucursal: string | Sucursal;
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
  cultivo?: { espaciosActivos: number; transferenciasEnTransito: number };
  vigencia?: {
    diasAviso: number;
    porVencer: number;
    sinRecetaVigente: number;
    suspendidosPorVencimiento: number;
  };
  pagosHabilitados?: boolean;
}

/** Respuesta de GET /api/patients/alertas/vigencia */
export interface VigenciaAlertPatient {
  _id: string;
  nombre: string;
  apellido: string;
  rut: string;
  estado: PatientStatus;
  sucursal?: SucursalRef | null;
  recetaVence: string | null;
}

export interface VigenciaAlerts {
  diasAviso: number;
  porVencer: VigenciaAlertPatient[];
  sinRecetaVigente: VigenciaAlertPatient[];
  suspendidosPorVencimiento: VigenciaAlertPatient[];
}

/** Respuesta de GET /api/patients/:id/expediente */
export interface PatientExpediente {
  generadoEn: string;
  generadoPor: { nombre: string; email: string };
  paciente: Patient;
  espacios: EspacioCultivo[];
  cosechas: Cosecha[];
  dispensaciones: Order[];
  auditoria: AuditLog[];
}

// Configuración pública (GET /api/config)
export interface DocumentRequirement {
  tipo: DocumentType;
  label: string;
  descripcion: string;
  requiereFirma: boolean;
  requiereVencimiento: boolean;
  bloqueaActivacion: boolean;
}

export interface AppConfig {
  pagosHabilitados: boolean;
  diasAvisoReceta: number;
  documentosRequeridos: DocumentRequirement[];
  tiposDocumento: Record<DocumentType, string>;
}

// Audit
export interface AuditLog {
  _id: string;
  sucursal?: string | Sucursal | null;
  /** Vacío en acciones del sistema o logins fallidos de emails desconocidos. */
  usuario?: string | User | null;
  email?: string;
  accion: string;
  entidad: string;
  entidadId?: string;
  resultado?: 'exito' | 'fallo';
  detalles?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  createdAt: string;
}
