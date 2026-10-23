import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Patient } from '@/types';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, AlertTriangle } from 'lucide-react';
import { sucursalesAPI } from '@/services/api';
import { useAssignSucursal } from '@/hooks/use-patients';
import { patientSucursal } from './patient-helpers';

/**
 * Asignar o cambiar el dispensario del paciente (solo admin).
 * Si no tiene, se muestra como aviso destacado.
 */
export function SucursalAssign({ patient }: { patient: Patient }) {
  const actual = patientSucursal(patient);
  const actualId = actual?._id ?? (typeof patient.sucursal === 'string' ? patient.sucursal : '');
  const [selected, setSelected] = useState('');
  const [editing, setEditing] = useState(!patient.sucursal);
  const assign = useAssignSucursal();

  const { data: sucursales = [] } = useQuery({
    queryKey: ['sucursales', 'activas'],
    queryFn: () => sucursalesAPI.list({ activo: 'true' }).then((r) => r.data),
  });

  const nombre = (id: string) => {
    const s = sucursales.find((x) => x._id === id);
    return s ? `${s.nombre} (${s.codigo})` : '';
  };

  const guardar = () => {
    if (!selected) return;
    assign.mutate(
      { id: patient._id, sucursal: selected },
      {
        onSuccess: () => {
          setEditing(false);
          setSelected('');
        },
      }
    );
  };

  const sinSucursal = !patient.sucursal;

  if (!editing) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
        <Building2 className="h-4 w-4 mr-1" />
        Cambiar dispensario
      </Button>
    );
  }

  return (
    <div
      className={`rounded-xl border p-4 space-y-3 ${
        sinSucursal ? 'border-warning/40 bg-warning/5' : 'border-border'
      }`}
    >
      {sinSucursal && (
        <p className="flex items-start gap-2 text-sm">
          <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
          <span>
            <span className="font-medium">Este paciente no tiene dispensario.</span> Es una ficha antigua: asígnale uno
            para poder activarlo y separar sus datos.
          </span>
        </p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Select value={selected || null} onValueChange={(v: string | null) => setSelected(v || '')}>
          <SelectTrigger className="w-full sm:w-72">
            <SelectValue placeholder="Selecciona un dispensario">
              {(v: string | null) => (v ? nombre(v) : 'Selecciona un dispensario')}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {sucursales
              .filter((s) => s._id !== actualId)
              .map((s) => (
                <SelectItem key={s._id} value={s._id}>
                  {s.nombre} ({s.codigo})
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Button size="sm" onClick={guardar} disabled={!selected || assign.isPending}>
            {assign.isPending ? 'Guardando…' : sinSucursal ? 'Asignar' : 'Cambiar'}
          </Button>
          {!sinSucursal && (
            <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
