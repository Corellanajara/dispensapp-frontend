import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AppLayout } from '@/components/layout/AppLayout';
import { PatientLayout } from '@/components/layout/PatientLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { CommandPalette } from '@/components/shared/CommandPalette';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { PatientsPage } from '@/pages/PatientsPage';
import { PatientDetailPage } from '@/pages/PatientDetailPage';
import { ProductsPage } from '@/pages/ProductsPage';
import { OrdersPage } from '@/pages/OrdersPage';
import { OrderDetailPage } from '@/pages/OrderDetailPage';
import { InventoryPage } from '@/pages/InventoryPage';
import { ProductionPage } from '@/pages/ProductionPage';
import { FinancePage } from '@/pages/FinancePage';
import { UsersPage } from '@/pages/UsersPage';
import { AuditPage } from '@/pages/AuditPage';
import { SucursalesPage } from '@/pages/SucursalesPage';
import { PatientRegisterPage } from '@/pages/patient/PatientRegisterPage';
import { PatientDashboardPage } from '@/pages/patient/PatientDashboardPage';
import { CatalogPage } from '@/pages/patient/CatalogPage';
import { PatientOrdersPage } from '@/pages/patient/PatientOrdersPage';
import { PatientNewOrderPage } from '@/pages/patient/PatientNewOrderPage';
import { PatientOrderDetailPage } from '@/pages/patient/PatientOrderDetailPage';
import { PatientProfilePage } from '@/pages/patient/PatientProfilePage';
import { PatientExpedientePage } from '@/pages/PatientExpedientePage';
import { CultivoPage } from '@/pages/CultivoPage';
import { EspacioDetailPage } from '@/pages/EspacioDetailPage';
import { QRScanPage } from '@/pages/QRScanPage';
import { UbicacionesPage } from '@/pages/UbicacionesPage';
import { TransferenciasPage } from '@/pages/TransferenciasPage';
import { FiscalizacionPage } from '@/pages/FiscalizacionPage';
import { FirmaConfigPage } from '@/pages/FirmaConfigPage';
import { FirmaCompletadaPage } from '@/pages/FirmaCompletadaPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      gcTime: 5 * 60_000,
    },
  },
});

function AuthRedirect() {
  const { user } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  if (user) return <Navigate to={from ?? (user.role === 'paciente' ? '/portal' : '/')} replace />;
  return <LoginPage />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <TooltipProvider>
            <Routes>
              <Route path="/login" element={<AuthRedirect />} />
              <Route path="/registro-paciente" element={<PatientRegisterPage />} />
              <Route path="/firma/completada" element={<FirmaCompletadaPage />} />

              {/* Admin/Staff Layout (sidebar) */}
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={<DashboardPage />} />
                <Route path="/pacientes" element={<ProtectedRoute roles={['admin', 'operador']}><PatientsPage /></ProtectedRoute>} />
                <Route path="/pacientes/:id" element={<ProtectedRoute roles={['admin', 'operador']}><PatientDetailPage /></ProtectedRoute>} />
                <Route path="/pacientes/:id/expediente" element={<ProtectedRoute roles={['admin', 'operador']}><PatientExpedientePage /></ProtectedRoute>} />
                {/* /pedidos = notas de dispensación (se mantiene la ruta para no romper enlaces) */}
                <Route path="/pedidos" element={<ProtectedRoute roles={['admin', 'operador']}><OrdersPage /></ProtectedRoute>} />
                <Route path="/pedidos/:id" element={<ProtectedRoute roles={['admin', 'operador']}><OrderDetailPage /></ProtectedRoute>} />
                <Route path="/cultivo" element={<ProtectedRoute roles={['admin', 'operador', 'cultivo']}><CultivoPage /></ProtectedRoute>} />
                <Route path="/cultivo/espacios/:id" element={<ProtectedRoute roles={['admin', 'operador', 'cultivo']}><EspacioDetailPage /></ProtectedRoute>} />
                <Route path="/qr/:codigo" element={<ProtectedRoute roles={['admin', 'operador', 'cultivo', 'produccion']}><QRScanPage /></ProtectedRoute>} />
                <Route path="/productos" element={<ProtectedRoute roles={['admin', 'operador', 'produccion']}><ProductsPage /></ProtectedRoute>} />
                <Route path="/inventario" element={<ProtectedRoute roles={['admin', 'operador', 'cultivo', 'produccion']}><InventoryPage /></ProtectedRoute>} />
                <Route path="/transferencias" element={<ProtectedRoute roles={['admin', 'operador', 'cultivo', 'produccion']}><TransferenciasPage /></ProtectedRoute>} />
                <Route path="/ubicaciones" element={<ProtectedRoute roles={['admin', 'operador', 'cultivo', 'produccion']}><UbicacionesPage /></ProtectedRoute>} />
                <Route path="/produccion" element={<ProtectedRoute roles={['admin', 'operador', 'produccion']}><ProductionPage /></ProtectedRoute>} />
                <Route path="/fiscalizacion" element={<ProtectedRoute roles={['admin', 'operador']}><FiscalizacionPage /></ProtectedRoute>} />
                <Route path="/finanzas" element={<ProtectedRoute roles={['admin', 'finanzas']}><FinancePage /></ProtectedRoute>} />
                <Route path="/usuarios" element={<ProtectedRoute roles={['admin']}><UsersPage /></ProtectedRoute>} />
                <Route path="/sucursales" element={<ProtectedRoute roles={['admin']}><SucursalesPage /></ProtectedRoute>} />
                <Route path="/auditoria" element={<ProtectedRoute roles={['admin']}><AuditPage /></ProtectedRoute>} />
                <Route path="/configuracion/firma" element={<ProtectedRoute roles={['admin']}><FirmaConfigPage /></ProtectedRoute>} />
              </Route>

              {/* Patient Layout (top-nav) */}
              <Route
                element={
                  <ProtectedRoute roles={['paciente']}>
                    <PatientLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/portal" element={<PatientDashboardPage />} />
                <Route path="/portal/catalogo" element={<CatalogPage />} />
                <Route path="/portal/pedidos" element={<PatientOrdersPage />} />
                <Route path="/portal/pedidos/nuevo" element={<PatientNewOrderPage />} />
                <Route path="/portal/pedidos/:id" element={<PatientOrderDetailPage />} />
                <Route path="/portal/perfil" element={<PatientProfilePage />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <CommandPalette />
          </TooltipProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
