// To add/remove required documents, edit this array.
export interface RequiredDocument {
  id: string;
  tipo: 'receta_medica' | 'certificado_antecedentes' | 'cedula_identidad' | 'otro';
  label: string;
  description: string;
}

export const REQUIRED_PATIENT_DOCUMENTS: RequiredDocument[] = [
  {
    id: 'consentimiento_informado',
    tipo: 'otro',
    label: 'Consentimiento Informado',
    description:
      'Documento de consentimiento informado para el uso de cannabis medicinal',
  },
  {
    id: 'declaracion_jurada',
    tipo: 'otro',
    label: 'Declaración Jurada',
    description: 'Declaración jurada de uso personal y terapéutico',
  },
  {
    id: 'contrato_suministro',
    tipo: 'otro',
    label: 'Contrato de Suministro',
    description: 'Contrato de suministro de productos medicinales',
  },
];
