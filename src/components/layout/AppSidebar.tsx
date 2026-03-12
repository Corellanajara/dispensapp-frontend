import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  Warehouse,
  Factory,
  DollarSign,
  Settings,
  Shield,
  LogOut,
  Leaf,
  UserCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { UserRole } from '@/types';

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    url: '/',
    icon: LayoutDashboard,
    roles: ['admin', 'operador', 'produccion', 'finanzas'],
  },
  {
    title: 'Pacientes',
    url: '/pacientes',
    icon: Users,
    roles: ['admin', 'operador'],
  },
  {
    title: 'Productos',
    url: '/productos',
    icon: Package,
    roles: ['admin', 'operador', 'produccion'],
  },
  {
    title: 'Pedidos',
    url: '/pedidos',
    icon: ShoppingCart,
    roles: ['admin', 'operador'],
  },
  {
    title: 'Inventario',
    url: '/inventario',
    icon: Warehouse,
    roles: ['admin', 'operador'],
  },
  {
    title: 'Producción',
    url: '/produccion',
    icon: Factory,
    roles: ['admin', 'operador', 'produccion'],
  },
  {
    title: 'Finanzas',
    url: '/finanzas',
    icon: DollarSign,
    roles: ['admin', 'finanzas'],
  },
  {
    title: 'Usuarios',
    url: '/usuarios',
    icon: Settings,
    roles: ['admin'],
  },
  {
    title: 'Auditoría',
    url: '/auditoria',
    icon: Shield,
    roles: ['admin'],
  },
  { title: 'Mi Panel', url: '/portal', icon: LayoutDashboard, roles: ['paciente'] },
  { title: 'Catálogo', url: '/portal/catalogo', icon: Package, roles: ['paciente'] },
  { title: 'Mis Pedidos', url: '/portal/pedidos', icon: ShoppingCart, roles: ['paciente'] },
  { title: 'Mi Perfil', url: '/portal/perfil', icon: UserCircle, roles: ['paciente'] },
];

export function AppSidebar() {
  const { user, logout, hasRole } = useAuth();
  const { pathname } = useLocation();
  const filteredItems = navItems.filter((item) =>
    item.roles.some((role) => hasRole(role))
  );

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link to="/" className="flex items-center gap-2">
          <Leaf className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-lg font-bold text-primary">Dispensapp</h1>
            <p className="text-xs text-muted-foreground">Sistema de Gestión</p>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegación</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    render={<NavLink to={item.url} />}
                    isActive={pathname === item.url}
                    className="flex items-center gap-2 w-full"
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
            {user?.nombre?.charAt(0)}{user?.apellido?.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {user?.nombre} {user?.apellido}
            </p>
            <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="w-full" onClick={logout}>
          <LogOut className="h-4 w-4 mr-2" />
          Cerrar Sesión
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
