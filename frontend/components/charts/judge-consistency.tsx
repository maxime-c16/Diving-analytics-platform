import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui';
import type { JudgeStatsResult } from '@/lib/api';
import { cn } from '@/lib/utils';

interface JudgeConsistencyProps {
  judgeStats: JudgeStatsResult;
  className?: string;
}

// Color scale based on consistency
const getConsistencyColor = (consistency: 'high' | 'medium' | 'low') => {
  switch (consistency) {
    case 'high':
      return '#22c55e'; // green
    case 'medium':
      return '#f59e0b'; // amber
    case 'low':
      return '#ef4444'; // red
    default:
      return '#94a3b8'; // gray
  }
};

/**
 * Grouped bar chart showing judge scoring statistics
 * Displays mean, std, min, max for each judge with consistency color coding
 */
export function JudgeConsistencyChart({
  judgeStats,
  className,
}: JudgeConsistencyProps) {
  const { judges, overallConsistency } = judgeStats;

  // Transform data for chart
  const chartData = judges.map((judge) => ({
    name: judge.judge,
    mean: judge.mean,
    std: judge.std,
    min: judge.min,
    max: judge.max,
    range: judge.max - judge.min,
    consistency: judge.consistency,
    diveCount: judge.diveCount,
  }));

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Judge Consistency Analysis</CardTitle>
        <Badge 
          variant={overallConsistency === 'high' ? 'success' : overallConsistency === 'medium' ? 'warning' : 'destructive'}
        >
          Overall: {overallConsistency}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="name" 
                className="text-xs"
                tick={{ fill: 'currentColor' }}
              />
              <YAxis 
                domain={[0, 10]}
                className="text-xs"
                tick={{ fill: 'currentColor' }}
                label={{ 
                  value: 'Score', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle', fill: 'currentColor' }
                }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length > 0) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-card border rounded-lg p-3 shadow-lg">
                        <p className="font-semibold">{data.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {data.diveCount} dives scored
                        </p>
                        <div className="mt-2 space-y-1 text-sm">
                          <p>Mean: <span className="font-mono">{data.mean.toFixed(2)}</span></p>
                          <p>Std Dev: <span className="font-mono">{data.std.toFixed(2)}</span></p>
                          <p>Range: <span className="font-mono">{data.min.toFixed(1)} - {data.max.toFixed(1)}</span></p>
                        </div>
                        <Badge 
                          variant={data.consistency === 'high' ? 'success' : data.consistency === 'medium' ? 'warning' : 'destructive'}
                          className="mt-2"
                        >
                          {data.consistency} consistency
                        </Badge>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              <Bar dataKey="mean" name="Mean Score" fill="#3b82f6">
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getConsistencyColor(entry.consistency)}
                    opacity={0.8}
                  />
                ))}
              </Bar>
              <Bar dataKey="std" name="Std Deviation" fill="#94a3b8" opacity={0.6} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Stats Summary */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          {judges.map((judge) => (
            <div 
              key={judge.judge}
              className={cn(
                "p-3 rounded-lg border",
                judge.consistency === 'high' && "border-green-500/30 bg-green-500/10",
                judge.consistency === 'medium' && "border-amber-500/30 bg-amber-500/10",
                judge.consistency === 'low' && "border-red-500/30 bg-red-500/10"
              )}
            >
              <div className="font-semibold">{judge.judge}</div>
              <div className="text-2xl font-bold">{judge.mean.toFixed(1)}</div>
              <div className="text-xs text-muted-foreground">
                σ = {judge.std.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default JudgeConsistencyChart;
