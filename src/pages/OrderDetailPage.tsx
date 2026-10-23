import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ordersAPI, openDocument, apiErrorMessage } from '@/services/api';
import type { Order, OrderStatus, Patient, SucursalRef, UbicacionRef } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowLeft, CheckCircle, Package, Truck, XCircle, FileText, Upload, Loader2, ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  ORDER_STATUS_LABELS, ORDER_STATUS_VARIANTS, ORDER_LABEL, DELIVERY_TYPE_LABELS,
  PATIENT_STATUS_LABELS, PATIENT_STATUS_VARIANTS,
} from '@/lib/constants';
import { formatCurrency, formatDateShort, formatDateTime, personName } from '@/lib/format';
import { useAppConfig } from '@/hooks/use-app-config';
import { StatusBadge } from '@/components/shared/StatusBadge';

// Los cobros (POS y Flow.cl) se quitaron de esta pantalla: la nota de dispensación no es una venta.
// Si algún día se activa PAGOS_HABILITADOS en el backend, la UI de pagos se puede recuperar del historial de git.

type Action = { label: string; estado: OrderStatus; icon: React.ComponentType<{ className?: string }> };

const nextActions: Record<string, Action[]> = {
  pendiente_revision: [
    { label: 'Aprobar y reservar stock', estado: 'aprobado', icon: CheckCircle },
    { label: 'Anular', estado: 'cancelado', icon: XCircle },
  ],
  aprobado: [
    { label: 'Iniciar preparación', estado: 'en_preparacion', icon: Package },
    { label: 'Anular', estado: 'cancelado', icon: XCircle },
  ],
  en_preparacion: [
    { label: 'Lista para retiro', estado: 'listo_retiro', icon: Package },
    { label: 'Enviar a despacho', estado: 'en_despacho', icon: Truck },
    { label: 'Anular', estado: 'cancelado', icon: XCircle },
  ],
  listo_retiro: [
    { label: 'Marcar entregada', estado: 'entregado', icon: CheckCircle },
    { label: 'Anular', estado: 'cancelado', icon: XCircle },
  ],
  en_despacho: [
    { label: 'Marcar entregada', estado: 'entregado', icon: CheckCircle },
    { label: 'Anular', estado: 'cancelado', icon: XCircle },
  ],
};

/** Estados del historial que no son estados de la nota (eventos). */
const HISTORY_EVENT_LABELS: Record<string, string> = {
  documento_subido: 'Documento adjuntado',
  pago_aprobado: 'Pago aprobado',
  pago_rechazado: 'Pago rechazado',
  pago_cancelado: 'Pago anulado',
};

const DOC_TIPOS: Record<string, string> = {
  receta: 'Receta',
  comprobante_entrega: 'Comprobante de entrega',
  autorizacion: 'Autorización',
  otro: 'Otro',
};

function ubicacionLabel(u: string | UbicacionRef | undefined) {
  if (!u) return 'Stock general';
  if (typeof u === 'string') return '—';
  return `${u.codigo} · ${u.nombre}`;
}

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { pagosHabilitados } = useAppConfig();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isChanging, setIsChanging] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // Adjuntos
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docTipo, setDocTipo] = useState('comprobante_entrega');
  const [docNombre, setDocNombre] = useState('');
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  const loadOrder = useCallback(async () => {
    if (!id) return;
    try {
      const { data } = await ordersAPI.get(id);
      setOrder(data);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Error al cargar la nota'));
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => { loadOrder(); }, [loadOrder]);

  const handleStatusChange = async (estado: OrderStatus, observacion?: string) => {
    if (!id) return;
    setIsChanging(true);
    try {
      const { data } = await ordersAPI.updateStatus(id, { estado, observacion });
      setOrder((prev) => (prev ? { ...prev, ...data } : data));
      // Recarga para traer historial con nombres de usuario
      loadOrder();
      toast.success(`Nota: ${ORDER_STATUS_LABELS[estado]}`);
      setConfirmCancel(false);
      setCancelReason('');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Error al cambiar el estado'));
      // 409 = otra persona la cambió: recargar para ver el estado actual
      loadOrder();
    } finally {
      setIsChanging(false);
    }
  };

  const handleUploadDocument = async () => {
    if (!id || !docFile) return;
    setIsUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append('archivo', docFile);
      formData.append('tipo', docTipo);
      formData.append('nombre', docNombre || docFile.name);
      await ordersAPI.uploadDocument(id, formData);
      setShowUploadForm(false);
      setDocFile(null);
      setDocNombre('');
      await loadOrder();
      toast.success('Documento adjuntado');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Error al subir el documento'));
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const handleOpenDoc = async (docId: string) => {
    if (!id) return;
    try {
      await openDocument(() => ordersAPI.documentUrl(id, docId));
    } catch (err) {
      toast.error(apiErrorMessage(err, 'No se pudo abrir el documento'));
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }
  if (!order) return <div className="text-center py-20 text-muted-foreground">Nota no encontrada</div>;

  const patient = order.paciente && typeof order.paciente !== 'string' ? (order.paciente as Patient) : null;
  const sucursal = order.sucursal && typeof order.sucursal !== 'string' ? (order.sucursal as SucursalRef) : null;
  const actions = nextActions[order.estado] || [];
  const totalUnidades = order.items.reduce((s, i) => s + i.cantidad, 0);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-wrap items-center gap-4">
        <Link to="/pedidos"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-2" />Volver</Button></Link>
        <h1 className="text-2xl font-bold">{ORDER_LABEL} {order.numeroPedido}</h1>
        <StatusBadge label={ORDER_STATUS_LABELS[order.estado]} variant={ORDER_STATUS_VARIANTS[order.estado]} className="text-sm" />
      </div>

      {actions.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {actions.map((action) =>
              action.estado === 'cancelado' ? (
                <Button key={action.estado} variant="destructive" disabled={isChanging} onClick={() => setConfirmCancel(true)}>
                  <action.icon className="h-4 w-4 mr-2" />{action.label}
                </Button>
              ) : (
                <Button key={action.estado} disabled={isChanging} onClick={() => handleStatusChange(action.estado)}>
                  {isChanging ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <action.icon className="h-4 w-4 mr-2" />}
                  {action.label}
                </Button>
              )
            )}
          </div>
          {confirmCancel && (
            <div className="flex flex-wrap items-end gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <div className="flex-1 min-w-[220px] space-y-1">
                <Label className="text-xs">Motivo de la anulación</Label>
                <Input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Ej. el paciente no se presentó" />
              </div>
              <Button variant="destructive" disabled={isChanging} onClick={() => handleStatusChange('cancelado', cancelReason || undefined)}>
                Confirmar anulación
              </Button>
              <Button variant="outline" onClick={() => { setConfirmCancel(false); setCancelReason(''); }}>Volver</Button>
            </div>
          )}
          {order.estado === 'pendiente_revision' && (
            <p className="text-xs text-muted-foreground">
              Al aprobar se vuelve a revisar la receta y el límite mensual del paciente, y se reserva stock de los lotes que vencen primero.
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card>
          <CardHeader><CardTitle className="text-lg">Datos de la nota</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Paciente:</span>
              {patient ? (
                <Link to={`/pacientes/${patient._id}`} className="text-right text-primary hover:underline">
                  {patient.nombre} {patient.apellido} · {patient.rut}
                </Link>
              ) : <span>—</span>}
            </div>
            {patient?.estado && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estado del paciente:</span>
                <StatusBadge label={PATIENT_STATUS_LABELS[patient.estado]} variant={PATIENT_STATUS_VARIANTS[patient.estado]} />
              </div>
            )}
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Receta:</span>
              <span className="text-right">{order.recetaMedica || '—'}</span>
            </div>
            <div className="flex justify-between"><span className="text-muted-foreground">Dispensario:</span>
              <span>{sucursal ? `${sucursal.nombre} (${sucursal.codigo})` : '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Entrega:</span>
              <span>{DELIVERY_TYPE_LABELS[order.tipoEntrega] ?? order.tipoEntrega}</span></div>
            {order.direccionEntrega?.calle && (
              <div className="flex justify-between gap-4"><span className="text-muted-foreground">Dirección:</span>
                <span className="text-right">
                  {order.direccionEntrega.calle} {order.direccionEntrega.numero}, {order.direccionEntrega.comuna}
                </span></div>
            )}
            <div className="flex justify-between"><span className="text-muted-foreground">Creada:</span>
              <span>{formatDateTime(order.createdAt)}</span></div>
            {order.fechaEntrega && (
              <div className="flex justify-between"><span className="text-muted-foreground">Entregada:</span>
                <span>{formatDateTime(order.fechaEntrega)}</span></div>
            )}
            <Separator />
            <div className="flex justify-between"><span className="text-muted-foreground">Aprobada por:</span>
              <span>{personName(order.aprobadoPor)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Preparada por:</span>
              <span>{personName(order.preparadoPor)}</span></div>
            {order.observaciones && (
              <div className="pt-1"><span className="text-muted-foreground">Observaciones:</span> {order.observaciones}</div>
            )}
            {pagosHabilitados && order.total > 0 && (
              <>
                <Separator />
                <div className="flex justify-between font-bold"><span>Total:</span><span>{formatCurrency(order.total)}</span></div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Historial</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {order.historialEstados.map((h, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {ORDER_STATUS_LABELS[h.estado as OrderStatus] || HISTORY_EVENT_LABELS[h.estado] || h.estado}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(h.fecha)}
                      {h.usuario && typeof h.usuario !== 'string' ? ` · ${personName(h.usuario)}` : ''}
                    </p>
                    {h.observacion && <p className="text-xs text-muted-foreground">{h.observacion}</p>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Productos ({totalUnidades} unidades)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {order.items.map((item, i) => (
              <div key={i} className="p-3 border rounded-lg space-y-2">
                <div className="flex justify-between items-center gap-3">
                  <p className="font-medium">{item.nombre ?? '—'}</p>
                  <span className="text-sm">
                    {item.cantidad} unid.
                    {pagosHabilitados && item.subtotal > 0 && ` · ${formatCurrency(item.subtotal)}`}
                  </span>
                </div>
                {item.lotes && item.lotes.length > 0 ? (
                  <div className="space-y-1">
                    {item.lotes.map((l, j) => (
                      <div key={j} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/40 px-2.5 py-1.5 text-xs">
                        <Link to={`/inventario?lote=${encodeURIComponent(l.lote)}`} className="font-mono text-primary hover:underline">
                          Lote {l.lote}
                        </Link>
                        <span className="text-muted-foreground">{ubicacionLabel(l.ubicacion)}</span>
                        <span>{l.cantidad} unid.</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {order.estado === 'pendiente_revision'
                      ? 'Los lotes se asignan al aprobar la nota.'
                      : order.estado === 'cancelado'
                        ? 'Sin lotes asignados (nota anulada).'
                        : 'Nota antigua: sin lote registrado.'}
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Adjuntos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />Documentos adjuntos
            </CardTitle>
            {!showUploadForm && (
              <Button variant="outline" size="sm" onClick={() => setShowUploadForm(true)}>
                <Upload className="h-4 w-4 mr-2" />Adjuntar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showUploadForm && (
            <div className="space-y-3 p-4 border rounded-lg">
              <div className="space-y-2">
                <Label>Archivo (PDF, JPG o PNG)</Label>
                <Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setDocFile(e.target.files?.[0] ?? null)} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={docTipo} onValueChange={(v) => { if (v) setDocTipo(v); }}>
                    <SelectTrigger><SelectValue>{(v: string) => DOC_TIPOS[v as keyof typeof DOC_TIPOS] ?? v}</SelectValue></SelectTrigger>
                    <SelectContent>
                      {Object.entries(DOC_TIPOS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input placeholder="Opcional" value={docNombre} onChange={(e) => setDocNombre(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleUploadDocument} disabled={!docFile || isUploadingDoc}>
                  {isUploadingDoc && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Subir
                </Button>
                <Button variant="outline" onClick={() => { setShowUploadForm(false); setDocFile(null); }}>Cancelar</Button>
              </div>
            </div>
          )}

          {order.documentos && order.documentos.length > 0 ? (
            <div className="space-y-2">
              {order.documentos.map((doc) => (
                <div key={doc._id} className="flex items-center justify-between gap-3 p-3 border rounded-lg">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{doc.nombre}</p>
                    <p className="text-xs text-muted-foreground">
                      {DOC_TIPOS[doc.tipo] ?? doc.tipo} · {formatDateShort(doc.fechaSubida)}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleOpenDoc(doc._id)}>
                    <ExternalLink className="h-3.5 w-3.5 mr-1" />Ver
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            !showUploadForm && <p className="text-sm text-muted-foreground">No hay documentos adjuntos.</p>
          )}
          <p className="text-xs text-muted-foreground">
            Los documentos del paciente (receta, reglamento, mandato) están en su ficha. Estos adjuntos son de esta entrega.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
