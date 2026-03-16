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
  useSidebar,
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { UserRole } from '@/types';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  roles: UserRole[];
  shortcut?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: 'General',
    items: [
      { title: 'Dashboard', url: '/', icon: LayoutDashboard, roles: ['admin', 'operador', 'produccion', 'finanzas'], shortcut: 'D' },
    ],
  },
  {
    label: 'Operaciones',
    items: [
      { title: 'Pacientes', url: '/pacientes', icon: Users, roles: ['admin', 'operador'], shortcut: 'P' },
      { title: 'Pedidos', url: '/pedidos', icon: ShoppingCart, roles: ['admin', 'operador'], shortcut: 'O' },
      { title: 'Productos', url: '/productos', icon: Package, roles: ['admin', 'operador', 'produccion'] },
      { title: 'Inventario', url: '/inventario', icon: Warehouse, roles: ['admin', 'operador'] },
      { title: 'Producción', url: '/produccion', icon: Factory, roles: ['admin', 'operador', 'produccion'] },
    ],
  },
  {
    label: 'Administración',
    items: [
      { title: 'Finanzas', url: '/finanzas', icon: DollarSign, roles: ['admin', 'finanzas'] },
      { title: 'Usuarios', url: '/usuarios', icon: Settings, roles: ['admin'] },
      { title: 'Auditoría', url: '/auditoria', icon: Shield, roles: ['admin'] },
    ],
  },
];

export function AppSidebar() {
  const { user, logout, hasRole } = useAuth();
  const { pathname } = useLocation();
  const { isMobile, setOpenMobile } = useSidebar();

  const closeMobileMenu = () => {
    if (isMobile) setOpenMobile(false);
  };

  const isActive = (url: string) => {
    if (url === '/') return pathname === '/';
    return pathname.startsWith(url);
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-5 pb-4">
        <Link to="/" className="flex items-center gap-3" onClick={closeMobileMenu}>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-sm">
            <Leaf className="h-4.5 w-4.5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight">DispensApp</h1>
            <p className="text-[11px] text-muted-foreground/80">Sistema de Gestión</p>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-3">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter((item) =>
            item.roles.some((role) => hasRole(role))
          );
          if (visibleItems.length === 0) return null;

          return (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel className="uppercase text-[10px] tracking-widest text-muted-foreground/70 font-medium px-3 mb-1">
                {group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleItems.map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        render={<NavLink to={item.url} />}
                        isActive={isActive(item.url)}
                        className={`flex items-center gap-2.5 w-full rounded-xl py-2.5 px-3 transition-all duration-200 ${
                          isActive(item.url)
                            ? 'tint-blue text-primary font-medium'
                            : 'hover:bg-accent/60'
                        }`}
                        onClick={closeMobileMenu}
                      >
                        <div className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                          isActive(item.url)
                            ? 'bg-primary/10'
                            : 'bg-muted/50'
                        }`}>
                          <item.icon className="h-4 w-4" />
                        </div>
                        <span className="flex-1 text-[13.5px]">{item.title}</span>
                        {item.shortcut && (
                          <kbd className="hidden lg:inline-flex h-5 items-center rounded-md bg-muted/50 px-1.5 font-mono text-[10px] text-muted-foreground/70 border border-border/40">
                            {item.shortcut}
                          </kbd>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="p-5 pt-3">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 ring-2 ring-primary/20 flex items-center justify-center text-primary font-semibold text-sm">
            {user?.nombre?.charAt(0)}{user?.apellido?.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {user?.nombre} {user?.apellido}
            </p>
            <p className="text-[11px] text-muted-foreground/70 capitalize">{user?.role}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="w-full rounded-xl" onClick={() => { closeMobileMenu(); logout(); }}>
          <LogOut className="h-4 w-4 mr-2" />
          Cerrar Sesión
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
