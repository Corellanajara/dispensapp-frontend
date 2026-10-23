import type { ReactNode } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Printer, Eye } from 'lucide-react';
import { toast } from 'sonner';
import type { AuditLog, PatientDocument } from '@/types';
import { patientsAPI, openDocument, apiErrorMessage } from '@/services/api';
import { usePatientExpediente } from '@/hooks/use-patients';
import { patientSucursal } from '@/components/patients/patient-helpers';
import {
  AUDIT_ACTION_LABELS,
  COSECHA_ESTADO_LABELS,
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_TYPE_LABELS,
  ESPACIO_ESTADO_LABELS,
  ORDER_STATUS_LABELS,
  PATIENT_STATUS_LABELS,
  SIGNATURE_STATUS_LABELS,
  SUSPENSION_REASON_LABELS,
  DELIVERY_TYPE_LABELS,
} from '@/lib/constants';
import { formatDate, formatDateOnly, formatDateTime, formatNumber, personName } from '@/lib/format';

function Section({ title, children, count }: { title: string; children: ReactNode; count?: number }) {
  return (
    <section className="space-y-3 break-inside-avoid-page">
      <h2 className="text-base font-semibold border-b pb-1">
        {title}
        {count !== undefined && <span className="ml-2 text-sm font-normal text-muted-foreground">({count})</span>}
      </h2>
      {children}
    </section>
  );
}

function Dato({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="text-sm">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd>{children || '—'}</dd>
    </div>
  );
}

function Vacio({ texto }: { texto: string }) {
  return <p className="text-sm text-muted-foreground">{texto}</p>;
}

function refName(v: unknown): string {
  if (v && typeof v === 'object') {
    const o = v as { nombre?: string; codigo?: string };
    return o.codigo ? `${o.nombre ?? ''} (${o.codigo})`.trim() : (o.nombre ?? '—');
  }
  return '—';
}

function auditActor(log: AuditLog): string {
  if (log.usuario && typeof log.usuario === 'object') return personName(log.usuario);
  if (log.email) return log.email;
  return 'Sistema';
}

/** Expediente completo del paciente, pensado para imprimir o guardar como PDF ante una fiscalización. */
export function PatientExpedientePage() {
  const { id = '' } = useParams<{ id: string }>();
  const { data, isLoading, isError, error } = usePatientExpediente(id);

  const verDoc = (doc: PatientDocument, firmado = false) =>
    openDocument(() => patientsAPI.documentUrl(id, doc._id, firmado)).catch((err) =>
      toast.error(apiErrorMessage(err, 'No se pudo abrir el documento'))
    );

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        {apiErrorMessage(error, 'No se pudo generar el expediente')}
      </div>
    );
  }

  const { paciente: p, espacios, cosechas, dispensaciones, auditoria } = data;
  const suc = patientSucursal(p);
  const historial = [...(p.historialEstados ?? [])].reverse();

  return (
    <div className="space-y-8 animate-fade-in print:space-y-6 print:text-black">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Link to={`/pacientes/${id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a la ficha
          </Button>
        </Link>
        <Button size="sm" className="ml-auto" onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-2" />
          Imprimir o guardar PDF
        </Button>
      </div>

      <header className="space-y-1">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Expediente del paciente</p>
        <h1 className="text-2xl font-bold">
          {p.nombre} {p.apellido}
        </h1>
        <p className="text-sm text-muted-foreground">
          Generado el {formatDateTime(data.generadoEn)} por {data.generadoPor.nombre} ({data.generadoPor.email})
        </p>
      </header>

      <Section title="Datos del paciente">
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Dato label="RUT">
            <span className="font-mono">{p.rut}</span>
          </Dato>
          <Dato label="Fecha de nacimiento">{formatDateOnly(p.fechaNacimiento)}</Dato>
          <Dato label="Teléfono">{p.telefono}</Dato>
          <Dato label="Email">{p.email}</Dato>
          <Dato label="Dirección">
            {p.direccion
              ? `${p.direccion.calle} ${p.direccion.numero}, ${p.direccion.comuna}, ${p.direccion.region}`
              : '—'}
          </Dato>
          <Dato label="Médico tratante">
            {p.medicoTratante?.nombre}
            {p.medicoTratante?.especialidad ? ` · ${p.medicoTratante.especialidad}` : ''}
          </Dato>
          <Dato label="Dispensario">{suc ? `${suc.nombre} (${suc.codigo})` : 'Sin asignar'}</Dato>
          <Dato label="Límite mensual">
            {p.limiteMensualUnidades > 0 ? `${p.limiteMensualUnidades} unidades / 30 días` : 'Sin límite'}
          </Dato>
        </dl>
      </Section>

      <Section title="Estado actual">
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Dato label="Estado">
            {PATIENT_STATUS_LABELS[p.estado]}
            {p.estado === 'suspendido' && p.motivoSuspension
              ? ` · ${SUSPENSION_REASON_LABELS[p.motivoSuspension] ?? p.motivoSuspension}`
              : ''}
          </Dato>
          <Dato label="Activado por">{p.activadoPor ? personName(p.activadoPor) : '—'}</Dato>
          <Dato label="Fecha de activación">{p.fechaActivacion ? formatDateTime(p.fechaActivacion) : '—'}</Dato>
          <Dato label="Receta vigente">
            {p.recetaVigente ? `Vence ${formatDateOnly(p.recetaVigente.fechaVencimiento)}` : 'No'}
          </Dato>
        </dl>
        {p.requisitosActivacion &&
          (p.requisitosActivacion.bloqueantes.length > 0 || p.requisitosActivacion.advertencias.length > 0) && (
            <div className="text-sm">
              <p className="text-muted-foreground text-xs">Requisitos pendientes</p>
              <ul className="list-disc pl-5">
                {[...p.requisitosActivacion.bloqueantes, ...p.requisitosActivacion.advertencias].map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          )}
      </Section>

      <Section title="Historial de estados" count={historial.length}>
        {historial.length === 0 ? (
          <Vacio texto="Sin cambios registrados." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Por</TableHead>
                <TableHead>Motivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historial.map((h, i) => (
                <TableRow key={i}>
                  <TableCell className="whitespace-nowrap">{formatDateTime(h.fecha)}</TableCell>
                  <TableCell>{PATIENT_STATUS_LABELS[h.estado] ?? h.estado}</TableCell>
                  <TableCell>{h.usuario ? personName(h.usuario) : 'Sistema'}</TableCell>
                  <TableCell className="whitespace-normal">{h.motivo || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>

      <Section title="Documentos" count={p.documentos.length}>
        {p.documentos.length === 0 ? (
          <Vacio texto="Sin documentos." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Subido</TableHead>
                <TableHead>Vence</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Revisado por</TableHead>
                <TableHead>Firma</TableHead>
                <TableHead className="print:hidden" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {p.documentos.map((d) => (
                <TableRow key={d._id}>
                  <TableCell>{DOCUMENT_TYPE_LABELS[d.tipo] ?? d.tipo}</TableCell>
                  <TableCell className="whitespace-normal">{d.nombre}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(d.fechaSubida)}</TableCell>
                  <TableCell className="whitespace-nowrap">{d.fechaVencimiento ? formatDateOnly(d.fechaVencimiento) : '—'}</TableCell>
                  <TableCell>{DOCUMENT_STATUS_LABELS[d.estado] ?? d.estado}</TableCell>
                  <TableCell>
                    {d.revisadoPor ? personName(d.revisadoPor) : '—'}
                    {d.fechaRevision && (
                      <span className="block text-xs text-muted-foreground">{formatDate(d.fechaRevision)}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {d.firma ? (
                      <>
                        {SIGNATURE_STATUS_LABELS[d.firma.estado]}
                        {d.firma.fechaFirma && (
                          <span className="block text-xs text-muted-foreground">
                            {formatDate(d.firma.fechaFirma)}
                            {d.firma.firmadoPor ? ` · ${d.firma.firmadoPor}` : ''}
                          </span>
                        )}
                      </>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell className="print:hidden">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => verDoc(d)}>
                        <Eye className="h-4 w-4 mr-1" /> Ver
                      </Button>
                      {d.firma?.archivoFirmado && (
                        <Button variant="ghost" size="sm" onClick={() => verDoc(d, true)}>
                          Firmado
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>

      <Section title="Espacios de cultivo" count={espacios.length}>
        {espacios.length === 0 ? (
          <Vacio texto="Sin espacios de cultivo." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Flor</TableHead>
                <TableHead>m²</TableHead>
                <TableHead>Ubicación</TableHead>
                <TableHead>Inicio</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {espacios.map((e) => (
                <TableRow key={e._id}>
                  <TableCell className="font-mono">{e.codigo}</TableCell>
                  <TableCell>{e.flor}</TableCell>
                  <TableCell>{formatNumber(e.metrosCuadrados)}</TableCell>
                  <TableCell>{refName(e.ubicacion)}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(e.fechaInicio)}</TableCell>
                  <TableCell>
                    {ESPACIO_ESTADO_LABELS[e.estado] ?? e.estado}
                    {e.fechaCierre && (
                      <span className="block text-xs text-muted-foreground">{formatDate(e.fechaCierre)}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>

      <Section title="Cosechas" count={cosechas.length}>
        {cosechas.length === 0 ? (
          <Vacio texto="Sin cosechas." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lote</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Espacio</TableHead>
                <TableHead>Peso húmedo</TableHead>
                <TableHead>Peso seco</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Ingresado</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cosechas.map((c) => (
                <TableRow key={c._id}>
                  <TableCell className="font-mono">{c.lote}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(c.fecha)}</TableCell>
                  <TableCell className="font-mono">{typeof c.espacio === 'object' ? c.espacio.codigo : '—'}</TableCell>
                  <TableCell>{c.pesoHumedo != null ? `${formatNumber(c.pesoHumedo)} g` : '—'}</TableCell>
                  <TableCell>{c.pesoSeco != null ? `${formatNumber(c.pesoSeco)} g` : '—'}</TableCell>
                  <TableCell>{c.producto && typeof c.producto === 'object' ? c.producto.nombre : '—'}</TableCell>
                  <TableCell>
                    {c.cantidadIngresada != null ? formatNumber(c.cantidadIngresada) : '—'}
                    {c.ubicacionDestino && (
                      <span className="block text-xs text-muted-foreground">{refName(c.ubicacionDestino)}</span>
                    )}
                  </TableCell>
                  <TableCell>{COSECHA_ESTADO_LABELS[c.estado] ?? c.estado}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>

      <Section title="Dispensaciones" count={dispensaciones.length}>
        {dispensaciones.length === 0 ? (
          <Vacio texto="Sin notas de dispensación." />
        ) : (
          <div className="space-y-3">
            {dispensaciones.map((o) => (
              <div key={o._id} className="rounded-lg border p-3 text-sm break-inside-avoid">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link to={`/pedidos/${o._id}`} className="font-mono font-medium hover:underline print:no-underline">
                    {o.numeroPedido}
                  </Link>
                  <span>{ORDER_STATUS_LABELS[o.estado] ?? o.estado}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Creada {formatDateTime(o.createdAt)}
                  {o.fechaEntrega ? ` · Entregada ${formatDateTime(o.fechaEntrega)}` : ''} ·{' '}
                  {DELIVERY_TYPE_LABELS[o.tipoEntrega] ?? o.tipoEntrega}
                  {typeof o.sucursal === 'object' ? ` · ${refName(o.sucursal)}` : ''}
                </p>
                {o.recetaMedica && <p className="text-xs text-muted-foreground">Receta: {o.recetaMedica}</p>}
                {o.aprobadoPor && (
                  <p className="text-xs text-muted-foreground">Aprobada por {personName(o.aprobadoPor)}</p>
                )}
                <ul className="mt-2 space-y-1">
                  {o.items.map((it, i) => (
                    <li key={i}>
                      <span className="font-medium">
                        {it.cantidad} × {it.nombre}
                      </span>
                      {it.lotes && it.lotes.length > 0 ? (
                        <span className="text-muted-foreground">
                          {' — '}
                          {it.lotes
                            .map(
                              (l) =>
                                `lote ${l.lote}: ${l.cantidad}${
                                  l.ubicacion && typeof l.ubicacion === 'object' ? ` (${l.ubicacion.codigo})` : ''
                                }`
                            )
                            .join(', ')}
                        </span>
                      ) : (
                        <span className="text-muted-foreground"> — sin lote asignado</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Auditoría" count={auditoria.length}>
        {auditoria.length === 0 ? (
          <Vacio texto="Sin registros." />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Quién</TableHead>
                  <TableHead>Acción</TableHead>
                  <TableHead>Resultado</TableHead>
                  <TableHead>IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditoria.map((log) => (
                  <TableRow key={log._id}>
                    <TableCell className="whitespace-nowrap">{formatDateTime(log.createdAt)}</TableCell>
                    <TableCell>{auditActor(log)}</TableCell>
                    <TableCell>{AUDIT_ACTION_LABELS[log.accion] ?? log.accion}</TableCell>
                    <TableCell>{log.resultado === 'fallo' ? 'Fallo' : 'Éxito'}</TableCell>
                    <TableCell className="font-mono text-xs">{log.ip ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {auditoria.length >= 500 && (
              <p className="text-xs text-muted-foreground">Se muestran los últimos 500 registros.</p>
            )}
            <p className="text-xs text-muted-foreground">La IP indica desde qué red se hizo la acción, no una ubicación exacta.</p>
          </>
        )}
      </Section>
    </div>
  );
}
