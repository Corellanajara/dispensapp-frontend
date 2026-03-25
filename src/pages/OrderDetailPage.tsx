import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ordersAPI, paymentsAPI, signaturesAPI } from '@/services/api';
import type { Order, OrderStatus, Patient, PaymentStatus } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, CheckCircle, Package, Truck, XCircle, CreditCard, FileText, Upload, PenTool, Loader2, Ban, Mail, Copy, RefreshCw, Send, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { ORDER_STATUS_LABELS, ORDER_STATUS_VARIANTS, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_VARIANTS, SIGNATURE_STATUS_LABELS, SIGNATURE_STATUS_VARIANTS } from '@/lib/constants';
import { formatCurrency, formatDateShort, formatDateTime } from '@/lib/format';
import { StatusBadge } from '@/components/shared/StatusBadge';

const nextActions: Record<string, { label: string; estado: OrderStatus; icon: React.ComponentType<{ className?: string }> }[]> = {
  pendiente_revision: [
    { label: 'Aprobar', estado: 'aprobado', icon: CheckCircle },
    { label: 'Cancelar', estado: 'cancelado', icon: XCircle },
  ],
  aprobado: [
    { label: 'Iniciar Preparación', estado: 'en_preparacion', icon: Package },
    { label: 'Cancelar', estado: 'cancelado', icon: XCircle },
  ],
  en_preparacion: [
    { label: 'Listo para Retiro', estado: 'listo_retiro', icon: Package },
    { label: 'Enviar a Despacho', estado: 'en_despacho', icon: Truck },
    { label: 'Cancelar', estado: 'cancelado', icon: XCircle },
  ],
  listo_retiro: [
    { label: 'Marcar Entregado', estado: 'entregado', icon: CheckCircle },
    { label: 'Cancelar', estado: 'cancelado', icon: XCircle },
  ],
  en_despacho: [
    { label: 'Marcar Entregado', estado: 'entregado', icon: CheckCircle },
    { label: 'Cancelar', estado: 'cancelado', icon: XCircle },
  ],
};

const API_ORIGIN = 'https://dispensapp-backend-production-9a9a.up.railway.app';

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Payment state
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'debito' | 'credito'>('debito');
  const [installments, setInstallments] = useState(1);
  const [isInitiatingPayment, setIsInitiatingPayment] = useState(false);
  const [isPollingPayment, setIsPollingPayment] = useState(false);
  const [isCancellingPayment, setIsCancellingPayment] = useState(false);
  const paymentPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Flow payment state
  const [showFlowEmailForm, setShowFlowEmailForm] = useState(false);
  const [flowEmail, setFlowEmail] = useState('');
  const [flowSubject, setFlowSubject] = useState('');
  const [isSendingFlowEmail, setIsSendingFlowEmail] = useState(false);
  const [isCreatingFlowPayment, setIsCreatingFlowPayment] = useState(false);
  const [isCheckingFlowStatus, setIsCheckingFlowStatus] = useState(false);
  const [flowRedirectUrl, setFlowRedirectUrl] = useState<string | null>(null);
  const [flowCopied, setFlowCopied] = useState(false);

  // Document state
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docTipo, setDocTipo] = useState('receta');
  const [docNombre, setDocNombre] = useState('');
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  // Signature state
  const [signDocId, setSignDocId] = useState<string | null>(null);
  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [signerRut, setSignerRut] = useState('');
  const [signMessage, setSignMessage] = useState('');
  const [isRequestingSign, setIsRequestingSign] = useState(false);
  const signaturePollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshOrder = useCallback(async () => {
    if (!id) return;
    try {
      const { data } = await ordersAPI.get(id);
      setOrder(data);
    } catch {
      // silent refresh
    }
  }, [id]);

  useEffect(() => {
    const fetch = async () => {
      if (!id) return;
      try {
        const { data } = await ordersAPI.get(id);
        setOrder(data);
      } catch {
        toast.error('Error al cargar pedido');
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, [id]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (paymentPollRef.current) clearInterval(paymentPollRef.current);
      if (signaturePollRef.current) clearInterval(signaturePollRef.current);
    };
  }, []);

  // Poll for signature status on documents with estado 'enviado'
  useEffect(() => {
    if (!order || !id) return;
    const pendingDocs = (order.documentos ?? []).filter(
      (d) => d.firma && d.firma.estado === 'enviado'
    );
    if (pendingDocs.length === 0) {
      if (signaturePollRef.current) {
        clearInterval(signaturePollRef.current);
        signaturePollRef.current = null;
      }
      return;
    }
    if (signaturePollRef.current) return; // already polling
    signaturePollRef.current = setInterval(async () => {
      await refreshOrder();
    }, 5000);
    return () => {
      if (signaturePollRef.current) {
        clearInterval(signaturePollRef.current);
        signaturePollRef.current = null;
      }
    };
  }, [order, id, refreshOrder]);

  const handleStatusChange = async (estado: OrderStatus) => {
    if (!id) return;
    try {
      const { data } = await ordersAPI.updateStatus(id, { estado });
      setOrder(data);
      toast.success(`Estado cambiado a ${ORDER_STATUS_LABELS[estado]}`);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      toast.error(axiosError.response?.data?.message || 'Error al cambiar estado');
    }
  };

  const handleInitiatePayment = async () => {
    if (!id) return;
    setIsInitiatingPayment(true);
    try {
      await paymentsAPI.initiate(id, {
        method: paymentMethod,
        ...(paymentMethod === 'credito' && installments > 1 ? { installments } : {}),
      });
      setShowPaymentForm(false);
      setIsPollingPayment(true);
      toast.success('Pago iniciado, esperando terminal...');

      // Start polling
      paymentPollRef.current = setInterval(async () => {
        try {
          const { data } = await paymentsAPI.status(id);
          const status = (data as { estado: PaymentStatus }).estado;
          if (status !== 'procesando') {
            if (paymentPollRef.current) clearInterval(paymentPollRef.current);
            paymentPollRef.current = null;
            setIsPollingPayment(false);
            await refreshOrder();
            if (status === 'aprobado') {
              toast.success('Pago aprobado');
            } else {
              toast.error(`Pago ${PAYMENT_STATUS_LABELS[status]?.toLowerCase() ?? status}`);
            }
          }
        } catch {
          // continue polling
        }
      }, 3000);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      toast.error(axiosError.response?.data?.message || 'Error al iniciar pago');
    } finally {
      setIsInitiatingPayment(false);
    }
  };

  const handleCancelPayment = async () => {
    if (!id) return;
    setIsCancellingPayment(true);
    try {
      await paymentsAPI.cancel(id);
      if (paymentPollRef.current) clearInterval(paymentPollRef.current);
      paymentPollRef.current = null;
      setIsPollingPayment(false);
      await refreshOrder();
      toast.success('Pago cancelado');
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      toast.error(axiosError.response?.data?.message || 'Error al cancelar pago');
    } finally {
      setIsCancellingPayment(false);
    }
  };

  const handleCreateFlowPayment = async () => {
    if (!id) return;
    setIsCreatingFlowPayment(true);
    try {
      const { data } = await paymentsAPI.createFlow(id);
      setFlowRedirectUrl(data.redirectUrl);
      await refreshOrder();
      toast.success('Link de pago Flow.cl generado');
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      toast.error(axiosError.response?.data?.message || 'Error al crear pago Flow.cl');
    } finally {
      setIsCreatingFlowPayment(false);
    }
  };

  const handleSendFlowEmail = async () => {
    if (!id) return;
    setIsSendingFlowEmail(true);
    try {
      await paymentsAPI.sendPaymentEmail(id, {
        email: flowEmail || undefined,
        subject: flowSubject || undefined,
      });
      setShowFlowEmailForm(false);
      setFlowEmail('');
      setFlowSubject('');
      await refreshOrder();
      toast.success('Link de pago enviado por email');
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      toast.error(axiosError.response?.data?.message || 'Error al enviar pago por email');
    } finally {
      setIsSendingFlowEmail(false);
    }
  };

  const handleCheckFlowStatus = async () => {
    if (!id) return;
    setIsCheckingFlowStatus(true);
    try {
      await paymentsAPI.flowStatus(id);
      await refreshOrder();
      toast.success('Estado actualizado');
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      toast.error(axiosError.response?.data?.message || 'Error al consultar estado');
    } finally {
      setIsCheckingFlowStatus(false);
    }
  };

  const handleCopyFlowUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setFlowCopied(true);
    toast.success('Link copiado al portapapeles');
    setTimeout(() => setFlowCopied(false), 2000);
  };

  const handleUploadDocument = async () => {
    if (!id || !docFile) return;
    setIsUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append('archivo', docFile);
      formData.append('tipo', docTipo);
      formData.append('nombre', docNombre || docFile.name);
      await signaturesAPI.uploadDocument(id, formData);
      setShowUploadForm(false);
      setDocFile(null);
      setDocNombre('');
      setDocTipo('receta');
      await refreshOrder();
      toast.success('Documento subido');
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      toast.error(axiosError.response?.data?.message || 'Error al subir documento');
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const handleRequestSignature = async () => {
    if (!id || !signDocId) return;
    setIsRequestingSign(true);
    try {
      await signaturesAPI.requestSignature(id, signDocId, {
        signerName,
        signerEmail,
        ...(signerRut ? { signerRut } : {}),
        ...(signMessage ? { message: signMessage } : {}),
      });
      setSignDocId(null);
      setSignerName('');
      setSignerEmail('');
      setSignerRut('');
      setSignMessage('');
      await refreshOrder();
      toast.success('Firma solicitada');
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      toast.error(axiosError.response?.data?.message || 'Error al solicitar firma');
    } finally {
      setIsRequestingSign(false);
    }
  };

  if (isLoading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!order) return <div className="text-center py-20 text-muted-foreground">Pedido no encontrado</div>;

  const patient = order.paciente as Patient;
  const actions = nextActions[order.estado] || [];
  const pagoEstado = order.pago?.estado;
  const canInitiatePayment = !pagoEstado || pagoEstado === 'pendiente' || pagoEstado === 'rechazado' || pagoEstado === 'error';
  const lastAttempt = order.pago?.intentos?.length ? order.pago.intentos[order.pago.intentos.length - 1] : null;
  const lastFlowAttempt = order.pago?.intentos?.filter(i => i.provider === 'flow').slice(-1)[0] || null;
  const hasFlowPayment = !!lastFlowAttempt;
  const canCreateFlowPayment = !pagoEstado || pagoEstado === 'pendiente' || pagoEstado === 'rechazado' || pagoEstado === 'error';

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center gap-4">
        <Link to="/pedidos"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-2" />Volver</Button></Link>
        <h1 className="text-3xl font-bold">Pedido {order.numeroPedido}</h1>
        <StatusBadge label={ORDER_STATUS_LABELS[order.estado]} variant={ORDER_STATUS_VARIANTS[order.estado]} className="text-sm" />
      </div>

      {actions.length > 0 && (
        <div className="flex gap-2">
          {actions.map((action) => (
            <Button key={action.estado} variant={action.estado === 'cancelado' ? 'destructive' : 'default'}
              onClick={() => handleStatusChange(action.estado)}>
              <action.icon className="h-4 w-4 mr-2" />{action.label}
            </Button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card>
          <CardHeader><CardTitle className="text-lg">Información del Pedido</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Paciente:</span>
              <span>{patient == null ? '—' : typeof patient === 'string' ? patient : `${(patient as Patient).nombre ?? ''} ${(patient as Patient).apellido ?? ''}`.trim() || '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tipo Entrega:</span>
              <span className="capitalize">{order.tipoEntrega}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Fecha:</span>
              <span>{formatDateShort(order.createdAt)}</span></div>
            <Separator />
            <div className="flex justify-between font-bold"><span>Total:</span><span>{formatCurrency(order.total)}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Historial de Estados</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {order.historialEstados.map((h, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <div>
                    <p className="text-sm font-medium">{ORDER_STATUS_LABELS[h.estado as OrderStatus] || h.estado}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(h.fecha)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Productos</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between items-center p-3 border rounded-lg">
                <div><p className="font-medium">{item.nombre ?? '—'}</p><p className="text-sm text-muted-foreground">Cant: {item.cantidad} × {formatCurrency(item.precioUnitario)}</p></div>
                <span className="font-medium">{formatCurrency(item.subtotal)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Payment Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5" />Pago
            </CardTitle>
            {pagoEstado && (
              <StatusBadge label={PAYMENT_STATUS_LABELS[pagoEstado]} variant={PAYMENT_STATUS_VARIANTS[pagoEstado]} />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Approved payment info */}
          {pagoEstado === 'aprobado' && lastAttempt && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monto Pagado:</span>
                <span className="font-bold text-green-700">{formatCurrency(order.pago?.montoPagado ?? 0)}</span>
              </div>
              {lastAttempt.ultimosDigitos && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tarjeta:</span>
                  <span>•••• {lastAttempt.ultimosDigitos}</span>
                </div>
              )}
              {lastAttempt.codigoAutorizacion && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Código Auth:</span>
                  <span className="font-mono text-xs">{lastAttempt.codigoAutorizacion}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Método:</span>
                <span className="capitalize">{lastAttempt.metodo}</span>
              </div>
            </div>
          )}

          {/* Processing state */}
          {(pagoEstado === 'procesando' || isPollingPayment) && (
            <div className="flex items-center gap-3 p-4 border rounded-lg bg-blue-50">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              <span className="text-sm text-blue-700">Procesando pago en terminal...</span>
              <Button
                variant="outline"
                size="sm"
                className="ml-auto"
                onClick={handleCancelPayment}
                disabled={isCancellingPayment}
              >
                <Ban className="h-4 w-4 mr-1" />
                {isCancellingPayment ? 'Cancelando...' : 'Cancelar'}
              </Button>
            </div>
          )}

          {/* Rejected/Error last attempt message */}
          {(pagoEstado === 'rechazado' || pagoEstado === 'error') && lastAttempt && (
            <div className="p-3 border rounded-lg bg-red-50 text-sm text-red-700">
              {lastAttempt.mensaje || 'El pago fue rechazado. Puede intentar nuevamente.'}
            </div>
          )}

          {/* Initiate payment button */}
          {canInitiatePayment && !isPollingPayment && !showPaymentForm && (
            <Button onClick={() => setShowPaymentForm(true)}>
              <CreditCard className="h-4 w-4 mr-2" />
              {pagoEstado === 'rechazado' || pagoEstado === 'error' ? 'Reintentar Pago' : 'Iniciar Pago'}
            </Button>
          )}

          {/* Payment form */}
          {showPaymentForm && (
            <div className="space-y-3 p-4 border rounded-lg">
              <div className="space-y-2">
                <Label>Método de Pago</Label>
                <Select value={paymentMethod} onValueChange={(v) => { if (v) setPaymentMethod(v as 'debito' | 'credito'); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="debito">Débito</SelectItem>
                    <SelectItem value="credito">Crédito</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {paymentMethod === 'credito' && (
                <div className="space-y-2">
                  <Label>Cuotas</Label>
                  <Select value={String(installments)} onValueChange={(v) => { if (v) setInstallments(Number(v)); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 6, 12].map((n) => (
                        <SelectItem key={n} value={String(n)}>{n === 1 ? 'Sin cuotas' : `${n} cuotas`}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex gap-2">
                <Button onClick={handleInitiatePayment} disabled={isInitiatingPayment}>
                  {isInitiatingPayment && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Confirmar Pago ({formatCurrency(order.total)})
                </Button>
                <Button variant="outline" onClick={() => setShowPaymentForm(false)}>Cancelar</Button>
              </div>
            </div>
          )}

          {/* Payment attempts history */}
          {order.pago?.intentos && order.pago.intentos.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium mb-2">Historial de Intentos</p>
                <div className="space-y-2">
                  {order.pago.intentos.map((intento, i) => (
                    <div key={intento._id ?? i} className="flex items-center justify-between text-xs p-2 border rounded">
                      <div className="flex items-center gap-2">
                        <StatusBadge label={PAYMENT_STATUS_LABELS[intento.estado]} variant={PAYMENT_STATUS_VARIANTS[intento.estado]} className="text-xs" />
                        <span className="capitalize">{intento.metodo === 'flow' ? 'Flow.cl' : intento.metodo}</span>
                        {intento.ultimosDigitos && <span>•••• {intento.ultimosDigitos}</span>}
                      </div>
                      <span className="text-muted-foreground">{formatDateTime(intento.fecha)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <Separator className="my-4" />
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                Pago Electrónico (Flow.cl)
              </p>
              {hasFlowPayment && lastFlowAttempt && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCheckFlowStatus}
                  disabled={isCheckingFlowStatus}
                >
                  {isCheckingFlowStatus ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                  Consultar Estado
                </Button>
              )}
            </div>

            {lastFlowAttempt?.redirectUrl && lastFlowAttempt.estado === 'pendiente' && (
              <div className="flex items-center gap-2 p-3 border rounded-lg bg-blue-50">
                <div className="flex-1 text-xs font-mono truncate text-blue-700">{lastFlowAttempt.redirectUrl}</div>
                <Button variant="outline" size="sm" onClick={() => handleCopyFlowUrl(lastFlowAttempt.redirectUrl!)}>
                  <Copy className="h-3 w-3 mr-1" />{flowCopied ? 'Copiado' : 'Copiar'}
                </Button>
                <a href={lastFlowAttempt.redirectUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm">
                    <ExternalLink className="h-3 w-3 mr-1" />Abrir
                  </Button>
                </a>
              </div>
            )}

            {flowRedirectUrl && !lastFlowAttempt?.redirectUrl && (
              <div className="flex items-center gap-2 p-3 border rounded-lg bg-green-50">
                <div className="flex-1 text-xs font-mono truncate text-green-700">{flowRedirectUrl}</div>
                <Button variant="outline" size="sm" onClick={() => handleCopyFlowUrl(flowRedirectUrl)}>
                  <Copy className="h-3 w-3 mr-1" />{flowCopied ? 'Copiado' : 'Copiar'}
                </Button>
              </div>
            )}

            {lastFlowAttempt && lastFlowAttempt.estado !== 'pendiente' && (
              <div className={`p-3 border rounded-lg text-sm ${
                lastFlowAttempt.estado === 'aprobado' ? 'bg-green-50 text-green-700' :
                lastFlowAttempt.estado === 'rechazado' ? 'bg-red-50 text-red-700' :
                'bg-muted text-muted-foreground'
              }`}>
                {lastFlowAttempt.mensaje || `Estado: ${PAYMENT_STATUS_LABELS[lastFlowAttempt.estado]}`}
              </div>
            )}

            {canCreateFlowPayment && !showFlowEmailForm && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleCreateFlowPayment}
                  disabled={isCreatingFlowPayment}
                >
                  {isCreatingFlowPayment ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />}
                  Generar Link de Pago
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowFlowEmailForm(true);
                    setFlowEmail((patient as any)?.email || '');
                    setFlowSubject(`Pago Pedido #${order.numeroPedido} - Dispensario`);
                  }}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Enviar por Email
                </Button>
              </div>
            )}

            {showFlowEmailForm && (
              <div className="space-y-3 p-4 border rounded-lg">
                <div className="space-y-2">
                  <Label>Email del Paciente</Label>
                  <Input
                    type="email"
                    value={flowEmail}
                    onChange={(e) => setFlowEmail(e.target.value)}
                    placeholder="paciente@email.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Asunto</Label>
                  <Input
                    value={flowSubject}
                    onChange={(e) => setFlowSubject(e.target.value)}
                    placeholder="Pago Pedido #..."
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  Monto: <span className="font-bold">{formatCurrency(order.total)}</span>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSendFlowEmail} disabled={!flowEmail || isSendingFlowEmail}>
                    {isSendingFlowEmail ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                    Enviar Link de Pago
                  </Button>
                  <Button variant="outline" onClick={() => { setShowFlowEmailForm(false); setFlowEmail(''); setFlowSubject(''); }}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Documents & Signature Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />Documentos y Firma Electrónica
            </CardTitle>
            {!showUploadForm && (
              <Button variant="outline" size="sm" onClick={() => setShowUploadForm(true)}>
                <Upload className="h-4 w-4 mr-2" />Subir Documento
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upload form */}
          {showUploadForm && (
            <div className="space-y-3 p-4 border rounded-lg">
              <div className="space-y-2">
                <Label>Archivo</Label>
                <Input
                  type="file"
                  onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo de Documento</Label>
                <Select value={docTipo} onValueChange={(v) => { if (v) setDocTipo(v); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receta">Receta</SelectItem>
                    <SelectItem value="certificado">Certificado</SelectItem>
                    <SelectItem value="autorizacion">Autorización</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nombre del Documento</Label>
                <Input
                  placeholder="Nombre descriptivo (opcional)"
                  value={docNombre}
                  onChange={(e) => setDocNombre(e.target.value)}
                />
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

          {/* Document list */}
          {order.documentos && order.documentos.length > 0 ? (
            <div className="space-y-3">
              {order.documentos.map((doc) => (
                <div key={doc._id} className="p-3 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{doc.nombre}</p>
                      <p className="text-xs text-muted-foreground">
                        {doc.tipo} · {formatDateShort(doc.fechaSubida)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {doc.firma ? (
                          <StatusBadge label={SIGNATURE_STATUS_LABELS[doc.firma.estado]} variant={SIGNATURE_STATUS_VARIANTS[doc.firma.estado]} />
                      ) : (
                        <Badge className="bg-gray-100 text-gray-600">Sin firma</Badge>
                      )}
                      <a
                        href={doc.archivo.startsWith('http') ? doc.archivo : `${API_ORIGIN}${doc.archivo}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-xs"
                      >
                        Ver
                      </a>
                    </div>
                  </div>

                  {/* Firma info */}
                  {doc.firma?.estado === 'firmado' && doc.firma.fechaFirma && (
                    <div className="text-xs text-green-700">
                      Firmado el {formatDateTime(doc.firma.fechaFirma)}
                      {doc.firma.firmadoPor && ` por ${doc.firma.firmadoPor}`}
                      {doc.firma.archivoFirmado && (
                        <> · <a
                          href={doc.firma.archivoFirmado.startsWith('http') ? doc.firma.archivoFirmado : `${API_ORIGIN}${doc.firma.archivoFirmado}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          Descargar firmado
                        </a></>
                      )}
                    </div>
                  )}

                  {doc.firma?.estado === 'enviado' && (
                    <div className="flex items-center gap-2 text-xs text-blue-600">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Esperando firma...
                    </div>
                  )}

                  {/* Request signature button */}
                  {(!doc.firma || doc.firma.estado === 'pendiente' || doc.firma.estado === 'error' || doc.firma.estado === 'rechazado') && signDocId !== doc._id && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSignDocId(doc._id)}
                    >
                      <PenTool className="h-3 w-3 mr-1" />Solicitar Firma
                    </Button>
                  )}

                  {/* Signature request form */}
                  {signDocId === doc._id && (
                    <div className="space-y-2 p-3 border rounded bg-muted/30">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Nombre del Firmante *</Label>
                          <Input
                            value={signerName}
                            onChange={(e) => setSignerName(e.target.value)}
                            placeholder="Juan Pérez"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Email del Firmante *</Label>
                          <Input
                            type="email"
                            value={signerEmail}
                            onChange={(e) => setSignerEmail(e.target.value)}
                            placeholder="juan@email.com"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">RUT (opcional)</Label>
                          <Input
                            value={signerRut}
                            onChange={(e) => setSignerRut(e.target.value)}
                            placeholder="12.345.678-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Mensaje (opcional)</Label>
                          <Input
                            value={signMessage}
                            onChange={(e) => setSignMessage(e.target.value)}
                            placeholder="Mensaje para el firmante"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleRequestSignature}
                          disabled={!signerName || !signerEmail || isRequestingSign}
                        >
                          {isRequestingSign && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                          Enviar Solicitud
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setSignDocId(null); setSignerName(''); setSignerEmail(''); setSignerRut(''); setSignMessage(''); }}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            !showUploadForm && (
              <p className="text-sm text-muted-foreground">No hay documentos asociados a este pedido.</p>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
}
