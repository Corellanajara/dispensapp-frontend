import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { patientPortalAPI } from '@/services/api';
import type { Patient, Product } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowLeft, Plus, Trash2, AlertCircle, Loader2, ShoppingCart, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/format';
import { REQUIRED_PATIENT_DOCUMENTS } from '@/lib/patient-documents';
import { isDocumentSigned } from '@/lib/signatures';
import { PageHeader } from '@/components/shared/PageHeader';

interface SelectedItem {
  producto: Product;
  cantidad: number;
}

export function PatientNewOrderPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [tipoEntrega, setTipoEntrega] = useState<'retiro' | 'despacho'>('retiro');
  const [recetaMedica, setRecetaMedica] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [direccionEntrega, setDireccionEntrega] = useState({
    calle: '',
    numero: '',
    comuna: '',
    ciudad: '',
    region: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    try {
      const [catalogRes, profileRes] = await Promise.all([
        patientPortalAPI.getCatalog({ limit: '200' }),
        patientPortalAPI.getProfile(),
      ]);
      setProducts(catalogRes.data.data);
      const p = profileRes.data;
      setPatient(p);

      // Pre-fill address
      if (p.direccion) {
        setDireccionEntrega({
          calle: p.direccion.calle || '',
          numero: p.direccion.numero || '',
          comuna: p.direccion.comuna || '',
          ciudad: p.direccion.ciudad || '',
          region: p.direccion.region || '',
        });
      }

      // Redirect if not approved
      if (p.estado !== 'aprobado') {
        toast.error('Tu cuenta debe estar aprobada para realizar pedidos');
        navigate('/portal');
      }
    } catch {
      toast.error('Error al cargar datos');
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addItem = (product: Product) => {
    const existing = selectedItems.find((i) => i.producto._id === product._id);
    if (existing) {
      setSelectedItems(
        selectedItems.map((i) =>
          i.producto._id === product._id ? { ...i, cantidad: i.cantidad + 1 } : i
        )
      );
    } else {
      setSelectedItems([...selectedItems, { producto: product, cantidad: 1 }]);
    }
  };

  const removeItem = (productId: string) => {
    setSelectedItems(selectedItems.filter((i) => i.producto._id !== productId));
  };

  const updateQuantity = (productId: string, cantidad: number) => {
    if (cantidad < 1) return;
    setSelectedItems(
      selectedItems.map((i) =>
        i.producto._id === productId ? { ...i, cantidad } : i
      )
    );
  };

  const total = selectedItems.reduce((sum, i) => sum + i.producto.precio * i.cantidad, 0);
  const limiteCompra = patient?.limiteCompra || 0;
  const exceedsLimit = limiteCompra > 0 && total > limiteCompra;

  const handleSubmit = async () => {
    if (selectedItems.length === 0) {
      toast.error('Agrega al menos un producto');
      return;
    }

    if (!recetaMedica.trim()) {
      toast.error('Indica la referencia de receta médica');
      return;
    }

    if (exceedsLimit) {
      toast.error('El total excede tu límite de compra');
      return;
    }

    setIsSubmitting(true);
    try {
      const data: Record<string, unknown> = {
        items: selectedItems.map((i) => ({
          producto: i.producto._id,
          cantidad: i.cantidad,
        })),
        tipoEntrega,
        recetaMedica,
        observaciones: observaciones || undefined,
      };

      if (tipoEntrega === 'despacho') {
        data.direccionEntrega = direccionEntrega;
      }

      const { data: newOrder } = await patientPortalAPI.createOrder(data);
      toast.success('Pedido creado exitosamente');
      navigate(`/portal/pedidos/${newOrder._id}`);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      toast.error(axiosError.response?.data?.message || 'Error al crear pedido');
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

  const availableProducts = products.filter(
    (p) => p.cantidadDisponible > 0 && !selectedItems.find((i) => i.producto._id === p._id)
  );

  const docsCompleted = patient
    ? REQUIRED_PATIENT_DOCUMENTS.filter((req) => {
        const uploaded = patient.documentos?.find((d) => d.nombre === req.id);
        return uploaded && isDocumentSigned(req.id);
      }).length
    : 0;
  const docsRequired = REQUIRED_PATIENT_DOCUMENTS.length;
  const allDocsComplete = docsCompleted === docsRequired;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Link to="/portal/pedidos">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </Link>
        <PageHeader title="Nuevo Pedido" />
      </div>

      {!allDocsComplete && (
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>
              Debes completar tus documentos legales antes de realizar un pedido ({docsCompleted} de {docsRequired} completados).
            </span>
            <Link to="/portal/perfil">
              <Button variant="outline" size="sm">
                Ir a Mi Perfil
              </Button>
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {allDocsComplete && <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Product Selection + Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Product Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Seleccionar Productos</CardTitle>
            </CardHeader>
            <CardContent>
              {availableProducts.length === 0 && selectedItems.length === 0 ? (
                <p className="text-center py-6 text-muted-foreground">No hay productos disponibles</p>
              ) : (
                <div className="space-y-2">
                  {availableProducts.map((product) => (
                    <div key={product._id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{product.nombre}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(product.precio)} • Stock: {product.cantidadDisponible}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => addItem(product)}>
                        <Plus className="h-4 w-4 mr-1" />
                        Agregar
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Delivery */}
          <Card>
            <CardHeader>
              <CardTitle>Tipo de Entrega</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup value={tipoEntrega} onValueChange={(v: string) => setTipoEntrega(v as 'retiro' | 'despacho')}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="retiro" />
                  <Label>Retiro en Dispensario</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="despacho" />
                  <Label>Despacho a Domicilio</Label>
                </div>
              </RadioGroup>

              {tipoEntrega === 'despacho' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label>Calle</Label>
                    <Input
                      value={direccionEntrega.calle}
                      onChange={(e) => setDireccionEntrega({ ...direccionEntrega, calle: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Número</Label>
                    <Input
                      value={direccionEntrega.numero}
                      onChange={(e) => setDireccionEntrega({ ...direccionEntrega, numero: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Comuna</Label>
                    <Input
                      value={direccionEntrega.comuna}
                      onChange={(e) => setDireccionEntrega({ ...direccionEntrega, comuna: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ciudad</Label>
                    <Input
                      value={direccionEntrega.ciudad}
                      onChange={(e) => setDireccionEntrega({ ...direccionEntrega, ciudad: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Región</Label>
                    <Input
                      value={direccionEntrega.region}
                      onChange={(e) => setDireccionEntrega({ ...direccionEntrega, region: e.target.value })}
                      required
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Prescription */}
          <Card>
            <CardHeader>
              <CardTitle>Receta Médica</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Referencia de Receta Médica</Label>
                <Input
                  value={recetaMedica}
                  onChange={(e) => setRecetaMedica(e.target.value)}
                  placeholder="Número o referencia de receta"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Observaciones (opcional)</Label>
                <Textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Indicaciones adicionales para tu pedido..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Summary */}
        <div className="space-y-6">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Resumen del Pedido
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedItems.length === 0 ? (
                <p className="text-center py-4 text-muted-foreground text-sm">
                  No hay productos seleccionados
                </p>
              ) : (
                <>
                  <div className="space-y-3">
                    {selectedItems.map((item) => (
                      <div key={item.producto._id} className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium leading-tight">{item.producto?.nombre ?? '—'}</p>
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
                              disabled={item.cantidad >= item.producto.cantidadDisponible}
                            >
                              +
                            </Button>
                          </div>
                          <span className="text-sm font-medium">
                            {formatCurrency(item.producto.precio * item.cantidad)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-3">
                    <div className="flex justify-between items-center font-bold text-lg">
                      <span>Total</span>
                      <span>{formatCurrency(total)}</span>
                    </div>
                  </div>

                  {exceedsLimit && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        El total excede tu límite de compra de {formatCurrency(limiteCompra)}
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}

              <Button
                className="w-full"
                disabled={selectedItems.length === 0 || isSubmitting || exceedsLimit}
                onClick={handleSubmit}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creando pedido...
                  </>
                ) : (
                  'Confirmar Pedido'
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>}
    </div>
  );
}
