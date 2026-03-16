import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Leaf, AlertCircle } from 'lucide-react';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      setError(axiosError.response?.data?.message || 'Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-[40%] -left-[20%] h-[80%] w-[70%] rounded-full bg-[oklch(0.94_0.04_264)] dark:bg-[oklch(0.18_0.04_264)] blur-[120px] opacity-60 dark:opacity-25" />
        <div className="absolute -bottom-[20%] -right-[20%] h-[60%] w-[60%] rounded-full bg-[oklch(0.93_0.04_290)] dark:bg-[oklch(0.17_0.04_290)] blur-[120px] opacity-50 dark:opacity-20" />
        <div className="absolute top-[20%] right-[10%] h-[40%] w-[40%] rounded-full bg-[oklch(0.95_0.03_240)] dark:bg-[oklch(0.19_0.03_240)] blur-[100px] opacity-40 dark:opacity-15" />
      </div>

      <Card className="relative w-full max-w-md mx-4 rounded-3xl card-elevated border-border/30 py-8 animate-slide-up">
        <CardHeader className="text-center pb-2 px-8">
          <div className="flex justify-center mb-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,oklch(0.545_0.175_262),oklch(0.58_0.16_280))] shadow-lg shadow-primary/20">
              <Leaf className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <CardDescription className="text-sm text-muted-foreground/80 tracking-wide">Bienvenido de vuelta</CardDescription>
          <CardTitle className="text-2xl font-semibold tracking-tight">DispensApp</CardTitle>
        </CardHeader>
        <CardContent className="px-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="correo@ejemplo.cl"
                className="h-11 rounded-xl border-border/50 bg-muted/30 px-4 focus-visible:border-ring focus-visible:ring-ring/30"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••"
                className="h-11 rounded-xl border-border/50 bg-muted/30 px-4 focus-visible:border-ring focus-visible:ring-ring/30"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full h-11 rounded-xl text-sm font-semibold shadow-md shadow-primary/15 hover:shadow-lg hover:shadow-primary/25 transition-all"
              disabled={isLoading}
            >
              {isLoading ? 'Ingresando...' : 'Iniciar Sesión'}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm text-muted-foreground">
            ¿Eres paciente?{' '}
            <Link to="/registro-paciente" className="text-primary font-medium hover:text-primary/80 transition-colors">
              Regístrate aquí
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
