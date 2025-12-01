import { useState } from 'react';
import { ChevronDown, ChevronUp, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from '@/components/ui';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui';
import { JudgeScoreCell } from './judge-score-cell';
import { CumulativeColumn } from './cumulative-column';
import { PenaltyIndicator } from './penalty-indicator';
import { EditableAthleteName } from './editable-athlete-name';
import { calculateEffectiveSum, getDroppedIndices, calculateCumulativeScores } from '@/lib/scoring';
import type { ExtendedDiveResult, ExtendedAthleteResult } from '@/lib/types';
import { cn } from '@/lib/utils';

interface DiveBreakdownCardProps {
  athlete: ExtendedAthleteResult;
  rank: number;
  onEditDive?: (diveId: number) => void;
  onDeleteDive?: (diveId: number) => void;
  onAthleteNameChange?: (athleteId: number, newName: string) => void;
  compact?: boolean;
  showCrud?: boolean;
}

/**
 * Displays an athlete's dive breakdown with:
 * - Collapsible dive list
 * - Judge score columns (J1-J7) with dropped score styling
 * - Sum, DD, Score, and Cumulative columns
 * - Penalty indicators
 * - Edit/delete actions (optional)
 */
export function DiveBreakdownCard({
  athlete,
  rank,
  onEditDive,
  onDeleteDive,
  onAthleteNameChange,
  compact = false,
  showCrud = false,
}: DiveBreakdownCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const { dives } = athlete;
  
  // Find max number of judges across all dives
  const maxJudges = Math.max(
    ...dives.map((d) => d.judgeScores?.length || 0),
    5 // minimum 5 judges
  );
  
  // Calculate cumulative scores
  const cumulativeScores = calculateCumulativeScores(
    dives.map((d) => ({
      judgeScores: d.judgeScores || [],
      difficulty: d.difficulty,
      finalScore: d.finalScore,
    }))
  );

  return (
    <Card className={cn("overflow-hidden", compact && "text-sm")}>
      <CardHeader 
        className={cn(
          "cursor-pointer select-none transition-colors hover:bg-muted/50",
          compact ? "py-2 px-3" : "py-3 px-4"
        )}
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-label={`${athlete.athlete.name}, rank ${rank}, total score ${athlete.totalScore.toFixed(2)}. ${isExpanded ? 'Click to collapse' : 'Click to expand'} dive details.`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            {/* Rank Badge */}
            <Badge 
              variant={rank <= 3 ? "default" : "secondary"}
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center p-0 text-sm font-bold",
                rank === 1 && "bg-yellow-500 text-yellow-950",
                rank === 2 && "bg-gray-400 text-gray-900",
                rank === 3 && "bg-amber-600 text-amber-50"
              )}
            >
              {rank}
            </Badge>
            
            {/* Athlete Info */}
            <div>
              {showCrud && onAthleteNameChange ? (
                <EditableAthleteName
                  athleteId={athlete.athlete.id}
                  name={athlete.athlete.name}
                  onSave={(newName) => onAthleteNameChange(athlete.athlete.id, newName)}
                  compact={compact}
                />
              ) : (
                <CardTitle className={cn("font-semibold", compact ? "text-base" : "text-lg")}>
                  {athlete.athlete.name}
                </CardTitle>
              )}
              {athlete.athlete.country && (
                <span className="text-xs text-muted-foreground">
                  {athlete.athlete.country}
                </span>
              )}
            </div>
          </div>
          
          {/* Total Score & Toggle */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className={cn("font-bold text-primary", compact ? "text-lg" : "text-xl")}>
                {athlete.totalScore.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground">
                {dives.length} dives
              </div>
            </div>
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className={cn("pt-0", compact ? "px-2 pb-2" : "px-4 pb-4")}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="text-left py-2 px-1 w-12">Rd</th>
                  <th className="text-left py-2 px-1 w-16">Dive</th>
                  <th className="text-center py-2 px-1 w-10">DD</th>
                  {/* Judge columns */}
                  {Array.from({ length: maxJudges }).map((_, i) => (
                    <th key={i} className="text-center py-2 px-1 w-10">
                      J{i + 1}
                    </th>
                  ))}
                  <th className="text-center py-2 px-1 w-12">Sum</th>
                  <th className="text-right py-2 px-1 w-14">Score</th>
                  <th className="text-right py-2 px-1 w-16">Cumul</th>
                  {showCrud && <th className="w-16"></th>}
                </tr>
              </thead>
              <tbody>
                {dives.map((dive, diveIndex) => {
                  const judgeScores = dive.judgeScores || [];
                  const droppedIndices = getDroppedIndices(judgeScores);
                  const effectiveSum = calculateEffectiveSum(judgeScores);
                  const hasWarning = judgeScores.length < 5;
                  
                  return (
                    <tr 
                      key={dive.id} 
                      className={cn(
                        "border-b last:border-b-0 transition-colors hover:bg-muted/30",
                        compact ? "text-xs" : "text-sm"
                      )}
                    >
                      {/* Round */}
                      <td className="py-1.5 px-1 text-muted-foreground">
                        {dive.roundNumber}
                      </td>
                      
                      {/* Dive Code + Penalty */}
                      <td className="py-1.5 px-1 font-mono font-medium">
                        <div className="flex items-center gap-1">
                          {dive.diveCode}
                          {dive.penaltyCode && (
                            <PenaltyIndicator 
                              code={dive.penaltyCode} 
                              description={dive.penaltyDescription}
                            />
                          )}
                        </div>
                      </td>
                      
                      {/* Difficulty */}
                      <td className="py-1.5 px-1 text-center text-muted-foreground">
                        {dive.difficulty.toFixed(1)}
                      </td>
                      
                      {/* Judge Scores */}
                      {Array.from({ length: maxJudges }).map((_, judgeIndex) => {
                        const score = judgeScores[judgeIndex];
                        const isDropped = droppedIndices.includes(judgeIndex);
                        
                        return (
                          <td key={judgeIndex} className="py-1.5 px-1 text-center">
                            {score !== undefined ? (
                              <JudgeScoreCell 
                                score={score} 
                                isDropped={isDropped}
                                compact={compact}
                                judgeNumber={judgeIndex + 1}
                              />
                            ) : (
                              <span className="text-muted-foreground/30" aria-label={`Judge ${judgeIndex + 1}: no score`}>—</span>
                            )}
                          </td>
                        );
                      })}
                      
                      {/* Effective Sum */}
                      <td className="py-1.5 px-1 text-center">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className={cn(
                                "cursor-help",
                                hasWarning && "text-yellow-600 dark:text-yellow-400"
                              )}>
                                {hasWarning && (
                                  <AlertTriangle className="inline h-3 w-3 mr-0.5" />
                                )}
                                {effectiveSum.sum.toFixed(1)}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              {hasWarning ? (
                                <p>Only {judgeScores.length} judge scores available</p>
                              ) : (
                                <p>
                                  Sum of middle {judgeScores.length - 2} scores
                                  <br />
                                  (dropped high: {Math.max(...judgeScores).toFixed(1)}, 
                                  low: {Math.min(...judgeScores).toFixed(1)})
                                </p>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </td>
                      
                      {/* Final Score */}
                      <td className="py-1.5 px-1 text-right font-medium">
                        {dive.finalScore.toFixed(2)}
                      </td>
                      
                      {/* Cumulative */}
                      <td className="py-1.5 px-1 text-right">
                        <CumulativeColumn 
                          cumulative={cumulativeScores[diveIndex]?.cumulative || 0}
                          previous={diveIndex > 0 ? cumulativeScores[diveIndex - 1]?.cumulative : undefined}
                        />
                      </td>
                      
                      {/* CRUD Actions */}
                      {showCrud && (
                        <td className="py-1.5 px-1">
                          <div className="flex items-center justify-end gap-1">
                            {onEditDive && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditDive(dive.id);
                                }}
                                aria-label={`Edit dive ${dive.diveCode} in round ${dive.roundNumber}`}
                              >
                                <Edit2 className="h-3 w-3" aria-hidden="true" />
                              </Button>
                            )}
                            {onDeleteDive && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 text-destructive hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteDive(dive.id);
                                }}
                                aria-label={`Delete dive ${dive.diveCode} in round ${dive.roundNumber}`}
                              >
                                <Trash2 className="h-3 w-3" aria-hidden="true" />
                              </Button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default DiveBreakdownCard;
