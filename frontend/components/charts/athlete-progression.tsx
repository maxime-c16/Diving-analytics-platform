import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import type { ExtendedAthleteResult } from '@/lib/types';

interface AthleteProgressionProps {
  athletes: ExtendedAthleteResult[];
  selectedAthletes?: number[];
  className?: string;
}

// Color palette for different athletes (expanded to support 16+ athletes)
const COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#22c55e', // green
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#84cc16', // lime
  '#f97316', // orange
  '#14b8a6', // teal
  '#a855f7', // purple
  '#eab308', // yellow
  '#6366f1', // indigo
  '#10b981', // emerald
  '#f43f5e', // rose
  '#0ea5e9', // sky
];

/**
 * Line chart showing athlete score progression across rounds
 * Each athlete is a separate line, x-axis is round number, y-axis is cumulative score
 */
export function AthleteProgressionChart({
  athletes,
  selectedAthletes,
  className,
}: AthleteProgressionProps) {
  const [hoveredAthlete, setHoveredAthlete] = useState<number | null>(null);

  // Filter athletes if selection is provided
  const displayAthletes = selectedAthletes
    ? athletes.filter((a) => selectedAthletes.includes(a.athlete.id))
    : athletes; // Show all athletes

  // Build chart data: each round is a data point
  const maxRounds = Math.max(...displayAthletes.flatMap((a) => a.dives.map((d) => d.roundNumber)));
  
  const chartData = Array.from({ length: maxRounds }, (_, i) => {
    const round = i + 1;
    const dataPoint: Record<string, number | string> = { round: `Round ${round}` };
    
    displayAthletes.forEach((athlete) => {
      // Calculate cumulative score up to this round
      const divesUpToRound = athlete.dives.filter((d) => d.roundNumber <= round);
      const cumulative = divesUpToRound.reduce((sum, d) => sum + d.finalScore, 0);
      dataPoint[athlete.athlete.name] = Number(cumulative.toFixed(2));
    });
    
    return dataPoint;
  });

  // Generate accessible description
  const chartDescription = `Line chart showing cumulative score progression for ${displayAthletes.length} athletes across ${maxRounds} rounds. ${
    displayAthletes.length > 0 
      ? `Athletes shown: ${displayAthletes.map(a => a.athlete.name).join(', ')}.`
      : ''
  }`;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">Athlete Score Progression</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Screen reader description for chart */}
        <p className="sr-only" aria-live="polite">{chartDescription}</p>
        <div className="h-[400px]" role="img" aria-label={chartDescription}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="round" 
                className="text-xs"
                tick={{ fill: 'currentColor' }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fill: 'currentColor' }}
                label={{ 
                  value: 'Cumulative Score', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle', fill: 'currentColor' }
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '10px' }}
                onMouseEnter={(e) => setHoveredAthlete(displayAthletes.find(a => a.athlete.name === e.value)?.athlete.id || null)}
                onMouseLeave={() => setHoveredAthlete(null)}
              />
              {displayAthletes.map((athlete, index) => (
                <Line
                  key={athlete.athlete.id}
                  type="monotone"
                  dataKey={athlete.athlete.name}
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth={hoveredAthlete === athlete.athlete.id ? 3 : 2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  opacity={hoveredAthlete === null || hoveredAthlete === athlete.athlete.id ? 1 : 0.3}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export default AthleteProgressionChart;
