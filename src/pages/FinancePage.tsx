import { useEffect, useState, useCallback } from 'react';
import { financeAPI } from '@/services/api';
import type { FinanceTransaction, User } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

interface Summary {
  ingresos: { total: number; cantidad: number };
  egresos: { total: number; cantidad: number };
  balance: number;
  porCategoria: { _id: { tipo: string; categoria: string }; total: number }[];
}

const categoryLabels: Record<string, string> = {
  produccion: 'Producción', ventas: 'Ventas', administracion: 'Administración',
  logistica: 'Logística', marketing: 'Marketing', sueldos: 'Sueldos',
  insumos: 'Insumos', proveedores: 'Proveedores', venta_productos: 'Venta de Productos',
  pago_pedido: 'Pago de Pedido', otro: 'Otro',
};

export function FinancePage() {
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(n);

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = { page: page.toString(), limit: '20' };
      if (typeFilter) params.tipo = typeFilter;
      const { data } = await financeAPI.transactions(params);
      setTransactions(data.data);
      setTotal(data.pagination.total);
    } catch {
      toast.error('Error al cargar transacciones');
    } finally {
      setIsLoading(false);
    }
  }, [page, typeFilter]);

  const fetchSummary = async () => {
    try {
      const { data } = await financeAPI.summary();
      setSummary(data);
    } catch {
      toast.error('Error al cargar resumen');
    }
  };

  useEffect(() => { fetchTransactions(); fetchSummary(); }, [fetchTransactions]);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await financeAPI.createTransaction({
        tipo: form.get('tipo'),
        monto: parseFloat(form.get('monto') as string),
        descripcion: form.get('descripcion'),
        categoria: form.get('categoria'),
        fecha: form.get('fecha'),
        observaciones: form.get('observaciones'),
      });
      toast.success('Transacción registrada');
      setIsCreateOpen(false);
      fetchTransactions();
      fetchSummary();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      toast.error(axiosError.response?.data?.message || 'Error al crear transacción');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Finanzas</h1>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <Button onClick={() => setIsCreateOpen(true)}><Plus className="h-4 w-4 mr-2" />Nueva Transacción</Button>
          <DialogContent>
            <DialogHeader><DialogTitle>Registrar Transacción</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <select name="tipo" required className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm">
                    <option value="ingreso">Ingreso</option>
                    <option value="egreso">Egreso</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Monto (CLP)</Label>
                  <Input name="monto" type="number" required />
                </div>
                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <select name="categoria" required className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm">
                    {Object.entries(categoryLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Fecha</Label>
                  <Input name="fecha" type="date" defaultValue={new Date().toISOString().split('T')[0]} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Input name="descripcion" required />
              </div>
              <div className="space-y-2">
                <Label>Observaciones</Label>
                <Input name="observaciones" />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                <Button type="submit">Registrar</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.ingresos.total)}</div>
              <p className="text-xs text-muted-foreground">{summary.ingresos.cantidad} transacciones</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Egresos</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(summary.egresos.total)}</div>
              <p className="text-xs text-muted-foreground">{summary.egresos.cantidad} transacciones</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Balance</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${summary.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(summary.balance)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="transactions">
        <TabsList>
          <TabsTrigger value="transactions">Transacciones</TabsTrigger>
          <TabsTrigger value="categories">Por Categoría</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <Select value={typeFilter} onValueChange={(v: string | null) => { setTypeFilter(v === 'all' || !v ? '' : v); setPage(1); }}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="ingreso">Ingresos</SelectItem>
                  <SelectItem value="egreso">Egresos</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead>Categoría</TableHead>
                        <TableHead className="text-right">Monto</TableHead>
                        <TableHead>Usuario</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((t) => (
                        <TableRow key={t._id}>
                          <TableCell>{new Date(t.fecha).toLocaleDateString('es-CL')}</TableCell>
                          <TableCell>
                            <Badge className={t.tipo === 'ingreso' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                              {t.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
                            </Badge>
                          </TableCell>
                          <TableCell>{t.descripcion}</TableCell>
                          <TableCell>{categoryLabels[t.categoria] || t.categoria}</TableCell>
                          <TableCell className={`text-right font-medium ${t.tipo === 'ingreso' ? 'text-green-600' : 'text-red-600'}`}>
                            {t.tipo === 'ingreso' ? '+' : '-'}{formatCurrency(t.monto)}
                          </TableCell>
                          <TableCell>
                            {t.usuario == null ? '—' : typeof t.usuario === 'string' ? t.usuario : `${(t.usuario as User).nombre ?? ''} ${(t.usuario as User).apellido ?? ''}`.trim() || '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                      {transactions.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                            No se encontraron transacciones
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  <div className="flex justify-between items-center mt-4">
                    <p className="text-sm text-muted-foreground">Total: {total}</p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</Button>
                      <Button variant="outline" size="sm" disabled={transactions.length < 20} onClick={() => setPage(page + 1)}>Siguiente</Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <Card>
            <CardContent className="pt-6">
              {summary?.porCategoria.map((cat, i) => (
                <div key={i} className="flex justify-between items-center p-3 border-b last:border-0">
                  <div>
                    <span className="font-medium capitalize">{cat._id.tipo}</span>
                    <span className="text-muted-foreground ml-2">{categoryLabels[cat._id.categoria] || cat._id.categoria}</span>
                  </div>
                  <span className={`font-bold ${cat._id.tipo === 'ingreso' ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(cat.total)}
                  </span>
                </div>
              ))}
              {(!summary || summary.porCategoria.length === 0) && (
                <p className="text-center text-muted-foreground py-10">No hay datos</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
