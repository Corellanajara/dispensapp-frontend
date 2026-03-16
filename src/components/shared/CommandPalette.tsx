import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
} from '@/components/ui/command';
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
  User,
} from 'lucide-react';
import type { UserRole } from '@/types';
import type { LucideIcon } from 'lucide-react';

interface CommandRoute {
  title: string;
  url: string;
  icon: LucideIcon;
  roles: UserRole[];
  group: string;
  shortcut?: string;
}

const routes: CommandRoute[] = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard, roles: ['admin', 'operador', 'produccion', 'finanzas'], group: 'Navegación', shortcut: 'D' },
  { title: 'Pacientes', url: '/pacientes', icon: Users, roles: ['admin', 'operador'], group: 'Navegación', shortcut: 'P' },
  { title: 'Pedidos', url: '/pedidos', icon: ShoppingCart, roles: ['admin', 'operador'], group: 'Navegación', shortcut: 'O' },
  { title: 'Productos', url: '/productos', icon: Package, roles: ['admin', 'operador', 'produccion'], group: 'Navegación' },
  { title: 'Inventario', url: '/inventario', icon: Warehouse, roles: ['admin', 'operador'], group: 'Navegación' },
  { title: 'Producción', url: '/produccion', icon: Factory, roles: ['admin', 'operador', 'produccion'], group: 'Navegación' },
  { title: 'Finanzas', url: '/finanzas', icon: DollarSign, roles: ['admin', 'finanzas'], group: 'Administración' },
  { title: 'Usuarios', url: '/usuarios', icon: Settings, roles: ['admin'], group: 'Administración' },
  { title: 'Auditoría', url: '/auditoria', icon: Shield, roles: ['admin'], group: 'Administración' },
  // Patient routes
  { title: 'Mi Panel', url: '/portal', icon: LayoutDashboard, roles: ['paciente'], group: 'Portal' },
  { title: 'Catálogo', url: '/portal/catalogo', icon: Package, roles: ['paciente'], group: 'Portal' },
  { title: 'Mis Pedidos', url: '/portal/pedidos', icon: ShoppingCart, roles: ['paciente'], group: 'Portal' },
  { title: 'Mi Perfil', url: '/portal/perfil', icon: User, roles: ['paciente'], group: 'Portal' },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { hasRole } = useAuth();

  const filteredRoutes = routes.filter((r) =>
    r.roles.some((role) => hasRole(role))
  );

  // Group routes by their group label
  const groups = filteredRoutes.reduce<Record<string, CommandRoute[]>>((acc, route) => {
    if (!acc[route.group]) acc[route.group] = [];
    acc[route.group].push(route);
    return acc;
  }, {});

  const handleSelect = useCallback(
    (url: string) => {
      setOpen(false);
      navigate(url);
    },
    [navigate]
  );

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Buscar"
      description="Navega rápidamente a cualquier sección"
    >
      <CommandInput placeholder="Buscar página..." />
      <CommandList>
        <CommandEmpty>No se encontraron resultados.</CommandEmpty>
        {Object.entries(groups).map(([group, items]) => (
          <CommandGroup key={group} heading={group}>
            {items.map((route) => (
              <CommandItem
                key={route.url}
                onSelect={() => handleSelect(route.url)}
              >
                <route.icon className="h-4 w-4 mr-2" />
                <span>{route.title}</span>
                {route.shortcut && (
                  <CommandShortcut>{route.shortcut}</CommandShortcut>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
