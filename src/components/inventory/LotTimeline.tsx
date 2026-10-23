import { Link } from 'react-router-dom';
import type { LotTraceability, Product } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sprout, Factory, ArrowLeftRight, Warehouse, ClipboardList, History } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import {
  MOVEMENT_TYPE_LABELS,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_VARIANTS,
  PRODUCTION_STATUS_LABELS,
  TRANSFERENCIA_ESTADO_LABELS,
  TRANSFERENCIA_ESTADO_VARIANTS,
} from '@/lib/constants';
import { formatDateOnly, formatDateTime, formatNumber, personName } from '@/lib/format';
import { populated, sucursalLabel, ubicacionLabel, nombreDe } from './helpers';

function Paso({ icon: Icon, title, empty, children }: { icon: LucideIcon; title: string; empty?: string | false; children?: React.ReactNode }) {
  return (
    <li className="relative pl-10 pb-6 last:pb-0">
      <span className="absolute left-[15px] top-8 bottom-0 w-px bg-border" aria-hidden />
      <span className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <h3 className="pt-1 text-sm font-semibold">{title}</h3>
      <div className="mt-2 text-sm">{empty ? <p className="text-muted-foreground">{empty}</p> : children}</div>
    </li>
  );
}

/** Historia completa de un lote: cultivo → producción → transferencias → stock → dispensaciones → movimientos. */
export function LotTimeline({ data, verDispensaciones }: { data: LotTraceability; verDispensaciones: boolean }) {
  const c = data.cosecha;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border p-4">
        <p className="text-xs text-muted-foreground">Lote</p>
        <p className="font-mono text-lg font-semibold">{data.lote}</p>
        {data.producto && <p className="text-sm text-muted-foreground">Producto: {data.producto.nombre}</p>}
      </div>

      <ol>
        <Paso icon={Sprout} title="Cultivo y cosecha" empty={!c && 'Este lote no viene de una cosecha registrada.'}>
          {c && (
            <div className="grid gap-2 sm:grid-cols-2 rounded-xl border p-3">
              <div>
                <p className="text-xs text-muted-foreground">Paciente</p>
                <p className="font-medium">{c.paciente.nombre} {c.paciente.apellido}</p>
                <p className="font-mono text-xs text-muted-foreground">{c.paciente.rut}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Espacio</p>
                <Link to={`/cultivo/espacios/${c.espacio._id}`} className="font-mono text-xs text-primary hover:underline">
                  {c.espacio.codigo}
                </Link>
                <p>{c.espacio.flor} · {c.espacio.metrosCuadrados} m²</p>
                <p className="text-xs text-muted-foreground">{ubicacionLabel(c.espacio.ubicacion)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Cosecha</p>
                <p>{formatDateOnly(c.fecha)}</p>
                <p className="text-xs text-muted-foreground">
                  Húmedo {c.pesoHumedo != null ? `${formatNumber(c.pesoHumedo)} g` : '—'} · seco{' '}
                  {c.pesoSeco != null ? `${formatNumber(c.pesoSeco)} g` : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Registró</p>
                <p>{personName(c.responsable)}</p>
                <p className="text-xs text-muted-foreground">{sucursalLabel(c.sucursal)}</p>
              </div>
            </div>
          )}
        </Paso>

        <Paso icon={Factory} title="Producción" empty={data.producciones.length === 0 && 'Sin procesos de producción para este lote.'}>
          <div className="space-y-2">
            {data.producciones.map((p) => (
              <div key={p._id} className="rounded-xl border p-3">
                <p className="font-mono text-xs">{p.codigoProduccion}</p>
                <p>
                  {nombreDe(populated<Product>(p.productoFinal))} · {PRODUCTION_STATUS_LABELS[p.estado]} · producido {p.cantidadProducida} de{' '}
                  {p.cantidadInicial}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDateOnly(p.fechaInicio)}
                  {p.fechaFin ? ` → ${formatDateOnly(p.fechaFin)}` : ''} · {personName(p.responsable)}
                </p>
              </div>
            ))}
          </div>
        </Paso>

        <Paso icon={ArrowLeftRight} title="Transferencias" empty={data.transferencias.length === 0 && 'El lote no se ha trasladado.'}>
          <div className="space-y-2">
            {data.transferencias.map((t) => {
              const cant = t.items.filter((i) => i.lote === data.lote).reduce((s, i) => s + i.cantidad, 0);
              return (
                <div key={t._id} className="rounded-xl border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono text-xs">{t.codigo}</p>
                    <StatusBadge label={TRANSFERENCIA_ESTADO_LABELS[t.estado]} variant={TRANSFERENCIA_ESTADO_VARIANTS[t.estado]} />
                  </div>
                  <p>
                    {cant} unid. · {ubicacionLabel(t.ubicacionOrigen)} ({populated(t.sucursalOrigen)?.codigo}) →{' '}
                    {ubicacionLabel(t.ubicacionDestino)} ({populated(t.sucursalDestino)?.codigo})
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Enviado {formatDateTime(t.fechaEnvio)} por {personName(t.enviadoPor)}
                    {t.fechaRecepcion ? ` · recibido ${formatDateTime(t.fechaRecepcion)} por ${personName(t.recibidoPor)}` : ''}
                  </p>
                </div>
              );
            })}
          </div>
        </Paso>

        <Paso icon={Warehouse} title="Stock actual" empty={data.stock.length === 0 && 'No queda stock de este lote.'}>
          <div className="rounded-xl border divide-y">
            {data.stock.map((s) => (
              <div key={s._id} className="flex items-center justify-between gap-2 p-3">
                <div>
                  <p>{ubicacionLabel(s.ubicacion)}</p>
                  <p className="text-xs text-muted-foreground">{sucursalLabel(s.sucursal)}</p>
                </div>
                <p className="text-right">
                  {s.cantidadDisponible} disp.
                  {s.cantidadReservada > 0 && <span className="block text-xs text-muted-foreground">{s.cantidadReservada} reserv.</span>}
                </p>
              </div>
            ))}
          </div>
        </Paso>

        {verDispensaciones && (
          <Paso icon={ClipboardList} title="Dispensaciones" empty={data.dispensaciones.length === 0 && 'Aún no se ha dispensado de este lote.'}>
            <div className="rounded-xl border divide-y">
              {data.dispensaciones.map((d) => (
                <Link key={d._id} to={`/pedidos/${d._id}`} className="flex items-center justify-between gap-2 p-3 hover:bg-muted/40">
                  <div>
                    <p className="font-mono text-xs">{d.numeroPedido}</p>
                    <p>
                      {d.paciente?.nombre} {d.paciente?.apellido}{' '}
                      <span className="font-mono text-xs text-muted-foreground">{d.paciente?.rut}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {d.fechaEntrega ? `Entregada ${formatDateTime(d.fechaEntrega)}` : `Creada ${formatDateTime(d.createdAt)}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{d.cantidad} unid.</p>
                    <StatusBadge label={ORDER_STATUS_LABELS[d.estado]} variant={ORDER_STATUS_VARIANTS[d.estado]} />
                  </div>
                </Link>
              ))}
            </div>
          </Paso>
        )}

        <Paso icon={History} title={`Movimientos (${data.totalMovimientos})`} empty={data.movimientos.length === 0 && 'Sin movimientos.'}>
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Ubicación</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Usuario</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.movimientos.map((m) => (
                  <TableRow key={m._id}>
                    <TableCell className="whitespace-nowrap text-xs">{formatDateTime(m.createdAt)}</TableCell>
                    <TableCell className="text-xs">{MOVEMENT_TYPE_LABELS[m.tipo] ?? m.tipo}</TableCell>
                    <TableCell className="text-xs">{ubicacionLabel(m.ubicacion)}</TableCell>
                    <TableCell className={`text-right font-medium ${m.cantidad >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {m.cantidad >= 0 ? '+' : ''}{m.cantidad}
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate text-xs">{m.motivo}</TableCell>
                    <TableCell className="text-xs">{personName(m.usuario)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Paso>
      </ol>
    </div>
  );
}
