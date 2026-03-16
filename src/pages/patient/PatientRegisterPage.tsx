import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Leaf, AlertCircle, Loader2 } from 'lucide-react';

export function PatientRegisterPage() {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    const form = new FormData(e.currentTarget);
    const password = form.get('password') as string;
    const confirmarPassword = form.get('confirmarPassword') as string;

    if (password !== confirmarPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setIsLoading(true);

    try {
      const data: Record<string, unknown> = {
        email: form.get('email'),
        password,
        nombre: form.get('nombre'),
        apellido: form.get('apellido'),
        rut: form.get('rut'),
        fechaNacimiento: form.get('fechaNacimiento'),
        telefono: form.get('telefono'),
        direccion: {
          calle: form.get('calle'),
          numero: form.get('numero'),
          comuna: form.get('comuna'),
          ciudad: form.get('ciudad'),
          region: form.get('region'),
        },
        medicoTratante: {
          nombre: form.get('medicoNombre'),
          especialidad: form.get('medicoEspecialidad') || undefined,
          telefono: form.get('medicoTelefono') || undefined,
        },
      };

      const { data: res } = await authAPI.registerPatient(data);
      localStorage.setItem('token', res.token);
      localStorage.setItem('user', JSON.stringify(res.user));
      navigate('/portal');
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      setError(axiosError.response?.data?.message || 'Error al registrar. Intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const inputClassName = "h-11 rounded-xl border-border/50 bg-muted/30 px-4 focus-visible:border-ring focus-visible:ring-ring/30";

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background overflow-hidden py-10 px-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-[40%] -left-[20%] h-[80%] w-[70%] rounded-full bg-[oklch(0.94_0.04_264)] dark:bg-[oklch(0.18_0.04_264)] blur-[120px] opacity-60 dark:opacity-25" />
        <div className="absolute -bottom-[20%] -right-[20%] h-[60%] w-[60%] rounded-full bg-[oklch(0.93_0.04_290)] dark:bg-[oklch(0.17_0.04_290)] blur-[120px] opacity-50 dark:opacity-20" />
        <div className="absolute top-[20%] right-[10%] h-[40%] w-[40%] rounded-full bg-[oklch(0.95_0.03_240)] dark:bg-[oklch(0.19_0.03_240)] blur-[100px] opacity-40 dark:opacity-15" />
      </div>

      <Card className="relative w-full max-w-2xl rounded-3xl card-elevated border-border/30 py-8 animate-slide-up">
        <CardHeader className="text-center pb-2 px-8">
          <div className="flex justify-center mb-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,oklch(0.545_0.175_262),oklch(0.58_0.16_280))] shadow-lg shadow-primary/20">
              <Leaf className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-semibold tracking-tight">Registro de Paciente</CardTitle>
        </CardHeader>
        <CardContent className="px-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">Cuenta</span>
                <div className="h-px flex-1 bg-border/40" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input id="email" name="email" type="email" placeholder="correo@ejemplo.cl" className={inputClassName} required />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input id="password" name="password" type="password" placeholder="Mínimo 6 caracteres" className={inputClassName} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmarPassword">Confirmar Contraseña</Label>
                  <Input id="confirmarPassword" name="confirmarPassword" type="password" placeholder="Repetir contraseña" className={inputClassName} required />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">Datos Personales</span>
                <div className="h-px flex-1 bg-border/40" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre</Label>
                  <Input id="nombre" name="nombre" placeholder="Tu nombre" className={inputClassName} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apellido">Apellido</Label>
                  <Input id="apellido" name="apellido" placeholder="Tu apellido" className={inputClassName} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rut">RUT</Label>
                  <Input id="rut" name="rut" placeholder="12.345.678-9" className={inputClassName} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fechaNacimiento">Fecha de Nacimiento</Label>
                  <Input id="fechaNacimiento" name="fechaNacimiento" type="date" className={inputClassName} required />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input id="telefono" name="telefono" placeholder="+56 9 1234 5678" className={inputClassName} required />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">Dirección</span>
                <div className="h-px flex-1 bg-border/40" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="calle">Calle</Label>
                  <Input id="calle" name="calle" placeholder="Nombre de la calle" className={inputClassName} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numero">Número</Label>
                  <Input id="numero" name="numero" placeholder="123" className={inputClassName} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="comuna">Comuna</Label>
                  <Input id="comuna" name="comuna" placeholder="Tu comuna" className={inputClassName} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ciudad">Ciudad</Label>
                  <Input id="ciudad" name="ciudad" placeholder="Tu ciudad" className={inputClassName} required />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="region">Región</Label>
                  <Input id="region" name="region" placeholder="Tu región" className={inputClassName} required />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">Médico Tratante</span>
                <div className="h-px flex-1 bg-border/40" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="medicoNombre">Nombre del Médico</Label>
                  <Input id="medicoNombre" name="medicoNombre" placeholder="Dr. Juan Pérez" className={inputClassName} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="medicoEspecialidad">Especialidad (opcional)</Label>
                  <Input id="medicoEspecialidad" name="medicoEspecialidad" placeholder="Ej: Neurología" className={inputClassName} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="medicoTelefono">Teléfono del Médico (opcional)</Label>
                  <Input id="medicoTelefono" name="medicoTelefono" placeholder="+56 2 1234 5678" className={inputClassName} />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 rounded-xl text-sm font-semibold shadow-md shadow-primary/15 hover:shadow-lg hover:shadow-primary/25 transition-all"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Registrando...
                </>
              ) : (
                'Crear Cuenta'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-primary font-medium hover:text-primary/80 transition-colors">
              Inicia sesión
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
