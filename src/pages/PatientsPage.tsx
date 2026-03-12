import { useEffect, useState, useCallback } from 'react';
import { patientsAPI } from '@/services/api';
import type { Patient, PatientStatus } from '@/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, Search, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

const statusColors: Record<PatientStatus, string> = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  aprobado: 'bg-green-100 text-green-800',
  rechazado: 'bg-red-100 text-red-800',
  suspendido: 'bg-gray-100 text-gray-800',
};

const statusLabels: Record<PatientStatus, string> = {
  pendiente: 'Pendiente',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
  suspendido: 'Suspendido',
};

export function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const fetchPatients = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = { page: page.toString(), limit: '20' };
      if (search) params.search = search;
      if (statusFilter) params.estado = statusFilter;
      const { data } = await patientsAPI.list(params);
      setPatients(data.data);
      setTotal(data.pagination.total);
    } catch (error) {
      console.error('Error fetching patients:', error);
      toast.error('Error al cargar pacientes');
    } finally {
      setIsLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      rut: formData.get('rut') as string,
      nombre: formData.get('nombre') as string,
      apellido: formData.get('apellido') as string,
      fechaNacimiento: formData.get('fechaNacimiento') as string,
      telefono: formData.get('telefono') as string,
      email: formData.get('email') as string,
      direccion: {
        calle: formData.get('calle') as string,
        numero: formData.get('numero') as string,
        comuna: formData.get('comuna') as string,
        ciudad: formData.get('ciudad') as string,
        region: formData.get('region') as string,
      },
      medicoTratante: {
        nombre: formData.get('medico') as string,
        especialidad: formData.get('especialidad') as string,
        telefono: formData.get('medicoTelefono') as string,
      },
      limiteCompra: parseInt(formData.get('limiteCompra') as string) || 0,
    };

    try {
      await patientsAPI.create(data);
      toast.success('Paciente creado exitosamente');
      setIsCreateOpen(false);
      fetchPatients();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      toast.error(axiosError.response?.data?.message || 'Error al crear paciente');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Pacientes</h1>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Paciente
          </Button>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Registrar Nuevo Paciente</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rut">RUT</Label>
                  <Input id="rut" name="rut" placeholder="12345678-9" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fechaNacimiento">Fecha Nacimiento</Label>
                  <Input id="fechaNacimiento" name="fechaNacimiento" type="date" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre</Label>
                  <Input id="nombre" name="nombre" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apellido">Apellido</Label>
                  <Input id="apellido" name="apellido" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input id="telefono" name="telefono" placeholder="+56912345678" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" required />
                </div>
              </div>

              <h3 className="font-semibold text-sm mt-4">Dirección</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="calle">Calle</Label>
                  <Input id="calle" name="calle" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numero">Número</Label>
                  <Input id="numero" name="numero" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="comuna">Comuna</Label>
                  <Input id="comuna" name="comuna" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ciudad">Ciudad</Label>
                  <Input id="ciudad" name="ciudad" required />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="region">Región</Label>
                  <Input id="region" name="region" required />
                </div>
              </div>

              <h3 className="font-semibold text-sm mt-4">Médico Tratante</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="medico">Nombre del Médico</Label>
                  <Input id="medico" name="medico" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="especialidad">Especialidad</Label>
                  <Input id="especialidad" name="especialidad" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="medicoTelefono">Teléfono Médico</Label>
                  <Input id="medicoTelefono" name="medicoTelefono" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="limiteCompra">Límite de Compra (CLP)</Label>
                  <Input id="limiteCompra" name="limiteCompra" type="number" defaultValue="0" />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Registrar Paciente</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, apellido o RUT..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v: string | null) => { setStatusFilter(v === 'all' || !v ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="aprobado">Aprobado</SelectItem>
                <SelectItem value="rechazado">Rechazado</SelectItem>
                <SelectItem value="suspendido">Suspendido</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>RUT</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Médico</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patients.map((patient) => (
                    <TableRow key={patient._id}>
                      <TableCell className="font-mono">{patient.rut}</TableCell>
                      <TableCell className="font-medium">
                        {patient.nombre} {patient.apellido}
                      </TableCell>
                      <TableCell>{patient.email}</TableCell>
                      <TableCell>{patient.telefono}</TableCell>
                      <TableCell>{patient.medicoTratante?.nombre ?? '—'}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[patient.estado]}>
                          {statusLabels[patient.estado]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Link to={`/pacientes/${patient._id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                  {patients.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                        No se encontraron pacientes
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="flex justify-between items-center mt-4">
                <p className="text-sm text-muted-foreground">
                  Total: {total} pacientes
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={patients.length < 20}
                    onClick={() => setPage(page + 1)}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
