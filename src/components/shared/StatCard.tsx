import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

type TintColor = 'blue' | 'green' | 'amber' | 'rose' | 'violet' | 'cyan';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  tint?: TintColor;
  trend?: {
    value: number;
    label?: string;
  };
  className?: string;
}

const iconTintMap: Record<TintColor, string> = {
  blue: 'bg-blue-500/12 text-blue-600 dark:text-blue-400',
  green: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400',
  amber: 'bg-amber-500/12 text-amber-600 dark:text-amber-400',
  rose: 'bg-rose-500/12 text-rose-600 dark:text-rose-400',
  violet: 'bg-violet-500/12 text-violet-600 dark:text-violet-400',
  cyan: 'bg-cyan-500/12 text-cyan-600 dark:text-cyan-400',
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tint,
  trend,
  className,
}: StatCardProps) {
  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-all',
        tint && `tint-${tint} ring-0`,
        className,
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-[13px] font-medium text-muted-foreground">{title}</p>
            <p className="text-[28px] font-semibold tracking-tight leading-none">{value}</p>
            {trend && (
              <p
                className={cn(
                  'text-xs font-medium',
                  trend.value >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
                )}
              >
                {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%
                {trend.label && (
                  <span className="ml-1 text-muted-foreground font-normal">{trend.label}</span>
                )}
              </p>
            )}
            {subtitle && !trend && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          {Icon && (
            <div
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                tint ? iconTintMap[tint] : 'bg-primary/10 text-primary',
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
