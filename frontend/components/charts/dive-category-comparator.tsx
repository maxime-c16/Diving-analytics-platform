'use client';

import React, { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ExtendedAthleteResult, ExtendedDiveResult } from '@/lib/types';

interface DiveCategoryComparatorProps {
  athletes: ExtendedAthleteResult[];
  selectedAthletes?: number[];
  className?: string;
}

// Dive category definitions
const DIVE_CATEGORIES = {
  '1': { name: 'Forward', code: '1XX', color: '#3b82f6', description: 'Forward rotation' },
  '2': { name: 'Back', code: '2XX', color: '#ef4444', description: 'Backward rotation' },
  '3': { name: 'Reverse', code: '3XX', color: '#22c55e', description: 'Forward approach, backward rotation' },
  '4': { name: 'Inward', code: '4XX', color: '#f59e0b', description: 'Backward approach, forward rotation' },
  '5': { name: 'Twisting', code: '5XXX', color: '#8b5cf6', description: 'Any dive with twists' },
  '6': { name: 'Armstand', code: '6XX', color: '#ec4899', description: 'Platform only - handstand start' },
} as const;

type CategoryKey = keyof typeof DIVE_CATEGORIES;

// Color palette for athletes
const ATHLETE_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#22c55e', // green
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
];

/**
 * Dive Category Comparator Chart
 * 
 * Analyzes and compares performance across dive categories:
 * - 1XX: Forward dives
 * - 2XX: Back dives  
 * - 3XX: Reverse dives
 * - 4XX: Inward dives
 * - 5XXX: Twisting dives
 * - 6XX: Armstand dives (platform only)
 * 
 * Shows which categories athletes excel in and where they struggle.
 */
export function DiveCategoryComparator({
  athletes,
  selectedAthletes,
  className,
}: DiveCategoryComparatorProps) {
  const [activeView, setActiveView] = useState<'overview' | 'comparison' | 'radar'>('overview');
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey | null>(null);

  // Filter athletes based on selection
  const displayAthletes = useMemo(() => {
    if (selectedAthletes && selectedAthletes.length > 0) {
      return athletes.filter((a) => selectedAthletes.includes(a.athlete.id));
    }
    return athletes;
  }, [athletes, selectedAthletes]);

  // Get category from dive code (first digit)
  const getDiveCategory = (diveCode: string): CategoryKey | null => {
    const firstDigit = diveCode.charAt(0);
    if (firstDigit in DIVE_CATEGORIES) {
      return firstDigit as CategoryKey;
    }
    return null;
  };

  // Aggregate all dives by category
  const categoryStats = useMemo(() => {
    const stats: Record<CategoryKey, {
      dives: ExtendedDiveResult[];
      totalScore: number;
      avgScore: number;
      avgDD: number;
      count: number;
      bestDive: ExtendedDiveResult | null;
      worstDive: ExtendedDiveResult | null;
    }> = {
      '1': { dives: [], totalScore: 0, avgScore: 0, avgDD: 0, count: 0, bestDive: null, worstDive: null },
      '2': { dives: [], totalScore: 0, avgScore: 0, avgDD: 0, count: 0, bestDive: null, worstDive: null },
      '3': { dives: [], totalScore: 0, avgScore: 0, avgDD: 0, count: 0, bestDive: null, worstDive: null },
      '4': { dives: [], totalScore: 0, avgScore: 0, avgDD: 0, count: 0, bestDive: null, worstDive: null },
      '5': { dives: [], totalScore: 0, avgScore: 0, avgDD: 0, count: 0, bestDive: null, worstDive: null },
      '6': { dives: [], totalScore: 0, avgScore: 0, avgDD: 0, count: 0, bestDive: null, worstDive: null },
    };

    displayAthletes.forEach((athlete) => {
      athlete.dives.forEach((dive) => {
        const category = getDiveCategory(dive.diveCode);
        if (category) {
          stats[category].dives.push(dive);
          stats[category].totalScore += dive.finalScore;
          stats[category].count++;
          
          const currentBest = stats[category].bestDive;
          if (!currentBest || dive.finalScore > currentBest.finalScore) {
            stats[category].bestDive = dive;
          }
          const currentWorst = stats[category].worstDive;
          if (!currentWorst || dive.finalScore < currentWorst.finalScore) {
            stats[category].worstDive = dive;
          }
        }
      });
    });

    // Calculate averages
    Object.keys(stats).forEach((key) => {
      const cat = key as CategoryKey;
      if (stats[cat].count > 0) {
        stats[cat].avgScore = stats[cat].totalScore / stats[cat].count;
        stats[cat].avgDD = stats[cat].dives.reduce((sum, d) => sum + d.difficulty, 0) / stats[cat].count;
      }
    });

    return stats;
  }, [displayAthletes]);

  // Per-athlete category breakdown
  const athleteCategoryData = useMemo(() => {
    return displayAthletes.map((athlete, idx) => {
      const categories: Record<CategoryKey, { avgScore: number; count: number; totalScore: number }> = {
        '1': { avgScore: 0, count: 0, totalScore: 0 },
        '2': { avgScore: 0, count: 0, totalScore: 0 },
        '3': { avgScore: 0, count: 0, totalScore: 0 },
        '4': { avgScore: 0, count: 0, totalScore: 0 },
        '5': { avgScore: 0, count: 0, totalScore: 0 },
        '6': { avgScore: 0, count: 0, totalScore: 0 },
      };

      athlete.dives.forEach((dive) => {
        const category = getDiveCategory(dive.diveCode);
        if (category) {
          categories[category].totalScore += dive.finalScore;
          categories[category].count++;
        }
      });

      // Calculate averages
      Object.keys(categories).forEach((key) => {
        const cat = key as CategoryKey;
        if (categories[cat].count > 0) {
          categories[cat].avgScore = categories[cat].totalScore / categories[cat].count;
        }
      });

      return {
        athlete,
        categories,
        color: ATHLETE_COLORS[idx % ATHLETE_COLORS.length],
      };
    });
  }, [displayAthletes]);

  // Build overview chart data
  const overviewData = useMemo(() => {
    return Object.entries(DIVE_CATEGORIES).map(([key, info]) => {
      const cat = key as CategoryKey;
      return {
        category: info.name,
        code: info.code,
        avgScore: Number(categoryStats[cat].avgScore.toFixed(2)),
        count: categoryStats[cat].count,
        avgDD: Number(categoryStats[cat].avgDD.toFixed(2)),
        color: info.color,
        key: cat,
      };
    }).filter(d => d.count > 0);
  }, [categoryStats]);

  // Build comparison radar data (normalized scores for fair comparison)
  const radarData = useMemo(() => {
    // Find max avg score for normalization
    const maxScore = Math.max(...Object.values(categoryStats).map(s => s.avgScore));
    
    return Object.entries(DIVE_CATEGORIES).map(([key, info]) => {
      const cat = key as CategoryKey;
      const dataPoint: Record<string, number | string> = {
        category: info.name,
        fullMark: 100,
      };
      
      athleteCategoryData.forEach((athleteData) => {
        const catData = athleteData.categories[cat];
        // Normalize to percentage of max
        const normalized = catData.count > 0 && maxScore > 0 
          ? (catData.avgScore / maxScore) * 100 
          : 0;
        dataPoint[athleteData.athlete.athlete.name] = Number(normalized.toFixed(1));
      });
      
      return dataPoint;
    });
  }, [categoryStats, athleteCategoryData]);

  // Find strongest/weakest categories per athlete
  const athleteStrengths = useMemo(() => {
    return athleteCategoryData.map((data) => {
      const categoriesWithScores = Object.entries(data.categories)
        .filter(([_, v]) => v.count > 0)
        .map(([key, v]) => ({ category: key as CategoryKey, ...v }))
        .sort((a, b) => b.avgScore - a.avgScore);
      
      return {
        athlete: data.athlete,
        strongest: categoriesWithScores[0] || null,
        weakest: categoriesWithScores[categoriesWithScores.length - 1] || null,
        color: data.color,
      };
    });
  }, [athleteCategoryData]);

  if (displayAthletes.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Dive Category Analysis</CardTitle>
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
        <CardTitle>Dive Category Analysis</CardTitle>
        <CardDescription>
          Compare performance across dive types: Forward, Back, Reverse, Inward, Twisting, and Armstand
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeView} onValueChange={(v) => setActiveView(v as typeof activeView)}>
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Category Overview</TabsTrigger>
            <TabsTrigger value="comparison">Athlete Comparison</TabsTrigger>
            <TabsTrigger value="radar">Radar View</TabsTrigger>
          </TabsList>
          
          {/* Overview - Bar chart of all categories */}
          <TabsContent value="overview">
            <div className="mb-3 text-sm text-muted-foreground">
              Average scores across all athletes by dive category. Click a bar for details.
            </div>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={overviewData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="category" 
                    tick={{ fontSize: 12, fill: 'currentColor' }}
                  />
                  <YAxis 
                    domain={[0, 'auto']}
                    tick={{ fontSize: 12, fill: 'currentColor' }}
                    label={{ 
                      value: 'Avg Score', 
                      angle: -90, 
                      position: 'insideLeft',
                      style: { textAnchor: 'middle', fill: 'currentColor' }
                    }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const d = payload[0].payload;
                      const stats = categoryStats[d.key as CategoryKey];
                      return (
                        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <span 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: d.color }}
                            />
                            <span className="font-semibold">{d.category} ({d.code})</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Avg Score: <span className="text-foreground font-mono">{d.avgScore}</span>
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Avg DD: <span className="text-foreground font-mono">{d.avgDD}</span>
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Total Dives: <span className="text-foreground">{d.count}</span>
                          </p>
                          {stats.bestDive && (
                            <p className="text-sm text-green-500 mt-1">
                              Best: {stats.bestDive.diveCode} ({stats.bestDive.finalScore.toFixed(2)})
                            </p>
                          )}
                        </div>
                      );
                    }}
                  />
                  <Bar 
                    dataKey="avgScore" 
                    radius={[4, 4, 0, 0]}
                    onClick={(data) => setSelectedCategory(data.key)}
                  >
                    {overviewData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color}
                        opacity={selectedCategory && selectedCategory !== entry.key ? 0.4 : 0.85}
                        cursor="pointer"
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            {/* Category Legend */}
            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2">
              {Object.entries(DIVE_CATEGORIES).map(([key, info]) => {
                const cat = key as CategoryKey;
                const stats = categoryStats[cat];
                if (stats.count === 0) return null;
                return (
                  <div 
                    key={key}
                    className={cn(
                      "p-2 rounded-lg border cursor-pointer transition-opacity",
                      selectedCategory && selectedCategory !== cat && "opacity-40"
                    )}
                    style={{ borderColor: info.color }}
                    onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                  >
                    <div className="flex items-center gap-2">
                      <span 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: info.color }}
                      />
                      <span className="font-medium text-sm">{info.name}</span>
                      <Badge variant="secondary" className="ml-auto text-xs">{stats.count}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {info.description}
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>
          
          {/* Athlete Comparison - Grouped bars */}
          <TabsContent value="comparison">
            <div className="mb-3 text-sm text-muted-foreground">
              Compare each athlete&apos;s average score by category.
            </div>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={Object.entries(DIVE_CATEGORIES)
                    .filter(([key]) => categoryStats[key as CategoryKey].count > 0)
                    .map(([key, info]) => {
                      const dataPoint: Record<string, number | string> = {
                        category: info.name,
                      };
                      athleteCategoryData.forEach((ad) => {
                        dataPoint[ad.athlete.athlete.name] = Number(ad.categories[key as CategoryKey].avgScore.toFixed(2));
                      });
                      return dataPoint;
                    })}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="category" 
                    tick={{ fontSize: 11, fill: 'currentColor' }}
                  />
                  <YAxis 
                    domain={[0, 'auto']}
                    tick={{ fontSize: 12, fill: 'currentColor' }}
                    label={{ 
                      value: 'Avg Score', 
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
                            .sort((a, b) => (b.value as number) - (a.value as number))
                            .map((entry, index) => (
                              <div key={index} className="flex justify-between text-sm gap-4" style={{ color: entry.color }}>
                                <span className="truncate">{entry.name}</span>
                                <span className="font-mono font-semibold">
                                  {(entry.value as number) > 0 ? (entry.value as number).toFixed(2) : '-'}
                                </span>
                              </div>
                            ))}
                        </div>
                      );
                    }}
                  />
                  <Legend />
                  {athleteCategoryData.map((ad, index) => (
                    <Bar
                      key={ad.athlete.athlete.id}
                      dataKey={ad.athlete.athlete.name}
                      fill={ad.color}
                      opacity={0.85}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            {/* Strength/Weakness Summary */}
            <div className="mt-4">
              <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-2">
                Strengths & Weaknesses
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {athleteStrengths.map((data) => (
                  <div 
                    key={data.athlete.athlete.id}
                    className="p-3 rounded-lg border"
                    style={{ borderColor: data.color }}
                  >
                    <div className="font-medium text-sm mb-2">{data.athlete.athlete.name}</div>
                    <div className="flex justify-between text-xs">
                      {data.strongest && (
                        <div className="text-green-500">
                          <span className="text-muted-foreground">Best: </span>
                          {DIVE_CATEGORIES[data.strongest.category].name}
                          <span className="font-mono ml-1">({data.strongest.avgScore.toFixed(1)})</span>
                        </div>
                      )}
                      {data.weakest && data.strongest?.category !== data.weakest.category && (
                        <div className="text-red-500">
                          <span className="text-muted-foreground">Weakest: </span>
                          {DIVE_CATEGORIES[data.weakest.category].name}
                          <span className="font-mono ml-1">({data.weakest.avgScore.toFixed(1)})</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
          
          {/* Radar View - Multi-athlete radar */}
          <TabsContent value="radar">
            <div className="mb-3 text-sm text-muted-foreground">
              Normalized radar comparison (100 = highest category average in competition).
            </div>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                  <PolarGrid className="stroke-muted" />
                  <PolarAngleAxis 
                    dataKey="category" 
                    tick={{ fontSize: 11, fill: 'currentColor' }}
                  />
                  <PolarRadiusAxis 
                    angle={30} 
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: 'currentColor' }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const category = payload[0]?.payload?.category;
                      return (
                        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                          <p className="font-semibold mb-2">{category}</p>
                          {payload.map((entry, index) => (
                            <div key={index} className="flex justify-between text-sm gap-4" style={{ color: entry.color }}>
                              <span className="truncate">{entry.name}</span>
                              <span className="font-mono">{(entry.value as number)?.toFixed(0)}%</span>
                            </div>
                          ))}
                        </div>
                      );
                    }}
                  />
                  <Legend />
                  {athleteCategoryData.map((ad) => (
                    <Radar
                      key={ad.athlete.athlete.id}
                      name={ad.athlete.athlete.name}
                      dataKey={ad.athlete.athlete.name}
                      stroke={ad.color}
                      fill={ad.color}
                      fillOpacity={0.15}
                      strokeWidth={2}
                    />
                  ))}
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default DiveCategoryComparator;
