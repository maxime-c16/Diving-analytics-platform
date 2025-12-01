import { useMemo } from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import type { ExtendedAthleteResult } from '@/lib/types';

interface RoundComparisonRadarProps {
  athletes: ExtendedAthleteResult[];
  selectedAthletes?: number[];
  className?: string;
}

// Color palette
const COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#22c55e', // green
  '#f59e0b', // amber
];

/**
 * Radar chart comparing athletes' performance across rounds
 * Each axis is a round, each athlete is a separate radar polygon
 */
export function RoundComparisonRadar({
  athletes,
  selectedAthletes,
  className,
}: RoundComparisonRadarProps) {
  // Filter athletes - show all if no selection, limit to 4 for radar chart visual clarity
  const displayAthletes = useMemo(() => {
    const filtered = selectedAthletes
      ? athletes.filter((a) => selectedAthletes.includes(a.athlete.id))
      : athletes.slice(0, 4); // Radar chart limited to 4 for visual clarity
    return filtered;
  }, [athletes, selectedAthletes]);

  // Build radar data
  const radarData = useMemo(() => {
    const maxRounds = Math.max(...displayAthletes.flatMap((a) => a.dives.map((d) => d.roundNumber)));
    
    return Array.from({ length: maxRounds }, (_, i) => {
      const round = i + 1;
      const dataPoint: Record<string, number | string> = { 
        round: `Round ${round}`,
        fullMark: 100, // Normalize to percentage of max score
      };
      
      displayAthletes.forEach((athlete) => {
        const roundDive = athlete.dives.find((d) => d.roundNumber === round);
        dataPoint[athlete.athlete.name] = roundDive ? roundDive.finalScore : 0;
      });
      
      return dataPoint;
    });
  }, [displayAthletes]);

  // Find max score for scaling
  const maxScore = useMemo(() => {
    return Math.max(
      ...displayAthletes.flatMap((a) => a.dives.map((d) => d.finalScore)),
      50 // minimum max for visual appeal
    );
  }, [displayAthletes]);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">Round-by-Round Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
              <PolarGrid className="stroke-muted" />
              <PolarAngleAxis 
                dataKey="round" 
                className="text-xs"
                tick={{ fill: 'currentColor' }}
              />
              <PolarRadiusAxis 
                angle={30} 
                domain={[0, maxScore]}
                className="text-xs"
                tick={{ fill: 'currentColor' }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length > 0) {
                    return (
                      <div className="bg-card border rounded-lg p-3 shadow-lg">
                        <p className="font-semibold mb-2">{payload[0]?.payload?.round}</p>
                        {payload.map((entry: any, index: number) => (
                          <p key={index} className="text-sm" style={{ color: entry.color }}>
                            {entry.name}: <span className="font-mono">{entry.value?.toFixed(2)}</span>
                          </p>
                        ))}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              {displayAthletes.map((athlete, index) => (
                <Radar
                  key={athlete.athlete.id}
                  name={athlete.athlete.name}
                  dataKey={athlete.athlete.name}
                  stroke={COLORS[index % COLORS.length]}
                  fill={COLORS[index % COLORS.length]}
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              ))}
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend with stats */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
          {displayAthletes.map((athlete, index) => {
            const avgScore = athlete.dives.reduce((sum, d) => sum + d.finalScore, 0) / athlete.dives.length;
            return (
              <div 
                key={athlete.athlete.id}
                className="p-2 rounded-lg border flex items-center gap-2"
                style={{ borderColor: COLORS[index % COLORS.length] }}
              >
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{athlete.athlete.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Avg: {avgScore.toFixed(1)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default RoundComparisonRadar;
