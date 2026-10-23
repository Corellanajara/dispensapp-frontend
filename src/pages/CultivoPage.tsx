import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Cosecha, EspacioCultivo, PatientRef, Product } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Sprout, Wheat, PackagePlus } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { NativeSelect } from '@/components/inventory/NativeSelect';
import { populated, ubicacionLabel } from '@/components/inventory/helpers';
import { Spinner } from '@/components/inventory/Spinner';
import { CederEspacioDialog, IngresarCosechaDialog } from '@/components/cultivo/CultivoDialogs';
import { ESPACIO_ESTADO_LABELS, COSECHA_ESTADO_LABELS } from '@/lib/constants';
import { formatDateOnly, formatNumber } from '@/lib/format';
import { useAuth } from '@/contexts/AuthContext';
import { useEspacios, useCosechas } from '@/hooks/use-cultivo';

const ESPACIO_VARIANTS: Record<string, string> = {
  activo: 'bg-success/15 text-success border-success/25',
  cerrado: 'bg-muted text-muted-foreground border-border',
};
const COSECHA_VARIANTS: Record<string, string> = {
  registrada: 'bg-warning/15 text-warning border-warning/25',
  en_inventario: 'bg-success/15 text-success border-success/25',
};

function pacienteTexto(p: string | PatientRef) {
  const x = populated(p);
  return x ? { nombre: `${x.nombre} ${x.apellido}`, rut: x.rut } : { nombre: '—', rut: '' };
}

export function CultivoPage() {
  const { hasRole } = useAuth();
  const puedeOperar = hasRole('admin', 'operador', 'cultivo');
  const [cederOpen, setCederOpen] = useState(false);

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader title="Cultivo" description="Espacios cedidos a pacientes, sus códigos QR y las cosechas">
        {puedeOperar && (
          <Button onClick={() => setCederOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Ceder espacio
          </Button>
        )}
      </PageHeader>

      <Tabs defaultValue="espacios">
        <TabsList>
          <TabsTrigger value="espacios">Espacios</TabsTrigger>
          <TabsTrigger value="cosechas">Cosechas</TabsTrigger>
        </TabsList>
        <TabsContent value="espacios">
          <EspaciosTab />
        </TabsContent>
        <TabsContent value="cosechas">
          <CosechasTab puedeOperar={puedeOperar} />
        </TabsContent>
      </Tabs>

      <CederEspacioDialog open={cederOpen} onOpenChange={setCederOpen} />
    </div>
  );
}

function EspaciosTab() {
  const navigate = useNavigate();
  const [estado, setEstado] = useState('activo');
  const [search, setSearch] = useState('');
  const params: Record<string, string> = {};
  if (estado) params.estado = estado;
  if (search) params.search = search;
  const { data: espacios = [], isLoading } = useEspacios(params);

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por código o flor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 rounded-xl"
            />
          </div>
          <NativeSelect value={estado} onChange={(e) => setEstado(e.target.value)} className="sm:w-48">
            <option value="">Todos</option>
            <option value="activo">Activos</option>
            <option value="cerrado">Cerrados</option>
          </NativeSelect>
        </div>

        {isLoading ? (
          <Spinner />
        ) : espacios.length === 0 ? (
          <EmptyState icon={Sprout} title="No hay espacios" description="Cede un espacio de una sala de cultivo a un paciente activo." />
        ) : (
          <>
            <div className="md:hidden space-y-3">
              {espacios.map((e) => (
                <EspacioCard key={e._id} espacio={e} />
              ))}
            </div>
            <div className="hidden md:block overflow-x-auto rounded-2xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Flor</TableHead>
                    <TableHead className="text-right">m²</TableHead>
                    <TableHead>Sala</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Inicio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {espacios.map((e) => {
                    const p = pacienteTexto(e.paciente);
                    return (
                      <TableRow key={e._id} className="cursor-pointer" onClick={() => navigate(`/cultivo/espacios/${e._id}`)}>
                        <TableCell className="font-mono text-xs">{e.codigo}</TableCell>
                        <TableCell>
                          <p className="font-medium">{p.nombre}</p>
                          <p className="text-xs text-muted-foreground font-mono">{p.rut}</p>
                        </TableCell>
                        <TableCell>{e.flor}</TableCell>
                        <TableCell className="text-right">{e.metrosCuadrados}</TableCell>
                        <TableCell>{ubicacionLabel(e.ubicacion)}</TableCell>
                        <TableCell>
                          <StatusBadge label={ESPACIO_ESTADO_LABELS[e.estado]} variant={ESPACIO_VARIANTS[e.estado]} />
                        </TableCell>
                        <TableCell>{formatDateOnly(e.fechaInicio)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function EspacioCard({ espacio: e }: { espacio: EspacioCultivo }) {
  const p = pacienteTexto(e.paciente);
  return (
    <Link to={`/cultivo/espacios/${e._id}`} className="block rounded-xl border p-4 hover:bg-muted/40">
      <div className="flex justify-between items-start gap-2">
        <p className="font-mono text-sm font-medium">{e.codigo}</p>
        <StatusBadge label={ESPACIO_ESTADO_LABELS[e.estado]} variant={ESPACIO_VARIANTS[e.estado]} />
      </div>
      <p className="font-medium mt-1">{p.nombre}</p>
      <p className="text-sm text-muted-foreground">{e.flor} · {e.metrosCuadrados} m²</p>
      <p className="text-xs text-muted-foreground mt-1">{ubicacionLabel(e.ubicacion)}</p>
    </Link>
  );
}

function CosechasTab({ puedeOperar }: { puedeOperar: boolean }) {
  const [estado, setEstado] = useState('');
  const { data: cosechas = [], isLoading } = useCosechas(estado ? { estado } : {});
  const [ingresando, setIngresando] = useState<Cosecha | null>(null);

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <NativeSelect value={estado} onChange={(e) => setEstado(e.target.value)} className="sm:w-56">
          <option value="">Todas</option>
          <option value="registrada">Pendientes de ingresar</option>
          <option value="en_inventario">En inventario</option>
        </NativeSelect>

        {isLoading ? (
          <Spinner />
        ) : cosechas.length === 0 ? (
          <EmptyState icon={Wheat} title="No hay cosechas" description="Las cosechas se registran desde la ficha de cada espacio." />
        ) : (
          <div className="overflow-x-auto rounded-2xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lote</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Espacio</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead className="text-right">Húmedo / seco (g)</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Inventario</TableHead>
                  {puedeOperar && <TableHead />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {cosechas.map((c) => {
                  const esp = populated(c.espacio);
                  const p = pacienteTexto(c.paciente);
                  const prod = populated<Pick<Product, '_id' | 'nombre'>>(c.producto);
                  return (
                    <TableRow key={c._id}>
                      <TableCell>
                        <Link to={`/inventario?lote=${encodeURIComponent(c.lote)}`} className="font-mono text-xs text-primary hover:underline">
                          {c.lote}
                        </Link>
                      </TableCell>
                      <TableCell>{formatDateOnly(c.fecha)}</TableCell>
                      <TableCell>
                        {esp ? (
                          <Link to={`/cultivo/espacios/${esp._id}`} className="hover:underline">
                            <span className="font-mono text-xs">{esp.codigo}</span>
                            <span className="block text-xs text-muted-foreground">{esp.flor}</span>
                          </Link>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        <p>{p.nombre}</p>
                        <p className="text-xs text-muted-foreground font-mono">{p.rut}</p>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {c.pesoHumedo != null ? formatNumber(c.pesoHumedo) : '—'} / {c.pesoSeco != null ? formatNumber(c.pesoSeco) : '—'}
                      </TableCell>
                      <TableCell>
                        <StatusBadge label={COSECHA_ESTADO_LABELS[c.estado]} variant={COSECHA_VARIANTS[c.estado]} />
                      </TableCell>
                      <TableCell className="text-sm">
                        {c.estado === 'en_inventario' ? (
                          <>
                            <p>{prod?.nombre ?? '—'} · {c.cantidadIngresada}</p>
                            <p className="text-xs text-muted-foreground">{ubicacionLabel(c.ubicacionDestino)}</p>
                          </>
                        ) : '—'}
                      </TableCell>
                      {puedeOperar && (
                        <TableCell className="text-right">
                          {c.estado === 'registrada' && (
                            <Button variant="outline" size="sm" onClick={() => setIngresando(c)}>
                              <PackagePlus className="h-4 w-4 mr-1" />
                              Ingresar a inventario
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      <IngresarCosechaDialog cosecha={ingresando} onClose={() => setIngresando(null)} />
    </Card>
  );
}
