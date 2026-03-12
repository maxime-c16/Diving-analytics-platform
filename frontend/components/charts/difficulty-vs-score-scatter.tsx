import { useMemo } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
  Legend,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import type { ExtendedDiveResult } from '@/lib/types';

interface DifficultyScoreScatterProps {
  dives: ExtendedDiveResult[];
  showTrendline?: boolean;
  className?: string;
}

/**
 * Scatter plot showing difficulty vs final score correlation
 * Each point is a dive, colored by position (A/B/C/D)
 */
export function DifficultyScoreScatter({
  dives,
  showTrendline = true,
  className,
}: DifficultyScoreScatterProps) {
  // Group dives by position
  const groupedData = useMemo(() => {
    const groups: Record<string, { difficulty: number; score: number; diveCode: string }[]> = {
      A: [],
      B: [],
      C: [],
      D: [],
      Other: [],
    };

    dives.forEach((dive) => {
      const position = dive.diveCode?.slice(-1).toUpperCase() || 'Other';
      const group = ['A', 'B', 'C', 'D'].includes(position) ? position : 'Other';
      groups[group].push({
        difficulty: dive.difficulty,
        score: dive.finalScore,
        diveCode: dive.diveCode,
      });
    });

    return groups;
  }, [dives]);

  // Calculate trendline (simple linear regression)
  const trendline = useMemo(() => {
    if (!showTrendline || dives.length < 2) return null;

    const n = dives.length;
    const sumX = dives.reduce((sum, d) => sum + d.difficulty, 0);
    const sumY = dives.reduce((sum, d) => sum + d.finalScore, 0);
    const sumXY = dives.reduce((sum, d) => sum + d.difficulty * d.finalScore, 0);
    const sumX2 = dives.reduce((sum, d) => sum + d.difficulty * d.difficulty, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const minDD = Math.min(...dives.map((d) => d.difficulty));
    const maxDD = Math.max(...dives.map((d) => d.difficulty));

    return [
      { difficulty: minDD, score: slope * minDD + intercept },
      { difficulty: maxDD, score: slope * maxDD + intercept },
    ];
  }, [dives, showTrendline]);

  // Correlation coefficient
  const correlation = useMemo(() => {
    if (dives.length < 2) return 0;

    const n = dives.length;
    const sumX = dives.reduce((sum, d) => sum + d.difficulty, 0);
    const sumY = dives.reduce((sum, d) => sum + d.finalScore, 0);
    const sumXY = dives.reduce((sum, d) => sum + d.difficulty * d.finalScore, 0);
    const sumX2 = dives.reduce((sum, d) => sum + d.difficulty * d.difficulty, 0);
    const sumY2 = dives.reduce((sum, d) => sum + d.finalScore * d.finalScore, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  }, [dives]);

  const positionColors: Record<string, string> = {
    A: '#3b82f6', // Straight - blue
    B: '#ef4444', // Pike - red
    C: '#22c55e', // Tuck - green
    D: '#f59e0b', // Free - amber
    Other: '#94a3b8',
  };

  const positionNames: Record<string, string> = {
    A: 'Straight',
    B: 'Pike',
    C: 'Tuck',
    D: 'Free',
    Other: 'Other',
  };

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Difficulty vs Score</CardTitle>
        <div className="text-sm text-muted-foreground">
          r = <span className="font-mono">{correlation.toFixed(3)}</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                type="number"
                dataKey="difficulty"
                name="Difficulty"
                domain={['dataMin - 0.5', 'dataMax + 0.5']}
                className="text-xs"
                tick={{ fill: 'currentColor' }}
                label={{ 
                  value: 'Degree of Difficulty', 
                  position: 'insideBottom',
                  offset: -10,
                  style: { textAnchor: 'middle', fill: 'currentColor' }
                }}
              />
              <YAxis
                type="number"
                dataKey="score"
                name="Score"
                domain={['dataMin - 5', 'dataMax + 5']}
                className="text-xs"
                tick={{ fill: 'currentColor' }}
                label={{ 
                  value: 'Final Score', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle', fill: 'currentColor' }
                }}
              />
              <ZAxis range={[50, 200]} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length > 0) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-card border rounded-lg p-3 shadow-lg">
                        <p className="font-semibold font-mono">{data.diveCode}</p>
                        <p className="text-sm">
                          DD: <span className="font-mono">{data.difficulty.toFixed(1)}</span>
                        </p>
                        <p className="text-sm">
                          Score: <span className="font-mono">{data.score.toFixed(2)}</span>
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              {Object.entries(groupedData).map(([position, data]) => {
                if (data.length === 0) return null;
                return (
                  <Scatter
                    key={position}
                    name={positionNames[position]}
                    data={data}
                    fill={positionColors[position]}
                    opacity={0.7}
                  />
                );
              })}
              {/* Trendline */}
              {trendline && (
                <Scatter
                  name="Trend"
                  data={trendline}
                  line={{ stroke: '#94a3b8', strokeWidth: 2, strokeDasharray: '5 5' }}
                  shape={() => <></>}
                />
              )}
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Position legend */}
        <div className="mt-4 flex flex-wrap gap-4 justify-center">
          {Object.entries(positionColors).map(([pos, color]) => {
            const count = groupedData[pos]?.length || 0;
            if (count === 0) return null;
            return (
              <div key={pos} className="flex items-center gap-2 text-sm">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span>{positionNames[pos]}</span>
                <span className="text-muted-foreground">({count})</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default DifficultyScoreScatter;
