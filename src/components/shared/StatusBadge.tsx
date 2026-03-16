import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  label: string;
  variant: string;
  className?: string;
}

export function StatusBadge({ label, variant, className }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'rounded-full border-transparent font-medium text-[11px] px-2.5 py-0.5',
        variant,
        className,
      )}
    >
      {label}
    </Badge>
  );
}
