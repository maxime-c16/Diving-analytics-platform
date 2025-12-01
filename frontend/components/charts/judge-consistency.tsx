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
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { JudgeStatsResult } from '@/lib/api';

interface JudgeConsistencyProps {
  judgeStats: JudgeStatsResult;
  className?: string;
}

/**
 * Judge Consistency Chart - Reworked
 * 
 * Multi-view visualization showing:
 * 1. Bias Chart: Shows each judge's deviation from panel mean (are they harsh or lenient?)
 * 2. Consistency Chart: Shows standard deviation per judge (how consistent are they?)
 * 3. Summary: Overview of key findings and all judge stats
 * 
 * @see specs/002-ui-overhaul/data-model.md - JudgeConsistencyData
 */
export function JudgeConsistencyChart({ 
  judgeStats, 
  className 
}: JudgeConsistencyProps) {
  const [activeView, setActiveView] = useState<'bias' | 'consistency' | 'summary'>('bias');
  
  // Calculate panel-wide statistics and judge deviations
  const analysisData = useMemo(() => {
    if (!judgeStats || !judgeStats.judges || judgeStats.judges.length === 0) return null;
    
    const { judges, overallConsistency } = judgeStats;
    
    // Calculate overall panel mean (average of all judge means)
    const panelMean = judges.reduce((sum, j) => sum + j.mean, 0) / judges.length;
    
    // Calculate overall panel std (average of all stds)
    const panelStd = judges.reduce((sum, j) => sum + j.std, 0) / judges.length;
    
    // Calculate bias and consistency metrics for each judge
    const judgeAnalysis = judges.map((judge) => {
      const bias = judge.mean - panelMean; // Positive = lenient, Negative = harsh
      const biasPercent = (bias / panelMean) * 100;
      const isOutlier = Math.abs(bias) > panelStd * 1.5;
      
      return {
        name: judge.judge,
        judgeIndex: judge.judgeIndex,
        mean: Number(judge.mean.toFixed(2)),
        std: Number(judge.std.toFixed(2)),
        min: judge.min,
        max: judge.max,
        range: Number((judge.max - judge.min).toFixed(1)),
        diveCount: judge.diveCount,
        consistency: judge.consistency,
        bias: Number(bias.toFixed(2)),
        biasPercent: Number(biasPercent.toFixed(1)),
        isOutlier,
        biasLabel: bias > 0.2 ? 'Lenient' : bias < -0.2 ? 'Harsh' : 'Neutral',
      };
    });
    
    // Sort judges by bias for ranking
    const sortedByBias = [...judgeAnalysis].sort((a, b) => b.bias - a.bias);
    const harshestJudge = sortedByBias[sortedByBias.length - 1];
    const lenientJudge = sortedByBias[0];
    
    // Sort by consistency
    const sortedByConsistency = [...judgeAnalysis].sort((a, b) => a.std - b.std);
    const mostConsistent = sortedByConsistency[0];
    const leastConsistent = sortedByConsistency[sortedByConsistency.length - 1];
    
    return {
      judges: judgeAnalysis,
      panelMean: Number(panelMean.toFixed(2)),
      panelStd: Number(panelStd.toFixed(2)),
      overallConsistency,
      harshestJudge,
      lenientJudge,
      mostConsistent,
      leastConsistent,
      maxBias: Math.max(...judgeAnalysis.map(j => Math.abs(j.bias))),
    };
  }, [judgeStats]);

  if (!analysisData) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Judge Consistency Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            No judge data available
          </div>
        </CardContent>
      </Card>
    );
  }

  // Color based on bias direction
  const getBiasColor = (bias: number) => {
    if (bias > 0.3) return '#22c55e'; // Green - lenient
    if (bias > 0.1) return '#86efac';
    if (bias < -0.3) return '#ef4444'; // Red - harsh
    if (bias < -0.1) return '#fca5a5';
    return '#94a3b8'; // Neutral gray
  };
  
  // Color based on consistency (std)
  const getConsistencyColor = (std: number) => {
    if (std < 0.8) return '#22c55e'; // Very consistent
    if (std < 1.2) return '#86efac';
    if (std > 1.8) return '#ef4444'; // Inconsistent
    if (std > 1.4) return '#fca5a5';
    return '#fbbf24'; // Average
  };

  const getConsistencyBadgeVariant = (consistency: 'high' | 'medium' | 'low') => {
    switch (consistency) {
      case 'high': return 'success';
      case 'medium': return 'warning';
      case 'low': return 'destructive';
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Judge Consistency Analysis</CardTitle>
            <CardDescription>
              Panel average: {analysisData.panelMean} | Spread: ±{analysisData.panelStd}
            </CardDescription>
          </div>
          <Badge variant={getConsistencyBadgeVariant(analysisData.overallConsistency) as 'success' | 'warning' | 'destructive'}>
            Overall: {analysisData.overallConsistency}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeView} onValueChange={(v) => setActiveView(v as typeof activeView)}>
          <TabsList className="mb-4">
            <TabsTrigger value="bias">Bias Analysis</TabsTrigger>
            <TabsTrigger value="consistency">Consistency</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
          </TabsList>
          
          {/* Bias Analysis View - Horizontal Bar Chart */}
          <TabsContent value="bias">
            <div className="mb-3 text-sm text-muted-foreground">
              How each judge deviates from the panel average:
              <span className="inline-flex items-center ml-3">
                <span className="w-3 h-3 bg-green-500 rounded mr-1"></span>
                Lenient (scores higher)
              </span>
              <span className="inline-flex items-center ml-3">
                <span className="w-3 h-3 bg-red-500 rounded mr-1"></span>
                Harsh (scores lower)
              </span>
            </div>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={analysisData.judges} 
                  layout="vertical"
                  margin={{ top: 20, right: 40, left: 60, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={true} vertical={false} />
                  <XAxis 
                    type="number"
                    domain={[-(analysisData.maxBias + 0.3), analysisData.maxBias + 0.3]}
                    tick={{ fontSize: 12, fill: 'currentColor' }}
                    tickFormatter={(v) => v > 0 ? `+${v}` : v.toString()}
                  />
                  <YAxis 
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 12, fill: 'currentColor' }}
                    width={55}
                  />
                  <ReferenceLine x={0} stroke="#666" strokeWidth={2} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                          <p className="font-semibold">{d.name}</p>
                          <p className="text-sm">
                            <span className={cn(
                              d.bias > 0 ? 'text-green-500' : d.bias < 0 ? 'text-red-500' : 'text-muted-foreground'
                            )}>
                              {d.bias > 0 ? '+' : ''}{d.bias} from panel avg ({d.biasLabel})
                            </span>
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Mean Score: <span className="text-foreground font-mono">{d.mean}</span>
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Range: <span className="text-foreground font-mono">{d.min.toFixed(1)} - {d.max.toFixed(1)}</span>
                          </p>
                          {d.isOutlier && (
                            <Badge variant="destructive" className="mt-2">Outlier</Badge>
                          )}
                        </div>
                      );
                    }}
                  />
                  <Bar 
                    dataKey="bias" 
                    name="Deviation from Panel"
                    radius={[0, 4, 4, 0]}
                  >
                    {analysisData.judges.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getBiasColor(entry.bias)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          
          {/* Consistency View - Vertical Bar Chart */}
          <TabsContent value="consistency">
            <div className="mb-3 text-sm text-muted-foreground">
              Standard deviation of each judge&apos;s scores. Lower = more consistent:
              <span className="inline-flex items-center ml-3">
                <span className="w-3 h-3 bg-green-500 rounded mr-1"></span>
                Consistent (&lt;1.0)
              </span>
              <span className="inline-flex items-center ml-3">
                <span className="w-3 h-3 bg-red-500 rounded mr-1"></span>
                Variable (&gt;1.5)
              </span>
            </div>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={analysisData.judges} 
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 12, fill: 'currentColor' }}
                  />
                  <YAxis 
                    domain={[0, 'auto']} 
                    tick={{ fontSize: 12, fill: 'currentColor' }}
                    label={{ 
                      value: 'Std Deviation', 
                      angle: -90, 
                      position: 'insideLeft',
                      style: { textAnchor: 'middle', fill: 'currentColor' }
                    }}
                  />
                  <ReferenceLine y={1.0} stroke="#22c55e" strokeDasharray="5 5" label={{ value: 'Consistent', fill: '#22c55e', fontSize: 11 }} />
                  <ReferenceLine y={1.5} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'Variable', fill: '#ef4444', fontSize: 11 }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                          <p className="font-semibold">{d.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Std Deviation: <span className="text-foreground font-mono">±{d.std}</span>
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Score Range: <span className="text-foreground font-mono">{d.min.toFixed(1)} - {d.max.toFixed(1)} ({d.range} spread)</span>
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Dives Scored: <span className="text-foreground">{d.diveCount}</span>
                          </p>
                          <Badge 
                            variant={d.consistency === 'high' ? 'success' : d.consistency === 'medium' ? 'warning' : 'destructive'}
                            className="mt-2"
                          >
                            {d.consistency} consistency
                          </Badge>
                        </div>
                      );
                    }}
                  />
                  <Bar 
                    dataKey="std" 
                    name="Score Variability"
                    radius={[4, 4, 0, 0]}
                  >
                    {analysisData.judges.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getConsistencyColor(entry.std)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          
          {/* Summary View */}
          <TabsContent value="summary">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Key Findings */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Key Findings</h4>
                
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">Harshest</Badge>
                    <span className="font-medium">{analysisData.harshestJudge.name}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {analysisData.harshestJudge.bias.toFixed(2)} below panel average (mean: {analysisData.harshestJudge.mean})
                  </p>
                </div>
                
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-500 hover:bg-green-600">Lenient</Badge>
                    <span className="font-medium">{analysisData.lenientJudge.name}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    +{analysisData.lenientJudge.bias.toFixed(2)} above panel average (mean: {analysisData.lenientJudge.mean})
                  </p>
                </div>
                
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Most Consistent</Badge>
                    <span className="font-medium">{analysisData.mostConsistent.name}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Std dev: ±{analysisData.mostConsistent.std} | Range: {analysisData.mostConsistent.range}
                  </p>
                </div>
                
                {analysisData.leastConsistent.name !== analysisData.mostConsistent.name && (
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Most Variable</Badge>
                      <span className="font-medium">{analysisData.leastConsistent.name}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Std dev: ±{analysisData.leastConsistent.std} | Range: {analysisData.leastConsistent.range}
                    </p>
                  </div>
                )}
              </div>
              
              {/* All Judge Cards */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">All Judges</h4>
                <div className="grid grid-cols-1 gap-2 max-h-[320px] overflow-y-auto pr-2">
                  {analysisData.judges.map((judge) => (
                    <div 
                      key={judge.name} 
                      className={cn(
                        "p-3 rounded-lg border flex items-center justify-between",
                        judge.isOutlier && "border-red-500/50 bg-red-500/10",
                        judge.consistency === 'high' && !judge.isOutlier && "border-green-500/30 bg-green-500/5",
                        judge.consistency === 'low' && !judge.isOutlier && "border-amber-500/30 bg-amber-500/5"
                      )}
                    >
                      <div>
                        <span className="font-medium">{judge.name}</span>
                        {judge.isOutlier && <Badge variant="destructive" className="ml-2 text-xs">Outlier</Badge>}
                        <div className="text-xs text-muted-foreground">{judge.diveCount} dives</div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-3 text-sm">
                          <span className={cn(
                            "font-mono font-semibold",
                            judge.bias > 0.1 ? "text-green-500" : judge.bias < -0.1 ? "text-red-500" : "text-muted-foreground"
                          )}>
                            {judge.bias > 0 ? '+' : ''}{judge.bias}
                          </span>
                          <span className="text-muted-foreground font-mono">±{judge.std}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Mean: {judge.mean}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default JudgeConsistencyChart;
