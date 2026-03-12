import { AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui';

interface PenaltyIndicatorProps {
  code: string;
  description?: string;
}

/**
 * Displays a penalty indicator badge with tooltip
 * Shows penalty code (e.g., "FD" for failed dive) with explanation on hover
 */
export function PenaltyIndicator({ code, description }: PenaltyIndicatorProps) {
  // Common penalty codes and their descriptions
  const penaltyDescriptions: Record<string, string> = {
    'FD': 'Failed Dive - Score of 0',
    'BD': 'Balk (dive not executed)',
    'P': 'Penalty deduction applied',
    'NB': 'No balk (repeated approach allowed)',
    'DQ': 'Disqualified',
    'DNS': 'Did not start',
    'DNF': 'Did not finish',
  };

  const tooltipText = description || penaltyDescriptions[code.toUpperCase()] || `Penalty: ${code}`;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="destructive" 
            className="h-4 px-1 text-[10px] font-medium cursor-help"
          >
            <AlertCircle className="h-2.5 w-2.5 mr-0.5" />
            {code}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-sm">{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default PenaltyIndicator;
