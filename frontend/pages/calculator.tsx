"use client"

import React, { useState, useEffect } from "react"
import Head from "next/head"
import { motion } from "framer-motion"
import { Calculator, Award, TrendingUp, BarChart3 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui"
import { Button, Input, Label, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui"
import { FloatingCard } from "@/components/aceternity"
import { SpotlightCard } from "@/components/aceternity/spotlight"
import { api, type ScoreResult, type StatisticsResult, type DivingHeight, SPRINGBOARD_HEIGHTS, PLATFORM_HEIGHTS } from "@/lib/api"
import { cn, formatScore, getScoreClass } from "@/lib/utils"

export default function CalculatorPage() {
  const [isApiHealthy, setIsApiHealthy] = useState<boolean | null>(null)
  const [activeTab, setActiveTab] = useState("calculator")
  
  // Score Calculator State
  const [diveCode, setDiveCode] = useState("5253B")
  const [diveHeight, setDiveHeight] = useState<DivingHeight>("3m")
  const [judgeScores, setJudgeScores] = useState<string[]>(["7.0", "7.5", "7.0", "7.5", "7.0"])
  const [judgeCount, setJudgeCount] = useState<5 | 7>(5)
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  
  // Statistics State
  const [stats, setStats] = useState<StatisticsResult | null>(null)
  const [isLoadingStats, setIsLoadingStats] = useState(false)

  useEffect(() => {
    checkApiHealth()
  }, [])

  // Update judge scores array when judge count changes
  useEffect(() => {
    if (judgeCount === 7 && judgeScores.length === 5) {
      setJudgeScores([...judgeScores, "7.0", "7.0"])
    } else if (judgeCount === 5 && judgeScores.length === 7) {
      setJudgeScores(judgeScores.slice(0, 5))
    }
  }, [judgeCount])

  const checkApiHealth = async () => {
    try {
      const health = await api.getHealth()
      setIsApiHealthy(health.status === "ok" || health.status === "healthy")
    } catch {
      setIsApiHealthy(false)
    }
  }

  const calculateScore = async () => {
    setIsCalculating(true)
    try {
      const scores = judgeScores.map(s => parseFloat(s)).filter(s => !isNaN(s))
      const result = await api.calculateScore({
        diveCode,
        height: diveHeight,
        judgeScores: scores,
      })
      setScoreResult(result)
    } catch (error) {
      console.error("Failed to calculate score:", error)
    } finally {
      setIsCalculating(false)
    }
  }

  const loadStatistics = async () => {
    setIsLoadingStats(true)
    try {
      const result = await api.getStatistics({
        scores: [75.5, 82.3, 68.9, 91.2, 77.8, 85.4, 72.1, 88.6, 79.3, 84.7],
      })
      setStats(result)
    } catch (error) {
      console.error("Failed to load statistics:", error)
    } finally {
      setIsLoadingStats(false)
    }
  }

  const updateJudgeScore = (index: number, value: string) => {
    const newScores = [...judgeScores]
    newScores[index] = value
    setJudgeScores(newScores)
  }

  return (
    <>
      <Head>
        <title>Score Calculator - Diving Analytics Platform</title>
        <meta name="description" content="Calculate diving scores using official FINA algorithms" />
      </Head>

      <div className="space-y-8">
        {/* Header */}
        <SpotlightCard className="rounded-2xl border bg-card p-6 md:p-8">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Calculator className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Score Calculator</h1>
              <p className="text-muted-foreground">
                Calculate dive scores using official FINA algorithms
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className={cn(
                "h-2.5 w-2.5 rounded-full",
                isApiHealthy === null ? "bg-gray-400" :
                isApiHealthy ? "bg-green-500" : "bg-red-500"
              )} />
              <span className="text-sm text-muted-foreground">
                {isApiHealthy === null ? "Checking..." :
                 isApiHealthy ? "Connected" : "Offline"}
              </span>
            </div>
          </div>
        </SpotlightCard>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-grid">
            <TabsTrigger value="calculator">Calculator</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Calculator Tab */}
          <TabsContent value="calculator" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <FloatingCard>
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calculator className="h-5 w-5" />
                      Calculate Dive Score
                    </CardTitle>
                    <CardDescription>
                      Enter a dive code and judge scores to calculate the final score
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="diveCode">Dive Code</Label>
                        <Input
                          id="diveCode"
                          placeholder="e.g., 5253B"
                          value={diveCode}
                          onChange={(e) => setDiveCode(e.target.value.toUpperCase())}
                          className="font-mono text-lg"
                        />
                        <p className="text-xs text-muted-foreground">
                          Format: number + letter (e.g., 107B, 5253B)
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="height">Height</Label>
                        <select
                          id="height"
                          value={diveHeight}
                          onChange={(e) => setDiveHeight(e.target.value as DivingHeight)}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <optgroup label="Springboard">
                            {SPRINGBOARD_HEIGHTS.map(h => (
                              <option key={h} value={h}>{h}</option>
                            ))}
                          </optgroup>
                          <optgroup label="Platform">
                            {PLATFORM_HEIGHTS.map(h => (
                              <option key={h} value={h}>{h}</option>
                            ))}
                          </optgroup>
                        </select>
                      </div>
                    </div>

                    {/* Judge Count Toggle */}
                    <div className="space-y-2">
                      <Label>Judge Panel</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={judgeCount === 5 ? "default" : "outline"}
                          size="sm"
                          onClick={() => setJudgeCount(5)}
                        >
                          5 Judges
                        </Button>
                        <Button
                          type="button"
                          variant={judgeCount === 7 ? "default" : "outline"}
                          size="sm"
                          onClick={() => setJudgeCount(7)}
                        >
                          7 Judges
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Judge Scores (0.0 - 10.0)</Label>
                      <div className={cn(
                        "grid gap-2",
                        judgeCount === 5 ? "grid-cols-5" : "grid-cols-7"
                      )}>
                        {judgeScores.slice(0, judgeCount).map((score, index) => (
                          <div key={index} className="space-y-1">
                            <Label className="text-xs text-muted-foreground text-center block">
                              J{index + 1}
                            </Label>
                            <Input
                              type="number"
                              min="0"
                              max="10"
                              step="0.5"
                              value={score}
                              onChange={(e) => updateJudgeScore(index, e.target.value)}
                              className="text-center text-sm px-1"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <Button
                      className="w-full"
                      onClick={calculateScore}
                      disabled={isCalculating || !isApiHealthy}
                    >
                      {isCalculating ? "Calculating..." : "Calculate Score"}
                    </Button>
                  </CardContent>
                </Card>
              </FloatingCard>

              <FloatingCard delay={0.1}>
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5" />
                      Score Result
                    </CardTitle>
                    <CardDescription>
                      Calculated score breakdown with FINA difficulty
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {scoreResult ? (
                      <div className="space-y-6">
                        <div className="text-center">
                          <motion.div
                            key={scoreResult.finalScore}
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 200 }}
                            className={cn(
                              "text-6xl font-bold",
                              getScoreClass(scoreResult.finalScore / scoreResult.difficulty)
                            )}
                          >
                            {formatScore(scoreResult.finalScore)}
                          </motion.div>
                          <p className="text-muted-foreground mt-2">Total Score</p>
                          <p className="text-sm font-mono text-muted-foreground">
                            {scoreResult.diveCode} @ {scoreResult.height}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="rounded-lg border p-4 text-center">
                            <div className="text-2xl font-semibold">{scoreResult.difficulty}</div>
                            <div className="text-sm text-muted-foreground">DD ({scoreResult.height})</div>
                          </div>
                          <div className="rounded-lg border p-4 text-center">
                            <div className="text-2xl font-semibold">
                              {formatScore(scoreResult.rawScore)}
                            </div>
                            <div className="text-sm text-muted-foreground">Execution</div>
                          </div>
                        </div>

                        {/* Dropped Scores Display */}
                        {scoreResult.droppedScores && scoreResult.droppedScores.length > 0 && (
                          <div className="space-y-2">
                            <Label className="text-sm">Judge Scores</Label>
                            <div className="flex flex-wrap gap-2 justify-center">
                              {scoreResult.judgeScores.map((score, i) => {
                                const isDropped = scoreResult.droppedScores.includes(score)
                                return (
                                  <span
                                    key={i}
                                    className={cn(
                                      "px-2 py-1 rounded text-sm font-mono",
                                      isDropped
                                        ? "bg-muted text-muted-foreground line-through"
                                        : "bg-primary/10 text-primary"
                                    )}
                                  >
                                    {score.toFixed(1)}
                                  </span>
                                )
                              })}
                            </div>
                            <p className="text-xs text-center text-muted-foreground">
                              Strikethrough scores are dropped (highest and lowest)
                            </p>
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label className="text-sm">Score Formula</Label>
                          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                            <span>{formatScore(scoreResult.rawScore)}</span>
                            <span>×</span>
                            <span>{scoreResult.difficulty}</span>
                            <span>=</span>
                            <span className="font-medium text-foreground">
                              {formatScore(scoreResult.finalScore)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                        <Calculator className="h-12 w-12 mb-4 opacity-50" />
                        <p>Enter dive details to see results</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </FloatingCard>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
              {stats ? (
                <>
                  <FloatingCard>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          Mean Score
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-4xl font-bold text-primary">
                          {formatScore(stats.mean)}
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          Average across {stats.count} scores
                        </p>
                      </CardContent>
                    </Card>
                  </FloatingCard>

                  <FloatingCard delay={0.1}>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Standard Deviation</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-4xl font-bold text-blue-500">
                          {formatScore(stats.std)}
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          Score variability measure
                        </p>
                      </CardContent>
                    </Card>
                  </FloatingCard>

                  <FloatingCard delay={0.2}>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Score Range</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-4xl font-bold text-amber-500">
                          {formatScore(stats.min)} - {formatScore(stats.max)}
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          Min to max range
                        </p>
                      </CardContent>
                    </Card>
                  </FloatingCard>

                  <FloatingCard delay={0.3} className="md:col-span-3">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <BarChart3 className="h-4 w-4" />
                          Quartiles
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-4 gap-4">
                          <div className="text-center">
                            <div className="text-2xl font-semibold">{formatScore(stats.min)}</div>
                            <div className="text-sm text-muted-foreground">Min</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-semibold">{formatScore(stats.q1)}</div>
                            <div className="text-sm text-muted-foreground">Q1 (25th)</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-semibold">{formatScore(stats.q3)}</div>
                            <div className="text-sm text-muted-foreground">Q3 (75th)</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-semibold">{formatScore(stats.max)}</div>
                            <div className="text-sm text-muted-foreground">Max</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </FloatingCard>
                </>
              ) : (
                <FloatingCard className="md:col-span-3">
                  <Card className="flex flex-col items-center justify-center p-12">
                    <BarChart3 className="h-12 w-12 mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground mb-4">No analytics data loaded</p>
                    <Button onClick={loadStatistics} disabled={isLoadingStats || !isApiHealthy}>
                      {isLoadingStats ? "Loading..." : "Load Sample Analytics"}
                    </Button>
                  </Card>
                </FloatingCard>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}
