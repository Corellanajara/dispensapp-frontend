import { Outlet, NavLink, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/sonner';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Leaf, Moon, Sun, LogOut, Package, ShoppingCart, User, LayoutDashboard, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const patientNav = [
  { title: 'Mi Panel', url: '/portal', icon: LayoutDashboard },
  { title: 'Catálogo', url: '/portal/catalogo', icon: Package },
  { title: 'Mis Pedidos', url: '/portal/pedidos', icon: ShoppingCart },
  { title: 'Mi Perfil', url: '/portal/perfil', icon: User },
];

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

export function PatientLayout() {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="backdrop-header sticky top-0 z-20">
        <div className="mx-auto max-w-5xl flex h-16 items-center gap-5 px-4 sm:px-6">
          <Link to="/portal" className="flex items-center gap-2.5 shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-sm">
              <Leaf className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sm hidden sm:inline">DispensApp</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1.5 ml-4">
            {patientNav.map((item) => (
              <NavLink
                key={item.url}
                to={item.url}
                end={item.url === '/portal'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'tint-blue text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                {item.title}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle />
            <div className="hidden md:flex items-center gap-3 pl-3 border-l border-border/50">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 ring-2 ring-primary/20 flex items-center justify-center text-primary font-semibold text-xs">
                {user?.nombre?.charAt(0)}{user?.apellido?.charAt(0)}
              </div>
              <span className="text-sm font-medium">{user?.nombre}</span>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-accent/60" onClick={logout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-xl md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-sm">
            <nav className="mx-auto max-w-5xl flex flex-col gap-1 px-4 py-4">
              {patientNav.map((item) => (
                <NavLink
                  key={item.url}
                  to={item.url}
                  end={item.url === '/portal'}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'tint-blue text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
                    )
                  }
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <item.icon className="h-4 w-4" />
                  {item.title}
                </NavLink>
              ))}
              <div className="border-t border-border/50 mt-2 pt-3">
                <Button variant="ghost" size="sm" className="w-full justify-start rounded-xl" onClick={logout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Cerrar Sesión
                </Button>
              </div>
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1 px-4 sm:px-6 py-8">
        <div className="mx-auto max-w-5xl animate-fade-in">
          <Outlet />
        </div>
      </main>

      <Toaster />
    </div>
  );
}
