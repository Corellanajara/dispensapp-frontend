import { Link } from 'react-router-dom';
import type { Patient } from '@/types';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, XCircle, CalendarClock } from 'lucide-react';
import { formatDateOnly } from '@/lib/format';
import { estadoReceta } from './portal-helpers';

interface Props {
  patient: Patient;
  diasAviso: number;
  /** Oculta el botón "Ir a Mi perfil" (ej. cuando ya se está en el perfil). */
  sinEnlacePerfil?: boolean;
}

function Banner({
  tone,
  icon: Icon,
  title,
  children,
  action,
}: {
  tone: 'amber' | 'red' | 'blue';
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  const tones = {
    amber: 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/25',
    red: 'bg-destructive/10 text-destructive border-destructive/25',
    blue: 'bg-primary/10 text-primary border-primary/25',
  };
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border p-4 ${tones[tone]}`}>
      <Icon className="h-5 w-5 shrink-0" />
      <div className="flex-1 min-w-0 text-sm">
        <p className="font-medium">{title}</p>
        {children && <p className="mt-0.5 opacity-90">{children}</p>}
      </div>
      {action}
    </div>
  );
}

/** Avisos del estado de la cuenta y de la receta para el portal del paciente. */
export function PatientStatusBanner({ patient, diasAviso, sinEnlacePerfil }: Props) {
  const irAlPerfil = sinEnlacePerfil ? null : (
    <Link to="/portal/perfil" className="shrink-0">
      <Button size="sm" variant="outline" className="rounded-xl">
        Ir a Mi perfil
      </Button>
    </Link>
  );

  if (patient.estado === 'suspendido' && patient.motivoSuspension === 'receta_vencida') {
    return (
      <Banner tone="red" icon={CalendarClock} title="Tu receta venció" action={irAlPerfil}>
        Sube una nueva receta para volver a retirar. Cuando el dispensario la apruebe, tu cuenta se reactiva.
      </Banner>
    );
  }
  if (patient.estado === 'suspendido') {
    return (
      <Banner tone="red" icon={XCircle} title="Tu cuenta está suspendida">
        Contacta al dispensario para más información.
      </Banner>
    );
  }
  if (patient.estado === 'rechazado') {
    return (
      <Banner tone="red" icon={XCircle} title="Tu registro fue rechazado">
        Contacta al dispensario para más información.
      </Banner>
    );
  }
  if (patient.estado === 'pendiente') {
    return (
      <Banner tone="blue" icon={Clock} title="Tu ficha está en revisión" action={irAlPerfil}>
        Sube tus documentos en Mi perfil. El administrador del dispensario los revisa y activa tu cuenta.
      </Banner>
    );
  }

  const receta = estadoReceta(patient, diasAviso);
  if (receta.tipo === 'sin_receta') {
    return (
      <Banner tone="amber" icon={AlertTriangle} title="No tienes una receta vigente" action={irAlPerfil}>
        Sube tu receta con su fecha de vencimiento. Sin receta aprobada y vigente no se puede dispensar.
      </Banner>
    );
  }
  if (receta.tipo === 'por_vencer') {
    return (
      <Banner
        tone="amber"
        icon={CalendarClock}
        title={
          receta.dias === 0
            ? 'Tu receta vence hoy'
            : `Tu receta vence en ${receta.dias} día${receta.dias === 1 ? '' : 's'}`
        }
        action={irAlPerfil}
      >
        Vence el {formatDateOnly(receta.fecha)}. Sube una receta nueva para no quedar suspendido.
      </Banner>
    );
  }
  return null;
}
