import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { authAPI } from '@/services/api';
import type { UserRole, SucursalRef } from '@/types';

interface AuthUser {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  role: UserRole;
  sucursales: SucursalRef[];
  sucursalActiva?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  sucursalActiva: SucursalRef | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (...roles: UserRole[]) => boolean;
  setSucursalActiva: (sucursalId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);

  const getSucursalActiva = useCallback((): SucursalRef | null => {
    if (!user) return null;
    const savedId = localStorage.getItem('sucursalActiva');
    if (savedId && user.sucursales) {
      return user.sucursales.find((s) => s._id === savedId) || user.sucursales[0] || null;
    }
    return user.sucursales?.[0] || null;
  }, [user]);

  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');

      if (savedToken && savedUser) {
        try {
          setToken(savedToken);
          const parsedUser = JSON.parse(savedUser);
          setUser(parsedUser);
          const { data } = await authAPI.me();
          const meUser = data.user;
          const updatedUser: AuthUser = {
            id: String(meUser._id),
            email: meUser.email,
            nombre: meUser.nombre,
            apellido: meUser.apellido,
            role: meUser.role,
            sucursales: meUser.sucursales || [],
            sucursalActiva: meUser.sucursalActiva || null,
          };
          setUser(updatedUser);
          localStorage.setItem('user', JSON.stringify(updatedUser));

          if (updatedUser.sucursales?.length && !localStorage.getItem('sucursalActiva')) {
            localStorage.setItem('sucursalActiva', updatedUser.sucursales[0]._id);
          }
        } catch {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('sucursalActiva');
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await authAPI.login({ email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);

    if (data.user.sucursales?.length) {
      const defaultSucursal = data.user.sucursalActiva || data.user.sucursales[0]._id;
      localStorage.setItem('sucursalActiva', defaultSucursal);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('sucursalActiva');
    setToken(null);
    setUser(null);
  }, []);

  const hasRole = useCallback(
    (...roles: UserRole[]) => {
      if (!user) return false;
      return roles.includes(user.role);
    },
    [user]
  );

  const setSucursalActiva = useCallback(
    (sucursalId: string) => {
      localStorage.setItem('sucursalActiva', sucursalId);
      if (user) {
        setUser({ ...user, sucursalActiva: sucursalId });
      }
      authAPI.setSucursalActiva(sucursalId).catch(console.error);
    },
    [user]
  );

  const sucursalActiva = getSucursalActiva();

  return (
    <AuthContext.Provider value={{ user, token, isLoading, sucursalActiva, login, logout, hasRole, setSucursalActiva }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
