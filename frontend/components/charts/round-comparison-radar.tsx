'use client';

import React, { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ExtendedAthleteResult } from '@/lib/types';

interface RoundComparisonProps {
  athletes: ExtendedAthleteResult[];
  selectedAthletes?: number[];
  className?: string;
}

// Expanded color palette for more athletes
const COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#22c55e', // green
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
  '#6366f1', // indigo
  '#84cc16', // lime
];

/**
 * Round-by-Round Comparison Chart - Reworked
 * 
 * Multi-view visualization showing:
 * 1. Rank Chart: Bump chart showing position changes across rounds
 * 2. Score Chart: Grouped bars comparing dive scores per round
 * 3. Momentum: Shows who is gaining/losing ground
 * 
 * Supports all athletes (not limited to 4)
 */
export function RoundComparisonRadar({
  athletes,
  selectedAthletes,
  className,
}: RoundComparisonProps) {
  const [activeView, setActiveView] = useState<'ranks' | 'scores' | 'momentum'>('ranks');
  const [hoveredAthlete, setHoveredAthlete] = useState<string | null>(null);

  // Filter athletes based on selection
  const displayAthletes = useMemo(() => {
    if (selectedAthletes && selectedAthletes.length > 0) {
      return athletes.filter((a) => selectedAthletes.includes(a.athlete.id));
    }
    return athletes;
  }, [athletes, selectedAthletes]);

  // Calculate max rounds
  const maxRounds = useMemo(() => {
    return Math.max(...displayAthletes.flatMap((a) => a.dives.map((d) => d.roundNumber)));
  }, [displayAthletes]);

  // Build ranking data for each round (cumulative score determines rank)
  const rankData = useMemo(() => {
    return Array.from({ length: maxRounds }, (_, i) => {
      const round = i + 1;
      
      // Calculate cumulative scores up to this round for each athlete
      const cumulatives = displayAthletes.map((athlete) => {
        const cumuScore = athlete.dives
          .filter((d) => d.roundNumber <= round)
          .reduce((sum, d) => sum + d.finalScore, 0);
        return { athlete, cumuScore };
      });
      
      // Sort by cumulative score to get rank
      cumulatives.sort((a, b) => b.cumuScore - a.cumuScore);
      
      const dataPoint: Record<string, number | string> = { round: `R${round}` };
      
      cumulatives.forEach((item, index) => {
        dataPoint[item.athlete.athlete.name] = index + 1; // 1-based rank
        dataPoint[`${item.athlete.athlete.name}_score`] = item.cumuScore;
      });
      
      return dataPoint;
    });
  }, [displayAthletes, maxRounds]);

  // Build per-round score comparison data
  const scoreData = useMemo(() => {
    return Array.from({ length: maxRounds }, (_, i) => {
      const round = i + 1;
      const dataPoint: Record<string, number | string> = { round: `Round ${round}` };
      
      displayAthletes.forEach((athlete) => {
        const dive = athlete.dives.find((d) => d.roundNumber === round);
        dataPoint[athlete.athlete.name] = dive ? dive.finalScore : 0;
        if (dive) {
          dataPoint[`${athlete.athlete.name}_dive`] = dive.diveCode;
          dataPoint[`${athlete.athlete.name}_dd`] = dive.difficulty;
        }
      });
      
      return dataPoint;
    });
  }, [displayAthletes, maxRounds]);

  // Build momentum data (score change from previous round rank)
  const momentumData = useMemo(() => {
    const data: Array<{ name: string; positionsGained: number; avgRoundScore: number; color: string }> = [];
    
    displayAthletes.forEach((athlete, idx) => {
      // Starting rank vs final rank
      const startRank = rankData[0]?.[athlete.athlete.name] as number || 1;
      const endRank = rankData[rankData.length - 1]?.[athlete.athlete.name] as number || 1;
      const positionsGained = startRank - endRank; // Positive = moved up
      
      const avgScore = athlete.dives.reduce((sum, d) => sum + d.finalScore, 0) / athlete.dives.length;
      
      data.push({
        name: athlete.athlete.name,
        positionsGained,
        avgRoundScore: Number(avgScore.toFixed(1)),
        color: COLORS[idx % COLORS.length],
      });
    });
    
    // Sort by positions gained
    data.sort((a, b) => b.positionsGained - a.positionsGained);
    return data;
  }, [displayAthletes, rankData]);

  // Final standings
  const finalStandings = useMemo(() => {
    return displayAthletes
      .map((athlete, idx) => ({
        athlete,
        totalScore: athlete.dives.reduce((sum, d) => sum + d.finalScore, 0),
        color: COLORS[idx % COLORS.length],
      }))
      .sort((a, b) => b.totalScore - a.totalScore);
  }, [displayAthletes]);

  if (displayAthletes.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Round-by-Round Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            No athlete data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Round-by-Round Comparison</CardTitle>
        <CardDescription>
          {displayAthletes.length} athletes competing across {maxRounds} rounds
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeView} onValueChange={(v) => setActiveView(v as typeof activeView)}>
          <TabsList className="mb-4">
            <TabsTrigger value="ranks">Position Changes</TabsTrigger>
            <TabsTrigger value="scores">Dive Scores</TabsTrigger>
            <TabsTrigger value="momentum">Momentum</TabsTrigger>
          </TabsList>
          
          {/* Rank/Position Change View - Bump Chart */}
          <TabsContent value="ranks">
            <div className="mb-3 text-sm text-muted-foreground">
              Track how athlete positions change throughout the competition. Lower is better.
            </div>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rankData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="round" 
                    tick={{ fontSize: 12, fill: 'currentColor' }}
                  />
                  <YAxis 
                    reversed
                    domain={[1, displayAthletes.length]}
                    ticks={Array.from({ length: displayAthletes.length }, (_, i) => i + 1)}
                    tick={{ fontSize: 12, fill: 'currentColor' }}
                    label={{ 
                      value: 'Position', 
                      angle: -90, 
                      position: 'insideLeft',
                      style: { textAnchor: 'middle', fill: 'currentColor' }
                    }}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || !payload.length) return null;
                      return (
                        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg max-w-xs">
                          <p className="font-semibold mb-2">{label}</p>
                          {payload
                            .filter((p) => !p.dataKey?.toString().includes('_score'))
                            .sort((a, b) => (a.value as number) - (b.value as number))
                            .map((entry, index: number) => (
                              <div key={index} className="flex justify-between text-sm gap-3" style={{ color: entry.color }}>
                                <span className="truncate">{entry.name}</span>
                                <span className="font-mono font-semibold">#{entry.value}</span>
                              </div>
                            ))}
                        </div>
                      );
                    }}
                  />
                  {displayAthletes.map((athlete, index) => (
                    <Line
                      key={athlete.athlete.id}
                      type="monotone"
                      dataKey={athlete.athlete.name}
                      stroke={COLORS[index % COLORS.length]}
                      strokeWidth={hoveredAthlete === athlete.athlete.name ? 4 : 2}
                      opacity={hoveredAthlete && hoveredAthlete !== athlete.athlete.name ? 0.3 : 1}
                      dot={{ r: 5, fill: COLORS[index % COLORS.length] }}
                      activeDot={{ r: 7 }}
                      onMouseEnter={() => setHoveredAthlete(athlete.athlete.name)}
                      onMouseLeave={() => setHoveredAthlete(null)}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            {/* Athlete Legend */}
            <div className="mt-4 flex flex-wrap gap-2">
              {displayAthletes.map((athlete, index) => (
                <div
                  key={athlete.athlete.id}
                  className={cn(
                    "px-2 py-1 rounded text-sm flex items-center gap-2 cursor-pointer transition-opacity",
                    hoveredAthlete && hoveredAthlete !== athlete.athlete.name && "opacity-40"
                  )}
                  onMouseEnter={() => setHoveredAthlete(athlete.athlete.name)}
                  onMouseLeave={() => setHoveredAthlete(null)}
                >
                  <span 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span>{athlete.athlete.name}</span>
                </div>
              ))}
            </div>
          </TabsContent>
          
          {/* Dive Scores View - Grouped Bar Chart */}
          <TabsContent value="scores">
            <div className="mb-3 text-sm text-muted-foreground">
              Compare individual dive scores for each round.
            </div>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scoreData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="round" 
                    tick={{ fontSize: 12, fill: 'currentColor' }}
                  />
                  <YAxis 
                    domain={[0, 'auto']}
                    tick={{ fontSize: 12, fill: 'currentColor' }}
                    label={{ 
                      value: 'Dive Score', 
                      angle: -90, 
                      position: 'insideLeft',
                      style: { textAnchor: 'middle', fill: 'currentColor' }
                    }}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || !payload.length) return null;
                      return (
                        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                          <p className="font-semibold mb-2">{label}</p>
                          {payload
                            .filter((p) => !p.dataKey?.toString().includes('_'))
                            .sort((a, b) => (b.value as number) - (a.value as number))
                            .map((entry, index: number) => {
                              const diveCode = payload[0]?.payload?.[`${entry.name}_dive`];
                              const dd = payload[0]?.payload?.[`${entry.name}_dd`];
                              return (
                                <div key={index} className="text-sm mb-1" style={{ color: entry.color }}>
                                  <div className="flex justify-between gap-4">
                                    <span className="truncate">{entry.name}</span>
                                    <span className="font-mono font-semibold">{(entry.value as number)?.toFixed(2)}</span>
                                  </div>
                                  {diveCode && (
                                    <div className="text-xs text-muted-foreground pl-2">
                                      {diveCode} (DD: {dd})
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      );
                    }}
                  />
                  <Legend />
                  {displayAthletes.map((athlete, index) => (
                    <Bar
                      key={athlete.athlete.id}
                      dataKey={athlete.athlete.name}
                      fill={COLORS[index % COLORS.length]}
                      opacity={hoveredAthlete && hoveredAthlete !== athlete.athlete.name ? 0.3 : 0.8}
                      onMouseEnter={() => setHoveredAthlete(athlete.athlete.name)}
                      onMouseLeave={() => setHoveredAthlete(null)}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          
          {/* Momentum View - Who is climbing/falling */}
          <TabsContent value="momentum">
            <div className="mb-3 text-sm text-muted-foreground">
              Net positions gained/lost from start to finish.
              <span className="inline-flex items-center ml-3">
                <span className="w-3 h-3 bg-green-500 rounded mr-1"></span>
                Climbed
              </span>
              <span className="inline-flex items-center ml-3">
                <span className="w-3 h-3 bg-red-500 rounded mr-1"></span>
                Dropped
              </span>
            </div>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={momentumData} 
                  layout="vertical"
                  margin={{ top: 20, right: 40, left: 100, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={true} vertical={false} />
                  <XAxis 
                    type="number"
                    tick={{ fontSize: 12, fill: 'currentColor' }}
                    tickFormatter={(v) => v > 0 ? `+${v}` : v.toString()}
                    label={{
                      value: 'Positions Gained/Lost',
                      position: 'bottom',
                      style: { textAnchor: 'middle', fill: 'currentColor' }
                    }}
                  />
                  <YAxis 
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11, fill: 'currentColor' }}
                    width={95}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                          <p className="font-semibold">{d.name}</p>
                          <p className="text-sm">
                            <span className={cn(
                              d.positionsGained > 0 ? 'text-green-500' : d.positionsGained < 0 ? 'text-red-500' : ''
                            )}>
                              {d.positionsGained > 0 ? '\u2191' : d.positionsGained < 0 ? '\u2193' : '\u2192'} 
                              {Math.abs(d.positionsGained)} position{Math.abs(d.positionsGained) !== 1 ? 's' : ''}
                            </span>
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Avg Score: <span className="text-foreground font-mono">{d.avgRoundScore}</span>
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="positionsGained" radius={[0, 4, 4, 0]}>
                    {momentumData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.positionsGained > 0 ? '#22c55e' : entry.positionsGained < 0 ? '#ef4444' : '#94a3b8'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            {/* Final Standings Summary */}
            <div className="mt-4">
              <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-2">Final Standings</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {finalStandings.slice(0, 4).map((item, index) => (
                  <div 
                    key={item.athlete.athlete.id}
                    className="p-3 rounded-lg border"
                    style={{ borderColor: item.color }}
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant={index === 0 ? 'default' : 'secondary'}>
                        #{index + 1}
                      </Badge>
                      <span className="font-medium text-sm truncate">{item.athlete.athlete.name}</span>
                    </div>
                    <div className="mt-1 text-lg font-bold font-mono">
                      {item.totalScore.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default RoundComparisonRadar;
