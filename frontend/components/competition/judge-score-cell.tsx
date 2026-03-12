import { cn } from '@/lib/utils';

interface JudgeScoreCellProps {
  score: number;
  isDropped: boolean;
  compact?: boolean;
  judgeNumber?: number;
}

/**
 * Displays a single judge score with styling for dropped scores
 * - Dropped scores show strikethrough and muted color
 * - Normal scores show in standard color
 * - Includes screen reader text for accessibility
 */
export function JudgeScoreCell({ score, isDropped, compact = false, judgeNumber }: JudgeScoreCellProps) {
  const srText = judgeNumber 
    ? `Judge ${judgeNumber}: ${score.toFixed(1)}${isDropped ? ' (dropped)' : ''}`
    : `${score.toFixed(1)}${isDropped ? ' (dropped)' : ''}`;

  return (
    <span
      className={cn(
        "font-mono tabular-nums",
        compact ? "text-xs" : "text-sm",
        isDropped && "line-through text-muted-foreground/50",
        !isDropped && "text-foreground"
      )}
      aria-label={srText}
      title={isDropped ? 'Dropped (highest or lowest)' : undefined}
    >
      {score.toFixed(1)}
      {isDropped && <span className="sr-only"> (dropped)</span>}
    </span>
  );
}

export default JudgeScoreCell;
