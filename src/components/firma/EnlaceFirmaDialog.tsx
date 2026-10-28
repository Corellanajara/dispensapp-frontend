import { Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface EnlaceFirmaDialogProps {
  url: string | null;
  titulo: string;
  descripcion: string;
  onClose: () => void;
}

/**
 * Muestra un enlace del proveedor de firma (firmar o validar identidad) para que el personal
 * lo abra en este equipo, con el paciente presente, o lo copie y se lo envíe.
 */
export function EnlaceFirmaDialog({ url, titulo, descripcion, onClose }: EnlaceFirmaDialogProps) {
  const copiar = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Enlace copiado');
    } catch {
      toast.error('No se pudo copiar. Selecciona el enlace y cópialo manualmente.');
    }
  };

  return (
    <Dialog open={!!url} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descripcion}</DialogDescription>
        </DialogHeader>
        <Input readOnly value={url ?? ''} onFocus={(e) => e.currentTarget.select()} className="font-mono text-xs" />
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={copiar}>
            <Copy className="h-4 w-4 mr-1.5" /> Copiar enlace
          </Button>
          <Button onClick={() => url && window.open(url, '_blank', 'noopener,noreferrer')}>
            <ExternalLink className="h-4 w-4 mr-1.5" /> Abrir aquí
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
