import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/**
 * Página pública a la que Signapis devuelve al paciente cuando el proceso lo inició el personal
 * (firma o validación de identidad). No requiere sesión: el paciente puede estar en su propio teléfono.
 */
export function FirmaCompletadaPage() {
  const [params] = useSearchParams();
  const certificado = params.get('paso') === 'certificado';

  return (
    <div className="min-h-svh flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <CheckCircle2 className="h-12 w-12 text-success" />
          <div className="space-y-2">
            <h1 className="text-xl font-semibold">
              {certificado ? 'Identidad validada' : 'Proceso de firma terminado'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {certificado
                ? 'Tu firma electrónica avanzada quedará lista en unos momentos. El dispensario ya puede enviarte documentos para firmar.'
                : 'Gracias. El dispensario recibirá el documento firmado en unos segundos.'}
            </p>
            <p className="text-sm text-muted-foreground">Ya puedes cerrar esta ventana.</p>
          </div>
          <Link to="/">
            <Button variant="outline">Ir a Dispensapp</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
