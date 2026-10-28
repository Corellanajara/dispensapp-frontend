import axios from 'axios';
import type {
  AuthResponse,
  User,
  Patient,
  Product,
  Sucursal,
  SucursalStock,
  Order,
  InventoryMovement,
  Production,
  FinanceTransaction,
  PaginatedResponse,
  DashboardData,
  AuditLog,
  AppConfig,
  VigenciaAlerts,
  PatientExpediente,
  PatientDocument,
  Ubicacion,
  EspacioCultivo,
  Cosecha,
  Transferencia,
  LotTraceability,
  CertificateStatus,
  SignatureAdminConfig,
  SignatureSettings,
} from '@/types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const sucursalId = localStorage.getItem('sucursalActiva');
  if (sucursalId) {
    config.headers['X-Sucursal-Id'] = sucursalId;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // En /auth/login un 401 es "credenciales inválidas": no se redirige.
    const isLogin = String(error.config?.url || '').includes('/auth/login');
    if (error.response?.status === 401 && !isLogin) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/** Código de error que devuelve la API de firma (ej. REQUIERE_CERTIFICADO). */
export function apiErrorCode(err: unknown): string | undefined {
  return (err as { response?: { data?: { codigo?: string } } }).response?.data?.codigo;
}

/** Mensaje de error de la API (message o primer error de validación). */
export function apiErrorMessage(err: unknown, fallback = 'Ocurrió un error'): string {
  const e = err as { response?: { data?: { message?: string; errors?: { msg?: string }[] } } };
  return e.response?.data?.message || e.response?.data?.errors?.[0]?.msg || fallback;
}

type UrlResponse = { url: string };

export interface SignatureRequestResult {
  signatureId: string;
  status: string;
  /** Página del proveedor donde el paciente firma. */
  signingUrl?: string;
  message: string;
}

export interface CertificateRequestData {
  /** Número de documento (serie) de la cédula. */
  serieCedula: string;
  telefono?: string;
  comuna?: string;
}

export interface CertificateRequestResult {
  /** Página del proveedor donde el paciente valida su identidad. */
  enrollUrl: string;
  message: string;
}

/** Firma electrónica: configuración del administrador y herramientas del proveedor. */
export const signaturesAPI = {
  getConfig: () => api.get<SignatureAdminConfig>('/signatures/config'),
  updateConfig: (data: Partial<SignatureSettings>) => api.put<SignatureAdminConfig>('/signatures/config', data),
  testConnection: () => api.post<{ ok: boolean; message: string }>('/signatures/proveedor/probar'),
  getWebhook: () =>
    api.get<{ actual: { url?: string; authType?: string } | null; esperado: string; coincide: boolean }>(
      '/signatures/proveedor/webhook'
    ),
  registerWebhook: () => api.post<{ message: string; url: string }>('/signatures/proveedor/webhook'),
  testWebhook: () => api.post<{ message: string }>('/signatures/proveedor/webhook/probar'),
  comunas: () => api.get<{ comunas: string[] }>('/signatures/comunas'),
};

export const configAPI = {
  get: () => api.get<AppConfig>('/config'),
};

export const authAPI = {
  login: (data: { email: string; password: string }) =>
    api.post<AuthResponse>('/auth/login', data),
  /** Crea un usuario interno. Requiere sesión de admin; no devuelve token. */
  register: (data: Record<string, unknown>) =>
    api.post<{ user: AuthResponse['user'] }>('/auth/register', data),
  me: () => api.get<{ user: User }>('/auth/me'),
  registerPatient: (data: Record<string, unknown>) =>
    api.post<AuthResponse>('/auth/register-patient', data),
  setSucursalActiva: (sucursalId: string) =>
    api.patch<{ user: User }>('/auth/sucursal-activa', { sucursalId }),
};

export const sucursalesAPI = {
  list: (params?: Record<string, string>) =>
    api.get<Sucursal[]>('/sucursales', { params }),
  /** Lista mínima sin login, para el registro de pacientes. */
  publicas: () =>
    api.get<Pick<Sucursal, '_id' | 'nombre' | 'codigo' | 'direccion'>[]>('/sucursales/publicas'),
  get: (id: string) => api.get<Sucursal>(`/sucursales/${id}`),
  create: (data: Partial<Sucursal>) => api.post<Sucursal>('/sucursales', data),
  update: (id: string, data: Partial<Sucursal>) =>
    api.put<Sucursal>(`/sucursales/${id}`, data),
  toggleActive: (id: string) =>
    api.patch<Sucursal>(`/sucursales/${id}/toggle-active`),
};

export const patientsAPI = {
  list: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<Patient>>('/patients', { params }),
  get: (id: string) => api.get<Patient>(`/patients/${id}`),
  create: (data: Partial<Patient>) => api.post<Patient>('/patients', data),
  update: (id: string, data: Partial<Patient>) =>
    api.put<Patient>(`/patients/${id}`, data),
  updateStatus: (id: string, data: { estado: string; motivo?: string; observaciones?: string }) =>
    api.patch<Patient>(`/patients/${id}/status`, data),
  assignSucursal: (id: string, sucursal: string) =>
    api.patch<Patient>(`/patients/${id}/sucursal`, { sucursal }),
  uploadDocument: (id: string, formData: FormData) =>
    api.post<Patient>(`/patients/${id}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  reviewDocument: (
    id: string,
    docId: string,
    data: { estado: 'aprobado' | 'rechazado'; observaciones?: string; fechaVencimiento?: string }
  ) => api.patch<Patient & { reactivado?: boolean }>(`/patients/${id}/documents/${docId}/review`, data),
  /** Enlace temporal (5 min) para ver el documento. Queda auditado. */
  documentUrl: (id: string, docId: string, firmado = false) =>
    api.get<UrlResponse>(`/patients/${id}/documents/${docId}/archivo`, {
      params: firmado ? { firmado: 'true' } : undefined,
    }),
  /** Envía el documento a firma del paciente. Con reiniciar=true cancela la firma en curso y crea otra. */
  requestSignature: (id: string, docId: string, reiniciar = false) =>
    api.post<{ documento: PatientDocument; firma: SignatureRequestResult }>(
      `/signatures/patients/${id}/documents/${docId}/sign`,
      { reiniciar }
    ),
  cancelSignature: (id: string, docId: string) =>
    api.post<{ documento: PatientDocument }>(`/signatures/patients/${id}/documents/${docId}/cancel`),
  signatureStatus: (id: string, docId: string) =>
    api.get<{ documento: PatientDocument }>(`/signatures/patients/${id}/documents/${docId}/status`),
  certificate: (id: string) => api.get<CertificateStatus>(`/signatures/patients/${id}/certificado`),
  requestCertificate: (id: string, data: CertificateRequestData) =>
    api.post<CertificateRequestResult>(`/signatures/patients/${id}/certificado`, data),
  expediente: (id: string) => api.get<PatientExpediente>(`/patients/${id}/expediente`),
  alertasVigencia: () => api.get<VigenciaAlerts>('/patients/alertas/vigencia'),
};

export const productsAPI = {
  list: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<Product>>('/products', { params }),
  get: (id: string) => api.get<Product>(`/products/${id}`),
  create: (data: Partial<Product>) => api.post<Product>('/products', data),
  update: (id: string, data: Partial<Product>) =>
    api.put<Product>(`/products/${id}`, data),
  delete: (id: string) => api.delete(`/products/${id}`),
  uploadImage: (id: string, formData: FormData) =>
    api.post<Product>(`/products/${id}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  listStock: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<SucursalStock>>('/products/stock', { params }),
  /** Ingresa stock (queda como movimiento de ingreso). Acepta `ubicacion`. */
  createStock: (data: Record<string, unknown>) =>
    api.post<SucursalStock>('/products/stock', data),
  /** Solo precioLocal, fechas y activo. Las cantidades se cambian con movimientos. */
  updateStock: (id: string, data: Record<string, unknown>) =>
    api.put<SucursalStock>(`/products/stock/${id}`, data),
};

export const ordersAPI = {
  list: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<Order>>('/orders', { params }),
  get: (id: string) => api.get<Order>(`/orders/${id}`),
  create: (data: Record<string, unknown>) => api.post<Order>('/orders', data),
  updateStatus: (id: string, data: { estado: string; observacion?: string }) =>
    api.patch<Order>(`/orders/${id}/status`, data),
  uploadDocument: (orderId: string, formData: FormData) =>
    api.post<Order>(`/signatures/orders/${orderId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  documentUrl: (orderId: string, docId: string, firmado = false) =>
    api.get<UrlResponse>(`/signatures/orders/${orderId}/documents/${docId}/archivo`, {
      params: firmado ? { firmado: 'true' } : undefined,
    }),
};

/** Solo funciona si el backend tiene PAGOS_HABILITADOS=true. */
export const paymentsAPI = {
  providers: () => api.get<{ providers: string[] }>('/payments/providers'),
  initiate: (orderId: string, data: { method: 'debito' | 'credito'; installments?: number }) =>
    api.post(`/payments/orders/${orderId}/initiate`, data),
  status: (orderId: string) =>
    api.get(`/payments/orders/${orderId}/status`),
  cancel: (orderId: string) =>
    api.post(`/payments/orders/${orderId}/cancel`),
  createFlow: (orderId: string, data?: { paymentMethod?: number }) =>
    api.post<{ order: Order; redirectUrl: string; flowToken: string }>(`/payments/orders/${orderId}/create-flow`, data),
  sendPaymentEmail: (orderId: string, data: { email?: string; subject?: string }) =>
    api.post<{ order: Order; emailSent: boolean; email: string }>(`/payments/orders/${orderId}/send-payment-email`, data),
  flowStatus: (orderId: string) =>
    api.get(`/payments/orders/${orderId}/flow-status`),
};

export const inventoryAPI = {
  movements: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<InventoryMovement>>('/inventory/movements', { params }),
  /**
   * Ingreso, ajuste o merma. Enviar `stock` (fila) o, para un ingreso nuevo, `producto` + `lote` (+ `ubicacion`).
   * Los traslados se hacen con transferenciasAPI.
   */
  createMovement: (data: Record<string, unknown>) =>
    api.post<InventoryMovement>('/inventory/movements', data),
  /** Filtros: ubicacion (id o "ninguna"), producto, conStock=true */
  stock: (params?: Record<string, string>) => api.get<SucursalStock[]>('/inventory/stock', { params }),
  stockPorUbicacion: () =>
    api.get<
      {
        sucursal: string;
        ubicacion: { _id: string; nombre: string; codigo: string; tipo: string } | null;
        disponible: number;
        reservado: number;
        cantidadLotes: number;
        cantidadProductos: number;
      }[]
    >('/inventory/stock/por-ubicacion'),
  traceability: (lote: string) => api.get<LotTraceability>(`/inventory/traceability/${encodeURIComponent(lote)}`),
};

export const ubicacionesAPI = {
  list: (params?: Record<string, string>) => api.get<Ubicacion[]>('/ubicaciones', { params }),
  get: (id: string) =>
    api.get<{ ubicacion: Ubicacion; stock: SucursalStock[]; espacios: EspacioCultivo[] }>(`/ubicaciones/${id}`),
  create: (data: Partial<Ubicacion>) => api.post<Ubicacion>('/ubicaciones', data),
  update: (id: string, data: Partial<Ubicacion>) => api.put<Ubicacion>(`/ubicaciones/${id}`, data),
  toggleActive: (id: string) => api.patch<Ubicacion>(`/ubicaciones/${id}/toggle-active`),
};

export const cultivoAPI = {
  espacios: (params?: Record<string, string>) => api.get<EspacioCultivo[]>('/cultivo/espacios', { params }),
  espacio: (id: string) => api.get<{ espacio: EspacioCultivo; cosechas: Cosecha[] }>(`/cultivo/espacios/${id}`),
  crearEspacio: (data: {
    paciente: string;
    ubicacion: string;
    metrosCuadrados: number;
    flor: string;
    fechaInicio?: string;
    observaciones?: string;
  }) => api.post<EspacioCultivo>('/cultivo/espacios', data),
  actualizarEspacio: (id: string, data: Partial<Pick<EspacioCultivo, 'flor' | 'metrosCuadrados' | 'observaciones'>> & { ubicacion?: string }) =>
    api.put<EspacioCultivo>(`/cultivo/espacios/${id}`, data),
  cerrarEspacio: (id: string, observaciones?: string) =>
    api.patch<EspacioCultivo>(`/cultivo/espacios/${id}/cerrar`, { observaciones }),
  regenerarQR: (id: string) => api.post<EspacioCultivo>(`/cultivo/espacios/${id}/regenerar-qr`),
  /** Lo que se abre al escanear el QR. */
  porQR: (codigoQR: string) =>
    api.get<{ espacio: EspacioCultivo; cosechas: Cosecha[] }>(`/cultivo/qr/${encodeURIComponent(codigoQR)}`),
  cosechas: (params?: Record<string, string>) => api.get<Cosecha[]>('/cultivo/cosechas', { params }),
  registrarCosecha: (
    espacioId: string,
    data: {
      fecha?: string;
      pesoHumedo?: number;
      pesoSeco?: number;
      observaciones?: string;
      ingreso?: { producto: string; cantidad: number; ubicacion?: string; fechaVencimiento?: string };
    }
  ) => api.post<Cosecha>(`/cultivo/espacios/${espacioId}/cosechas`, data),
  ingresarCosecha: (
    cosechaId: string,
    data: { producto: string; cantidad: number; ubicacion?: string; fechaVencimiento?: string }
  ) => api.post<Cosecha>(`/cultivo/cosechas/${cosechaId}/ingresar`, data),
};

export const transferenciasAPI = {
  list: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<Transferencia>>('/transferencias', { params }),
  get: (id: string) => api.get<Transferencia>(`/transferencias/${id}`),
  /** Envía desde la sucursal activa. Todos los ítems deben salir de la misma ubicación. */
  enviar: (data: {
    items: { stock: string; cantidad: number }[];
    sucursalDestino?: string;
    ubicacionDestino?: string;
    observaciones?: string;
  }) => api.post<Transferencia>('/transferencias', data),
  recibir: (id: string, observaciones?: string) =>
    api.patch<Transferencia>(`/transferencias/${id}/recibir`, { observaciones }),
  anular: (id: string, motivo?: string) => api.patch<Transferencia>(`/transferencias/${id}/anular`, { motivo }),
};

export const productionAPI = {
  list: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<Production>>('/production', { params }),
  get: (id: string) => api.get<Production>(`/production/${id}`),
  /** Acepta `cosecha` y `ubicacionDestino` opcionales. */
  create: (data: Record<string, unknown>) => api.post<Production>('/production', data),
  complete: (id: string, data: { cantidadProducida: number }) =>
    api.patch<Production>(`/production/${id}/complete`, data),
  addWaste: (id: string, data: Record<string, unknown>) =>
    api.post<Production>(`/production/${id}/waste`, data),
};

export const financeAPI = {
  transactions: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<FinanceTransaction>>('/finance/transactions', { params }),
  createTransaction: (data: Record<string, unknown>) =>
    api.post<FinanceTransaction>('/finance/transactions', data),
  summary: (params?: Record<string, string>) =>
    api.get<{
      ingresos: { total: number; cantidad: number };
      egresos: { total: number; cantidad: number };
      balance: number;
      porCategoria: { _id: { tipo: string; categoria: string }; total: number }[];
    }>('/finance/summary', { params }),
  cashflow: (params?: Record<string, string>) =>
    api.get('/finance/cashflow', { params }),
};

export const usersAPI = {
  list: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<User>>('/users', { params }),
  update: (id: string, data: Partial<User>) =>
    api.put<User>(`/users/${id}`, data),
  toggleActive: (id: string) =>
    api.patch<User>(`/users/${id}/toggle-active`),
  /** Quita el bloqueo por intentos fallidos de login. */
  unlock: (id: string) => api.patch<User>(`/users/${id}/desbloquear`),
};

export const reportsAPI = {
  dashboard: () => api.get<DashboardData>('/reports/dashboard'),
  sales: (params?: Record<string, string>) =>
    api.get('/reports/sales', { params }),
  production: () => api.get('/reports/production'),
  /** Detalle de dispensaciones (una fila por lote), para fiscalización. */
  dispensaciones: (params?: Record<string, string>) =>
    api.get<{ total: number; data: Record<string, string | number>[] }>('/reports/dispensaciones', { params }),
  /** Descarga el CSV de dispensaciones. */
  dispensacionesCSV: (params?: Record<string, string>) =>
    api.get<Blob>('/reports/dispensaciones', { params: { ...params, formato: 'csv' }, responseType: 'blob' }),
};

export const auditAPI = {
  /** Filtros: usuario, entidad, entidadId, accion, resultado, desde, hasta, page, limit */
  list: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<AuditLog>>('/audit', { params }),
};

export const patientPortalAPI = {
  getProfile: () => api.get<Patient>('/patients/me'),
  updateProfile: (data: Record<string, unknown>) => api.put<Patient>('/patients/me', data),
  uploadDocument: (formData: FormData) =>
    api.post<Patient>('/patients/me/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  documentUrl: (docId: string, firmado = false) =>
    api.get<UrlResponse>(`/patients/me/documents/${docId}/archivo`, {
      params: firmado ? { firmado: 'true' } : undefined,
    }),
  /** El paciente pide firmar electrónicamente su documento. */
  requestSignature: (docId: string, reiniciar = false) =>
    api.post<{ paciente: Patient; firma: SignatureRequestResult }>(`/patients/me/documents/${docId}/firmar`, {
      reiniciar,
    }),
  certificate: () => api.get<CertificateStatus>('/patients/me/certificado-firma'),
  requestCertificate: (data: CertificateRequestData) =>
    api.post<CertificateRequestResult>('/patients/me/certificado-firma', data),
  signatureStatus: (docId: string) =>
    api.get<{ documento: PatientDocument }>(`/patients/me/documents/${docId}/firma`),
  getCatalog: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<SucursalStock>>('/products/catalog', { params }),
  getMyOrders: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<Order>>('/orders/patient', { params }),
  getMyOrder: (id: string) => api.get<Order>(`/orders/patient/${id}`),
  createOrder: (data: Record<string, unknown>) => api.post<Order>('/orders/patient', data),
  cancelOrder: (id: string) => api.patch<Order>(`/orders/patient/${id}/cancel`),
  /** Solo con pagos habilitados. */
  payOrder: (orderId: string) =>
    api.post<{ order: Order; redirectUrl: string; flowToken: string }>(`/payments/orders/${orderId}/patient-pay`),
};

export default api;

/** Origen del backend (sin /api), para imágenes públicas. */
export const API_ORIGIN = API_BASE.replace(/\/api\/?$/, '');

export function getProductImageUrl(imagen: string | undefined): string | null {
  if (!imagen) return null;
  if (imagen.startsWith('http')) return imagen; // URL de S3
  return `${API_ORIGIN}${imagen}`; // Ruta local servida por el backend
}

/**
 * Abre un documento privado: pide el enlace temporal y lo abre en otra pestaña.
 * La pestaña se abre antes de la llamada para que el navegador no la bloquee.
 */
export async function openDocument(getUrl: () => Promise<{ data: UrlResponse }>): Promise<void> {
  const win = window.open('', '_blank');
  try {
    const { data } = await getUrl();
    if (win) win.location.href = data.url;
    else window.location.href = data.url;
  } catch (err) {
    win?.close();
    throw err;
  }
}

/** Descarga un Blob como archivo. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
