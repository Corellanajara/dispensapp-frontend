import { useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Patient } from '@/types';

/** URL que se codifica en el QR: abre la ficha del paciente en el panel del dispensario. */
function getPatientQRUrl(patientId: string) {
  return `${window.location.origin}/pacientes/${patientId}`;
}

interface PatientQRCodeProps {
  patient: Pick<Patient, '_id' | 'nombre' | 'apellido' | 'rut'>;
  size?: number;
  showActions?: boolean;
}

export function PatientQRCode({ patient, size = 220, showActions = true }: PatientQRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const url = getPatientQRUrl(patient._id);
  const fullName = `${patient.nombre} ${patient.apellido}`;
  const fileName = `qr-${patient.rut.replace(/[^0-9kK]/g, '')}.png`;

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = fileName;
    link.click();
  };

  const handlePrint = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const win = window.open('', '_blank', 'width=420,height=560');
    if (!win) return;
    const doc = win.document;
    doc.title = `QR ${fullName}`;
    doc.body.style.cssText =
      'font-family:system-ui,sans-serif;text-align:center;padding:24px;margin:0';
    const img = doc.createElement('img');
    img.src = canvas.toDataURL('image/png');
    img.style.cssText = 'width:260px;height:260px';
    const name = doc.createElement('h2');
    name.textContent = fullName;
    name.style.margin = '16px 0 4px';
    const rut = doc.createElement('p');
    rut.textContent = `RUT ${patient.rut}`;
    rut.style.margin = '0';
    doc.body.append(img, name, rut);
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
        <p className="font-medium">{fullName}</p>
        <p className="font-mono text-sm text-muted-foreground">{patient.rut}</p>
      </div>
      {showActions && (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Descargar
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
        </div>
      )}
    </div>
  );
}
