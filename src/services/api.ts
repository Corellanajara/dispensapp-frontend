import axios from 'axios';
import type {
  AuthResponse,
  User,
  Patient,
  Product,
  Order,
  InventoryMovement,
  Production,
  FinanceTransaction,
  PaginatedResponse,
  DashboardData,
  AuditLog,
} from '@/types';

const api = axios.create({
  baseURL: 'https://dispensapp-backend-production-9a9a.up.railway.app/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to add token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor to handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  login: (data: { email: string; password: string }) =>
    api.post<AuthResponse>('/auth/login', data),
  register: (data: Record<string, string>) =>
    api.post<AuthResponse>('/auth/register', data),
  me: () => api.get<{ user: User }>('/auth/me'),
  registerPatient: (data: Record<string, unknown>) =>
    api.post<AuthResponse>('/auth/register-patient', data),
};

// Patients
export const patientsAPI = {
  list: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<Patient>>('/patients', { params }),
  get: (id: string) => api.get<Patient>(`/patients/${id}`),
  create: (data: Partial<Patient>) => api.post<Patient>('/patients', data),
  update: (id: string, data: Partial<Patient>) =>
    api.put<Patient>(`/patients/${id}`, data),
  updateStatus: (id: string, data: { estado: string; observaciones?: string }) =>
    api.patch<Patient>(`/patients/${id}/status`, data),
  uploadDocument: (id: string, formData: FormData) =>
    api.post<Patient>(`/patients/${id}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

// Products
export const productsAPI = {
  list: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<Product>>('/products', { params }),
  get: (id: string) => api.get<Product>(`/products/${id}`),
  create: (data: Partial<Product>) => api.post<Product>('/products', data),
  update: (id: string, data: Partial<Product>) =>
    api.put<Product>(`/products/${id}`, data),
  delete: (id: string) => api.delete(`/products/${id}`),
};

// Orders
export const ordersAPI = {
  list: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<Order>>('/orders', { params }),
  get: (id: string) => api.get<Order>(`/orders/${id}`),
  create: (data: Record<string, unknown>) => api.post<Order>('/orders', data),
  updateStatus: (id: string, data: { estado: string; observacion?: string }) =>
    api.patch<Order>(`/orders/${id}/status`, data),
};

// Inventory
export const inventoryAPI = {
  movements: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<InventoryMovement>>('/inventory/movements', { params }),
  createMovement: (data: Record<string, unknown>) =>
    api.post<InventoryMovement>('/inventory/movements', data),
  stock: () => api.get<Product[]>('/inventory/stock'),
  traceability: (lote: string) =>
    api.get<{ lote: string; producto: Product; movimientos: InventoryMovement[] }>(
      `/inventory/traceability/${lote}`
    ),
};

// Production
export const productionAPI = {
  list: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<Production>>('/production', { params }),
  get: (id: string) => api.get<Production>(`/production/${id}`),
  create: (data: Record<string, unknown>) => api.post<Production>('/production', data),
  complete: (id: string, data: { cantidadProducida: number }) =>
    api.patch<Production>(`/production/${id}/complete`, data),
  addWaste: (id: string, data: Record<string, unknown>) =>
    api.post<Production>(`/production/${id}/waste`, data),
};

// Finance
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

// Users
export const usersAPI = {
  list: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<User>>('/users', { params }),
  update: (id: string, data: Partial<User>) =>
    api.put<User>(`/users/${id}`, data),
  toggleActive: (id: string) =>
    api.patch<User>(`/users/${id}/toggle-active`),
};

// Reports
export const reportsAPI = {
  dashboard: () => api.get<DashboardData>('/reports/dashboard'),
  sales: (params?: Record<string, string>) =>
    api.get('/reports/sales', { params }),
  production: () => api.get('/reports/production'),
};

// Audit
export const auditAPI = {
  list: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<AuditLog>>('/audit', { params }),
};

// Patient Portal
export const patientPortalAPI = {
  getProfile: () => api.get<Patient>('/patients/me'),
  updateProfile: (data: Record<string, unknown>) => api.put<Patient>('/patients/me', data),
  uploadDocument: (formData: FormData) =>
    api.post<Patient>('/patients/me/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getCatalog: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<Product>>('/products/catalog', { params }),
  getMyOrders: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<Order>>('/orders/patient', { params }),
  getMyOrder: (id: string) => api.get<Order>(`/orders/patient/${id}`),
  createOrder: (data: Record<string, unknown>) => api.post<Order>('/orders/patient', data),
  cancelOrder: (id: string) => api.patch<Order>(`/orders/patient/${id}/cancel`),
};

export default api;
