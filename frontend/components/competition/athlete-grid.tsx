import { DiveBreakdownCard } from './dive-breakdown-card';
import type { ExtendedAthleteResult } from '@/lib/types';
import { cn } from '@/lib/utils';

interface AthleteGridProps {
  athletes: ExtendedAthleteResult[];
  onEditDive?: (diveId: number) => void;
  onDeleteDive?: (diveId: number) => void;
  onAthleteNameChange?: (athleteId: number, newName: string) => void;
  showCrud?: boolean;
  compact?: boolean;
  className?: string;
  focusedIndex?: number;
}

/**
 * Responsive grid container for athlete dive breakdown cards
 * - 1 column on mobile (<1024px)
 * - 2 columns on large screens (1440px+)
 * - 3 columns on extra-large screens (1920px+)
 * - Supports keyboard navigation (J/K) with visual focus indicator
 */
export function AthleteGrid({
  athletes,
  onEditDive,
  onDeleteDive,
  onAthleteNameChange,
  showCrud = false,
  compact = false,
  className,
  focusedIndex = -1,
}: AthleteGridProps) {
  return (
    <div 
      className={cn(
        "grid gap-4",
        // Responsive column layout
        "grid-cols-1",                    // Mobile: 1 column
        "lg:grid-cols-1",                 // Tablet: 1 column (cards are wide)
        "xl:grid-cols-2",                 // Desktop 1440px+: 2 columns
        "2xl:grid-cols-2",                // Large desktop: 2 columns
        "min-[1920px]:grid-cols-3",       // 1920px+: 3 columns
        className
      )}
    >
      {athletes.map((athlete, index) => (
        <div 
          key={athlete.athlete.id}
          data-athlete-index={index}
          className={cn(
            "transition-all duration-200",
            focusedIndex === index && "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-lg"
          )}
        >
          <DiveBreakdownCard
            athlete={athlete}
            rank={athlete.rank || index + 1}
            onEditDive={onEditDive}
            onDeleteDive={onDeleteDive}
            onAthleteNameChange={onAthleteNameChange}
            showCrud={showCrud}
            compact={compact}
          />
        </div>
      ))}
    </div>
  );
}

export default AthleteGrid;
