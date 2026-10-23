import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { patientPortalAPI, apiErrorMessage } from '@/services/api';
import type { Patient, Product, SucursalStock } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowLeft, Plus, Trash2, AlertCircle, Loader2, ClipboardList, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency, formatDateOnly } from '@/lib/format';
import { useAppConfig } from '@/hooks/use-app-config';
import { PageHeader } from '@/components/shared/PageHeader';
import { motivoBloqueoSolicitud, productoDe, precioDe, sucursalDe } from '@/components/portal/portal-helpers';

interface Disponible {
  producto: Product;
  disponible: number;
  precio: number;
}

interface SelectedItem extends Disponible {
  cantidad: number;
}

const DIAS_LIMITE = 30;

export function PatientNewOrderPage() {
  const config = useAppConfig();
  const [disponibles, setDisponibles] = useState<Disponible[]>([]);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [usadasEnPeriodo, setUsadasEnPeriodo] = useState(0);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [tipoEntrega, setTipoEntrega] = useState<'retiro' | 'despacho'>('retiro');
  const [observaciones, setObservaciones] = useState('');
  const [direccionEntrega, setDireccionEntrega] = useState({ calle: '', numero: '', comuna: '', ciudad: '', region: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    try {
      const [catalogRes, profileRes, ordersRes] = await Promise.all([
        patientPortalAPI.getCatalog({ limit: '100' }),
        patientPortalAPI.getProfile(),
        patientPortalAPI.getMyOrders({ limit: '100' }),
      ]);

      setDisponibles(
        catalogRes.data.data
          .map((item: SucursalStock) => {
            const producto = productoDe(item);
            return producto ? { producto, disponible: item.cantidadDisponible, precio: precioDe(item) } : null;
          })
          .filter((d): d is Disponible => d !== null && d.disponible > 0)
      );

      const p = profileRes.data;
      setPatient(p);
      if (p.direccion) {
        setDireccionEntrega({
          calle: p.direccion.calle || '',
          numero: p.direccion.numero || '',
          comuna: p.direccion.comuna || '',
          ciudad: p.direccion.ciudad || '',
          region: p.direccion.region || '',
        });
      }

      // Unidades ya solicitadas en los últimos 30 días (referencial; la API hace el control real)
      const desde = Date.now() - DIAS_LIMITE * 24 * 60 * 60 * 1000;
      setUsadasEnPeriodo(
        ordersRes.data.data
          .filter((o) => o.estado !== 'cancelado' && new Date(o.createdAt).getTime() >= desde)
          .reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.cantidad, 0), 0)
      );
    } catch {
      toast.error('Error al cargar datos');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addItem = (d: Disponible) => {
    setSelectedItems((prev) =>
      prev.some((i) => i.producto._id === d.producto._id)
        ? prev.map((i) => (i.producto._id === d.producto._id ? { ...i, cantidad: Math.min(i.cantidad + 1, i.disponible) } : i))
        : [...prev, { ...d, cantidad: 1 }]
    );
  };

  const removeItem = (productId: string) => {
    setSelectedItems((prev) => prev.filter((i) => i.producto._id !== productId));
  };

  const updateQuantity = (productId: string, cantidad: number) => {
    setSelectedItems((prev) =>
      prev.map((i) => (i.producto._id === productId ? { ...i, cantidad: Math.max(1, Math.min(cantidad, i.disponible)) } : i))
    );
  };

  const totalUnidades = selectedItems.reduce((sum, i) => sum + i.cantidad, 0);
  const totalPrecio = selectedItems.reduce((sum, i) => sum + i.precio * i.cantidad, 0);
  const limite = patient?.limiteMensualUnidades ?? 0;
  const restantes = limite > 0 ? Math.max(limite - usadasEnPeriodo, 0) : null;
  const excedeLimite = restantes !== null && totalUnidades > restantes;
  const bloqueo = motivoBloqueoSolicitud(patient);
  const sucursal = sucursalDe(patient);

  const handleSubmit = async () => {
    if (selectedItems.length === 0) {
      toast.error('Agrega al menos un producto');
      return;
    }
    if (tipoEntrega === 'despacho' && Object.values(direccionEntrega).some((v) => !v.trim())) {
      toast.error('Completa la dirección de despacho');
      return;
    }

    setIsSubmitting(true);
    try {
      const data: Record<string, unknown> = {
        items: selectedItems.map((i) => ({ producto: i.producto._id, cantidad: i.cantidad })),
        tipoEntrega,
        observaciones: observaciones || undefined,
      };
      if (tipoEntrega === 'despacho') data.direccionEntrega = direccionEntrega;

      const { data: newOrder } = await patientPortalAPI.createOrder(data);
      toast.success('Solicitud enviada. El dispensario la revisará.');
      navigate(`/portal/pedidos/${newOrder._id}`);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Error al crear la solicitud'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const productosParaAgregar = disponibles.filter((d) => !selectedItems.some((i) => i.producto._id === d.producto._id));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Link to="/portal/pedidos">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </Link>
        <PageHeader
          title="Nueva solicitud de dispensación"
          description={sucursal ? `Se retira en ${sucursal.nombre}` : undefined}
        />
      </div>

      {bloqueo ? (
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertDescription className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <span>{bloqueo}</span>
            <Link to="/portal/perfil">
              <Button variant="outline" size="sm">
                Ir a Mi perfil
              </Button>
            </Link>
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Productos</CardTitle>
              </CardHeader>
              <CardContent>
                {productosParaAgregar.length === 0 && selectedItems.length === 0 ? (
                  <p className="text-center py-6 text-muted-foreground">No hay productos disponibles en tu dispensario</p>
                ) : productosParaAgregar.length === 0 ? (
                  <p className="text-center py-4 text-sm text-muted-foreground">Ya agregaste todos los productos disponibles</p>
                ) : (
                  <div className="space-y-2">
                    {productosParaAgregar.map((d) => (
                      <div key={d.producto._id} className="flex items-center justify-between gap-3 p-3 border rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{d.producto.nombre}</p>
                          <p className="text-sm text-muted-foreground">
                            {[d.producto.presentacion, `${d.disponible} disponibles`].filter(Boolean).join(' • ')}
                            {config.pagosHabilitados && d.precio > 0 && ` • ${formatCurrency(d.precio)}`}
                          </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => addItem(d)}>
                          <Plus className="h-4 w-4 mr-1" />
                          Agregar
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Entrega</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <RadioGroup value={tipoEntrega} onValueChange={(v: string) => setTipoEntrega(v as 'retiro' | 'despacho')}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="retiro" />
                    <Label>Retiro en el dispensario</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="despacho" />
                    <Label>Despacho a domicilio</Label>
                  </div>
                </RadioGroup>

                {tipoEntrega === 'despacho' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                    {(['calle', 'numero', 'comuna', 'ciudad', 'region'] as const).map((campo) => (
                      <div key={campo} className={`space-y-2 ${campo === 'region' ? 'md:col-span-2' : ''}`}>
                        <Label>
                          {{ calle: 'Calle', numero: 'Número', comuna: 'Comuna', ciudad: 'Ciudad', region: 'Región' }[campo]}
                        </Label>
                        <Input
                          value={direccionEntrega[campo]}
                          onChange={(e) => setDireccionEntrega({ ...direccionEntrega, [campo]: e.target.value })}
                          required
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-2 pt-2">
                  <Label>Observaciones (opcional)</Label>
                  <Textarea
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Indicaciones para el dispensario..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  Resumen
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {patient?.recetaVigente && (
                  <p className="text-xs text-muted-foreground">
                    Se usará tu receta vigente hasta el {formatDateOnly(patient.recetaVigente.fechaVencimiento)}.
                  </p>
                )}

                {selectedItems.length === 0 ? (
                  <p className="text-center py-4 text-muted-foreground text-sm">No hay productos seleccionados</p>
                ) : (
                  <>
                    <div className="space-y-3">
                      {selectedItems.map((item) => (
                        <div key={item.producto._id} className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium leading-tight">{item.producto.nombre}</p>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 shrink-0"
                              onClick={() => removeItem(item.producto._id)}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => updateQuantity(item.producto._id, item.cantidad - 1)}
                                disabled={item.cantidad <= 1}
                              >
                                -
                              </Button>
                              <span className="text-sm w-8 text-center">{item.cantidad}</span>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => updateQuantity(item.producto._id, item.cantidad + 1)}
                                disabled={item.cantidad >= item.disponible}
                              >
                                +
                              </Button>
                            </div>
                            {config.pagosHabilitados && item.precio > 0 && (
                              <span className="text-sm font-medium">{formatCurrency(item.precio * item.cantidad)}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border-t pt-3 space-y-1">
                      <div className="flex justify-between items-center font-semibold">
                        <span>Total</span>
                        <span>
                          {totalUnidades} unidad{totalUnidades === 1 ? '' : 'es'}
                        </span>
                      </div>
                      {config.pagosHabilitados && totalPrecio > 0 && (
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Monto</span>
                          <span>{formatCurrency(totalPrecio)}</span>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {limite > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Límite: {limite} unidades cada {DIAS_LIMITE} días. Te quedan {restantes} aprox.
                  </p>
                )}

                {excedeLimite && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Superas tu límite: te quedan {restantes} unidad(es) en los últimos {DIAS_LIMITE} días.
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  className="w-full"
                  disabled={selectedItems.length === 0 || isSubmitting || excedeLimite}
                  onClick={handleSubmit}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    'Enviar solicitud'
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
