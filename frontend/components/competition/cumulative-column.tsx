import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface CumulativeColumnProps {
  cumulative: number;
  previous?: number;
  showTrend?: boolean;
}

/**
 * Displays cumulative score with optional trend indicator
 * Shows running total for athlete's dives
 */
export function CumulativeColumn({ 
  cumulative, 
  previous, 
  showTrend = false 
}: CumulativeColumnProps) {
  const diff = previous !== undefined ? cumulative - previous : undefined;
  
  return (
    <div className="flex items-center justify-end gap-1">
      {showTrend && diff !== undefined && (
        <span className="text-xs">
          {diff > 0 ? (
            <TrendingUp className="h-3 w-3 text-green-500" />
          ) : diff < 0 ? (
            <TrendingDown className="h-3 w-3 text-red-500" />
          ) : (
            <Minus className="h-3 w-3 text-muted-foreground" />
          )}
        </span>
      )}
      <span className="font-medium text-primary tabular-nums">
        {cumulative.toFixed(2)}
      </span>
    </div>
  );
}

export default CumulativeColumn;
