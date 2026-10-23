import type { SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/** <select> nativo con el mismo estilo de los inputs. Muestra bien la etiqueta elegida y funciona en móvil. */
export function NativeSelect({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50',
        className
      )}
    />
  );
}
