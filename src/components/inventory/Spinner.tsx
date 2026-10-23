/** Indicador de carga centrado. */
export function Spinner({ className = 'py-10' }: { className?: string }) {
  return (
    <div className={`flex justify-center ${className}`}>
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}
