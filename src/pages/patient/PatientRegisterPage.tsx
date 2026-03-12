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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 py-8 px-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Leaf className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Registro de Paciente</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Cuenta */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Cuenta</h3>
              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input id="email" name="email" type="email" placeholder="correo@ejemplo.cl" required />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input id="password" name="password" type="password" placeholder="Mínimo 6 caracteres" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmarPassword">Confirmar Contraseña</Label>
                  <Input id="confirmarPassword" name="confirmarPassword" type="password" placeholder="Repetir contraseña" required />
                </div>
              </div>
            </div>

            {/* Datos Personales */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Datos Personales</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre</Label>
                  <Input id="nombre" name="nombre" placeholder="Tu nombre" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apellido">Apellido</Label>
                  <Input id="apellido" name="apellido" placeholder="Tu apellido" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rut">RUT</Label>
                  <Input id="rut" name="rut" placeholder="12.345.678-9" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fechaNacimiento">Fecha de Nacimiento</Label>
                  <Input id="fechaNacimiento" name="fechaNacimiento" type="date" required />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input id="telefono" name="telefono" placeholder="+56 9 1234 5678" required />
                </div>
              </div>
            </div>

            {/* Dirección */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Dirección</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="calle">Calle</Label>
                  <Input id="calle" name="calle" placeholder="Nombre de la calle" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numero">Número</Label>
                  <Input id="numero" name="numero" placeholder="123" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="comuna">Comuna</Label>
                  <Input id="comuna" name="comuna" placeholder="Tu comuna" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ciudad">Ciudad</Label>
                  <Input id="ciudad" name="ciudad" placeholder="Tu ciudad" required />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="region">Región</Label>
                  <Input id="region" name="region" placeholder="Tu región" required />
                </div>
              </div>
            </div>

            {/* Médico Tratante */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Médico Tratante</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="medicoNombre">Nombre del Médico</Label>
                  <Input id="medicoNombre" name="medicoNombre" placeholder="Dr. Juan Pérez" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="medicoEspecialidad">Especialidad (opcional)</Label>
                  <Input id="medicoEspecialidad" name="medicoEspecialidad" placeholder="Ej: Neurología" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="medicoTelefono">Teléfono del Médico (opcional)</Label>
                  <Input id="medicoTelefono" name="medicoTelefono" placeholder="+56 2 1234 5678" />
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
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

          <div className="mt-4 text-center text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Inicia sesión
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
