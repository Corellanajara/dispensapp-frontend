import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import { PatientRegisterPage } from '@/pages/patient/PatientRegisterPage';
import { PatientDashboardPage } from '@/pages/patient/PatientDashboardPage';
import { CatalogPage } from '@/pages/patient/CatalogPage';
import { PatientOrdersPage } from '@/pages/patient/PatientOrdersPage';
import { PatientNewOrderPage } from '@/pages/patient/PatientNewOrderPage';
import { PatientOrderDetailPage } from '@/pages/patient/PatientOrderDetailPage';
import { PatientProfilePage } from '@/pages/patient/PatientProfilePage';

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
  if (user) return <Navigate to={user.role === 'paciente' ? '/portal' : '/'} replace />;
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
                <Route path="/productos" element={<ProtectedRoute roles={['admin', 'operador', 'produccion']}><ProductsPage /></ProtectedRoute>} />
                <Route path="/pedidos" element={<ProtectedRoute roles={['admin', 'operador']}><OrdersPage /></ProtectedRoute>} />
                <Route path="/pedidos/:id" element={<ProtectedRoute roles={['admin', 'operador']}><OrderDetailPage /></ProtectedRoute>} />
                <Route path="/inventario" element={<ProtectedRoute roles={['admin', 'operador']}><InventoryPage /></ProtectedRoute>} />
                <Route path="/produccion" element={<ProtectedRoute roles={['admin', 'operador', 'produccion']}><ProductionPage /></ProtectedRoute>} />
                <Route path="/finanzas" element={<ProtectedRoute roles={['admin', 'finanzas']}><FinancePage /></ProtectedRoute>} />
                <Route path="/usuarios" element={<ProtectedRoute roles={['admin']}><UsersPage /></ProtectedRoute>} />
                <Route path="/auditoria" element={<ProtectedRoute roles={['admin']}><AuditPage /></ProtectedRoute>} />
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
