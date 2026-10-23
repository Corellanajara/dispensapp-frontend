import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Patient } from '@/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { PATIENT_STATUS_LABELS } from '@/lib/constants';
import { PageHeader } from '@/components/shared/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Eye } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAppConfig } from '@/hooks/use-app-config';
import { usePatients, useCreatePatient } from '@/hooks/use-patients';
import { SucursalBadge, RecetaBadge, PatientStatusBadge } from '@/components/patients/PatientBadges';

const PAGE_SIZE = 20;

export function PatientsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sinSucursal, setSinSucursal] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { sucursalActiva, hasRole } = useAuth();
  const { diasAvisoReceta } = useAppConfig();

  const params: Record<string, string> = { page: String(page), limit: String(PAGE_SIZE) };
  if (search) params.search = search;
  if (statusFilter) params.estado = statusFilter;
  if (sinSucursal) params.sinSucursal = 'true';

  const { data, isLoading } = usePatients(params);
  const patients = data?.data ?? [];
  const total = data?.pagination.total ?? 0;
  const pages = data?.pagination.pages ?? 1;

  const createPatient = useCreatePatient();

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => (f.get(k) as string) || '';
    const payload: Partial<Patient> = {
      rut: get('rut'),
      nombre: get('nombre'),
      apellido: get('apellido'),
      fechaNacimiento: get('fechaNacimiento'),
      telefono: get('telefono'),
      email: get('email'),
      direccion: {
        calle: get('calle'),
        numero: get('numero'),
        comuna: get('comuna'),
        ciudad: get('ciudad'),
        region: get('region'),
      },
      medicoTratante: {
        nombre: get('medico'),
        especialidad: get('especialidad'),
        telefono: get('medicoTelefono'),
      },
      limiteMensualUnidades: Math.max(parseInt(get('limiteMensualUnidades'), 10) || 0, 0),
    };
    createPatient.mutate(payload, { onSuccess: () => setIsCreateOpen(false) });
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader title="Pacientes" description="Fichas, documentos y estado de cada paciente">
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo paciente
        </Button>
      </PageHeader>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar paciente</DialogTitle>
            <DialogDescription>
              {sucursalActiva
                ? `Quedará en el dispensario ${sucursalActiva.nombre}. Después sube sus documentos para activarlo.`
                : 'Selecciona un dispensario en el menú lateral antes de registrar al paciente.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field id="rut" label="RUT" placeholder="12345678-9" required />
              <Field id="fechaNacimiento" label="Fecha de nacimiento" type="date" required />
              <Field id="nombre" label="Nombre" required />
              <Field id="apellido" label="Apellido" required />
              <Field id="telefono" label="Teléfono" placeholder="+56912345678" required />
              <Field id="email" label="Email" type="email" required />
            </div>

            <h3 className="font-semibold text-sm mt-4">Dirección</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field id="calle" label="Calle" required />
              <Field id="numero" label="Número" required />
              <Field id="comuna" label="Comuna" required />
              <Field id="ciudad" label="Ciudad" required />
              <div className="sm:col-span-2">
                <Field id="region" label="Región" required />
              </div>
            </div>

            <h3 className="font-semibold text-sm mt-4">Médico tratante</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field id="medico" label="Nombre del médico" required />
              <Field id="especialidad" label="Especialidad" />
              <Field id="medicoTelefono" label="Teléfono del médico" />
              <div className="space-y-2">
                <Label htmlFor="limiteMensualUnidades">Límite mensual (unidades)</Label>
                <Input id="limiteMensualUnidades" name="limiteMensualUnidades" type="number" min={0} defaultValue="0" />
                <p className="text-xs text-muted-foreground">0 = sin límite. Cuenta los últimos 30 días.</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!sucursalActiva || createPatient.isPending}>
                {createPatient.isPending ? 'Registrando…' : 'Registrar paciente'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="relative flex-1 sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, apellido o RUT…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10 rounded-xl"
              />
            </div>
            <Select
              value={statusFilter || 'all'}
              onValueChange={(v: string | null) => {
                setStatusFilter(v === 'all' || !v ? '' : v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue>
                  {(v: string) => (v === 'all' || !v ? 'Todos los estados' : PATIENT_STATUS_LABELS[v as Patient['estado']])}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {Object.entries(PATIENT_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasRole('admin', 'operador') && (
              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                <Switch
                  checked={sinSucursal}
                  onCheckedChange={(v: boolean) => {
                    setSinSucursal(v);
                    setPage(1);
                  }}
                />
                Sin dispensario
              </label>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <>
              {/* Móvil */}
              <div className="md:hidden space-y-3">
                {patients.length === 0 ? (
                  <p className="text-center py-12 text-sm text-muted-foreground/70">No se encontraron pacientes</p>
                ) : (
                  patients.map((patient) => (
                    <Link key={patient._id} to={`/pacientes/${patient._id}`} className="block">
                      <Card>
                        <CardContent className="pt-4 space-y-2">
                          <div className="flex justify-between items-start gap-2">
                            <p className="font-medium">
                              {patient.nombre} {patient.apellido}
                            </p>
                            <PatientStatusBadge patient={patient} />
                          </div>
                          <p className="text-xs font-mono text-muted-foreground">RUT {patient.rut}</p>
                          <div className="flex flex-wrap items-center gap-2">
                            <SucursalBadge patient={patient} />
                            <RecetaBadge patient={patient} diasAviso={diasAvisoReceta} />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))
                )}
              </div>

              {/* Escritorio */}
              <div className="hidden md:block overflow-x-auto rounded-2xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>RUT</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Dispensario</TableHead>
                      <TableHead>Receta</TableHead>
                      <TableHead>Médico</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {patients.map((patient) => (
                      <TableRow key={patient._id}>
                        <TableCell className="font-mono">{patient.rut}</TableCell>
                        <TableCell className="font-medium">
                          {patient.nombre} {patient.apellido}
                        </TableCell>
                        <TableCell>
                          <SucursalBadge patient={patient} />
                        </TableCell>
                        <TableCell>
                          <RecetaBadge patient={patient} diasAviso={diasAvisoReceta} />
                        </TableCell>
                        <TableCell>{patient.medicoTratante?.nombre ?? '—'}</TableCell>
                        <TableCell>
                          <PatientStatusBadge patient={patient} />
                        </TableCell>
                        <TableCell>
                          <Link to={`/pacientes/${patient._id}`} aria-label="Ver ficha">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                    {patients.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-sm text-muted-foreground/70">
                          No se encontraron pacientes
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-between items-center mt-4">
                <p className="text-sm text-muted-foreground">
                  {total} paciente{total === 1 ? '' : 's'}
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                    Anterior
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {page} / {Math.max(pages, 1)}
                  </span>
                  <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>
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

function Field({
  id,
  label,
  type = 'text',
  placeholder,
  required,
}: {
  id: string;
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} type={type} placeholder={placeholder} required={required} />
    </div>
  );
}
