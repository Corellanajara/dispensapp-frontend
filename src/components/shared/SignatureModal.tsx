import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PenTool, Loader2 } from 'lucide-react';

interface SignatureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentLabel: string;
  onSign: (data: { nombre: string; rut: string }) => void;
  isLoading?: boolean;
}

export function SignatureModal({
  open,
  onOpenChange,
  documentLabel,
  onSign,
  isLoading,
}: SignatureModalProps) {
  const [nombre, setNombre] = useState('');
  const [rut, setRut] = useState('');
  const [accepted, setAccepted] = useState(false);

  const isValid =
    nombre.trim().length >= 3 && rut.trim().length >= 7 && accepted;

  function handleSign() {
    if (!isValid) return;
    onSign({ nombre: nombre.trim(), rut: rut.trim() });
    setNombre('');
    setRut('');
    setAccepted(false);
  }

  function handleOpenChange(value: boolean) {
    if (!value) {
      setNombre('');
      setRut('');
      setAccepted(false);
    }
    onOpenChange(value);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenTool className="h-5 w-5 text-indigo-500" />
            Firmar Documento
          </DialogTitle>
          <DialogDescription>
            Firma electrónica para: <strong>{documentLabel}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="sig-nombre">Nombre completo</Label>
            <Input
              id="sig-nombre"
              placeholder="Ingrese su nombre completo"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sig-rut">RUT</Label>
            <Input
              id="sig-rut"
              placeholder="12.345.678-9"
              value={rut}
              onChange={(e) => setRut(e.target.value)}
            />
          </div>

          {nombre.trim().length >= 3 && (
            <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/30 p-6 text-center">
              <p className="text-xs text-muted-foreground mb-2">
                Vista previa de firma
              </p>
              <p className="text-2xl italic font-serif text-foreground">
                {nombre.trim()}
              </p>
            </div>
          )}

          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-muted-foreground leading-tight">
              Declaro que he leído y acepto el contenido de este documento.
              Entiendo que esta firma electrónica tiene validez legal.
            </span>
          </label>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button onClick={handleSign} disabled={!isValid || isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Firmando...
              </>
            ) : (
              <>
                <PenTool className="mr-2 h-4 w-4" />
                Firmar Documento
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
