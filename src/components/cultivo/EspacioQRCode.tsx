import { useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { EspacioCultivo } from '@/types';
import { ubicacionLabel } from '@/components/inventory/helpers';

/** URL que va dentro del QR: abre la ficha del espacio (requiere sesión del personal). */
function getEspacioQRUrl(codigoQR: string) {
  return `${window.location.origin}/qr/${codigoQR}`;
}

interface Props {
  espacio: Pick<EspacioCultivo, 'codigo' | 'codigoQR' | 'flor' | 'ubicacion' | 'metrosCuadrados'>;
  size?: number;
}

/**
 * QR del espacio de cultivo. La etiqueta impresa muestra código, flor y sala,
 * nunca datos del paciente (queda pegada en la sala, a la vista).
 */
export function EspacioQRCode({ espacio, size = 200 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const url = getEspacioQRUrl(espacio.codigoQR);
  const sala = ubicacionLabel(espacio.ubicacion);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `qr-${espacio.codigo}.png`;
    link.click();
  };

  const handlePrint = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const win = window.open('', '_blank', 'width=420,height=600');
    if (!win) return;
    const doc = win.document;
    doc.title = `QR ${espacio.codigo}`;
    doc.body.style.cssText = 'font-family:system-ui,sans-serif;text-align:center;padding:24px;margin:0';
    const img = doc.createElement('img');
    img.src = canvas.toDataURL('image/png');
    img.style.cssText = 'width:260px;height:260px';
    const codigo = doc.createElement('h2');
    codigo.textContent = espacio.codigo;
    codigo.style.cssText = 'margin:16px 0 4px;font-family:monospace';
    const flor = doc.createElement('p');
    flor.textContent = `${espacio.flor} · ${espacio.metrosCuadrados} m²`;
    flor.style.margin = '0 0 4px';
    const ubic = doc.createElement('p');
    ubic.textContent = sala;
    ubic.style.cssText = 'margin:0;color:#555';
    doc.body.append(img, codigo, flor, ubic);
    img.onload = () => {
      win.focus();
      win.print();
    };
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="rounded-xl border bg-white p-4">
        <QRCodeCanvas ref={canvasRef} value={url} size={size} level="M" marginSize={1} />
      </div>
      <div className="text-center">
        <p className="font-mono font-medium">{espacio.codigo}</p>
        <p className="text-sm text-muted-foreground">{espacio.flor} · {sala}</p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handleDownload}>
          <Download className="h-4 w-4 mr-2" />
          Descargar
        </Button>
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Imprimir etiqueta
        </Button>
      </div>
    </div>
  );
}
