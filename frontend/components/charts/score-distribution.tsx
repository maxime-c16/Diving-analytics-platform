import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import type { ExtendedDiveResult } from '@/lib/types';

interface ScoreDistributionProps {
  dives: ExtendedDiveResult[];
  binSize?: number;
  className?: string;
}

/**
 * Histogram showing distribution of dive scores
 * Bins are configurable, default 10-point bins
 */
export function ScoreDistributionChart({
  dives,
  binSize = 10,
  className,
}: ScoreDistributionProps) {
  // Calculate histogram data
  const histogramData = useMemo(() => {
    const scores = dives.map((d) => d.finalScore);
    const minScore = Math.floor(Math.min(...scores) / binSize) * binSize;
    const maxScore = Math.ceil(Math.max(...scores) / binSize) * binSize;
    
    const bins: { range: string; count: number; min: number; max: number }[] = [];
    
    for (let start = minScore; start < maxScore; start += binSize) {
      const end = start + binSize;
      const count = scores.filter((s) => s >= start && s < end).length;
      bins.push({
        range: `${start}-${end}`,
        count,
        min: start,
        max: end,
      });
    }
    
    return bins;
  }, [dives, binSize]);

  // Calculate statistics
  const stats = useMemo(() => {
    const scores = dives.map((d) => d.finalScore);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const sorted = [...scores].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const max = Math.max(...scores);
    const min = Math.min(...scores);
    
    return { mean, median, max, min, total: scores.length };
  }, [dives]);

  // Color gradient based on count
  const maxCount = Math.max(...histogramData.map((d) => d.count));

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">Score Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={histogramData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="range" 
                className="text-xs"
                tick={{ fill: 'currentColor' }}
                label={{ 
                  value: 'Score Range', 
                  position: 'insideBottom',
                  offset: -5,
                  style: { textAnchor: 'middle', fill: 'currentColor' }
                }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fill: 'currentColor' }}
                label={{ 
                  value: 'Count', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle', fill: 'currentColor' }
                }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length > 0) {
                    const data = payload[0].payload;
                    const percentage = ((data.count / stats.total) * 100).toFixed(1);
                    return (
                      <div className="bg-card border rounded-lg p-3 shadow-lg">
                        <p className="font-semibold">{data.range} points</p>
                        <p className="text-lg font-bold">{data.count} dives</p>
                        <p className="text-sm text-muted-foreground">{percentage}% of total</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {histogramData.map((entry, index) => {
                  const intensity = entry.count / maxCount;
                  return (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={`hsl(217, 91%, ${70 - intensity * 30}%)`}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Summary Stats */}
        <div className="mt-4 grid grid-cols-4 gap-4 text-center">
          <div className="p-2 rounded-lg bg-muted/50">
            <div className="text-xs text-muted-foreground">Mean</div>
            <div className="text-lg font-bold">{stats.mean.toFixed(1)}</div>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <div className="text-xs text-muted-foreground">Median</div>
            <div className="text-lg font-bold">{stats.median.toFixed(1)}</div>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <div className="text-xs text-muted-foreground">Min</div>
            <div className="text-lg font-bold">{stats.min.toFixed(1)}</div>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <div className="text-xs text-muted-foreground">Max</div>
            <div className="text-lg font-bold">{stats.max.toFixed(1)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default ScoreDistributionChart;
