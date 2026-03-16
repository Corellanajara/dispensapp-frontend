import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { Outlet, useLocation } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Moon, Sun } from 'lucide-react';

const breadcrumbMap: Record<string, string> = {
  '/': 'Dashboard',
  '/pacientes': 'Pacientes',
  '/productos': 'Productos',
  '/pedidos': 'Pedidos',
  '/inventario': 'Inventario',
  '/produccion': 'Producción',
  '/finanzas': 'Finanzas',
  '/usuarios': 'Usuarios',
  '/auditoria': 'Auditoría',
};

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9 rounded-xl hover:bg-accent/60 transition-all duration-200"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
    >
      <Sun className="h-[18px] w-[18px] rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[18px] w-[18px] rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Cambiar tema</span>
    </Button>
  );
}

function Breadcrumbs() {
  const { pathname } = useLocation();

  const segments = pathname.split('/').filter(Boolean);
  const crumbs: { label: string; path: string }[] = [];

  if (pathname === '/') {
    crumbs.push({ label: 'Dashboard', path: '/' });
  } else {
    crumbs.push({ label: 'Inicio', path: '/' });
    let currentPath = '';
    for (const seg of segments) {
      currentPath += `/${seg}`;
      const label = breadcrumbMap[currentPath];
      if (label) {
        crumbs.push({ label, path: currentPath });
      } else {
        crumbs.push({ label: 'Detalle', path: currentPath });
      }
    }
  }

  return (
    <nav className="flex items-center gap-2 text-sm">
      {crumbs.map((crumb, i) => (
        <span key={crumb.path} className="flex items-center gap-2">
          {i > 0 && <span className="text-muted-foreground/30 text-xs font-light">/</span>}
          <span
            className={
              i === crumbs.length - 1
                ? 'font-medium text-foreground'
                : 'text-muted-foreground/70'
            }
          >
            {crumb.label}
          </span>
        </span>
      ))}
    </nav>
  );
}

export function AppLayout() {
  const { user } = useAuth();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col">
          <header className="backdrop-header sticky top-0 z-10 flex h-16 items-center gap-4 px-8">
            <SidebarTrigger />
            <Breadcrumbs />
            <div className="ml-auto flex items-center gap-3">
              <ThemeToggle />
              <div className="flex items-center gap-3 pl-3 border-l border-border/50">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 ring-2 ring-primary/20 flex items-center justify-center text-primary font-semibold text-xs">
                  {user?.nombre?.charAt(0)}{user?.apellido?.charAt(0)}
                </div>
                <span className="text-sm font-medium hidden md:inline">
                  {user?.nombre}
                </span>
              </div>
            </div>
          </header>
          <div className="flex-1 p-8">
            <div className="mx-auto max-w-7xl animate-fade-in">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
      <Toaster />
    </SidebarProvider>
  );
}
