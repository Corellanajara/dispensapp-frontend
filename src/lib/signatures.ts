// localStorage-based: backend has no "sign document" endpoint
export interface SignatureData {
  nombre: string;
  rut: string;
  fecha: string;
}

const STORAGE_KEY = 'dispensapp_signatures';

function getStore(): Record<string, SignatureData> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, SignatureData>) : {};
  } catch {
    return {};
  }
}

function setStore(store: Record<string, SignatureData>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function getSignatureData(
  requirementId: string,
): SignatureData | null {
  const store = getStore();
  return store[requirementId] ?? null;
}

export function saveSignature(
  requirementId: string,
  data: { nombre: string; rut: string },
): void {
  const store = getStore();
  store[requirementId] = {
    nombre: data.nombre,
    rut: data.rut,
    fecha: new Date().toISOString(),
  };
  setStore(store);
}

export function isDocumentSigned(requirementId: string): boolean {
  return getSignatureData(requirementId) !== null;
}

export function getAllSignatures(): Record<string, SignatureData> {
  return getStore();
}
