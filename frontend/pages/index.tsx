"use client"

import React, { useState, useEffect } from "react"
import Head from "next/head"
import { motion } from "framer-motion"
import { Activity, Calculator, BarChart3, TrendingUp, Award, Users } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui"
import { Button, Input, Label, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui"
import { BentoGrid, BentoGridItem, GradientText, FloatingCard, ShimmerButton } from "@/components/aceternity"
import { SpotlightCard } from "@/components/aceternity/spotlight"
import { api, type ScoreResult, type StatisticsResult, type DivingHeight, DIVING_HEIGHTS, SPRINGBOARD_HEIGHTS, PLATFORM_HEIGHTS } from "@/lib/api"
import { cn, formatScore, getScoreClass } from "@/lib/utils"

export default function Home() {
  const [isApiHealthy, setIsApiHealthy] = useState<boolean | null>(null)
  const [activeTab, setActiveTab] = useState("calculator")
  
  // Score Calculator State
  const [diveCode, setDiveCode] = useState("5253B")
  const [diveHeight, setDiveHeight] = useState<DivingHeight>("3m")
  const [judgeScores, setJudgeScores] = useState<string[]>(["7.0", "7.5", "7.0", "7.5", "7.0"])
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  
  // Statistics State
  const [stats, setStats] = useState<StatisticsResult | null>(null)
  const [isLoadingStats, setIsLoadingStats] = useState(false)

  useEffect(() => {
    checkApiHealth()
  }, [])

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
      // Load sample statistics
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

  const features = [
    {
      title: "Score Calculator",
      description: "Calculate dive scores using official FINA algorithms with support for 5 or 7 judge panels.",
      icon: <Calculator className="h-5 w-5 text-primary" />,
      header: (
        <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-primary/20 to-blue-500/20 items-center justify-center">
          <Calculator className="h-10 w-10 text-primary" />
        </div>
      ),
    },
    {
      title: "Performance Analytics",
      description: "Advanced statistical analysis including mean, variance, and performance predictions.",
      icon: <BarChart3 className="h-5 w-5 text-blue-500" />,
      header: (
        <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 items-center justify-center">
          <BarChart3 className="h-10 w-10 text-blue-500" />
        </div>
      ),
    },
    {
      title: "Judge Consistency",
      description: "Analyze judge scoring patterns and identify potential bias or inconsistencies.",
      icon: <Users className="h-5 w-5 text-amber-500" />,
      header: (
        <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 items-center justify-center">
          <Users className="h-10 w-10 text-amber-500" />
        </div>
      ),
    },
    {
      title: "Score Predictions",
      description: "Machine learning-powered score predictions based on historical performance data.",
      icon: <TrendingUp className="h-5 w-5 text-green-500" />,
      header: (
        <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 items-center justify-center">
          <TrendingUp className="h-10 w-10 text-green-500" />
        </div>
      ),
    },
    {
      title: "Competition Insights",
      description: "Comprehensive competition analysis with rankings and performance comparisons.",
      icon: <Award className="h-5 w-5 text-purple-500" />,
      header: (
        <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 items-center justify-center">
          <Award className="h-10 w-10 text-purple-500" />
        </div>
      ),
    },
    {
      title: "Real-time Data",
      description: "Live data ingestion from competition feeds with OCR support for scoresheets.",
      icon: <Activity className="h-5 w-5 text-red-500" />,
      header: (
        <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-red-500/20 to-rose-500/20 items-center justify-center">
          <Activity className="h-10 w-10 text-red-500" />
        </div>
      ),
    },
  ]

  return (
    <>
      <Head>
        <title>Diving Analytics Platform</title>
        <meta name="description" content="Professional diving score calculation and analytics platform" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="space-y-12">
        {/* Hero Section */}
        <SpotlightCard className="rounded-2xl border bg-card p-8 md:p-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative z-10"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className={cn(
                "h-3 w-3 rounded-full",
                isApiHealthy === null ? "bg-gray-400" :
                isApiHealthy ? "bg-green-500" : "bg-red-500"
              )} />
              <span className="text-sm text-muted-foreground">
                {isApiHealthy === null ? "Checking API..." :
                 isApiHealthy ? "API Connected" : "API Offline"}
              </span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
              <GradientText>Diving Analytics</GradientText>
              <br />
              <span className="text-foreground">Platform</span>
            </h1>
            
            <p className="text-lg text-muted-foreground max-w-2xl mb-8">
              Professional-grade diving score calculation and analytics using official FINA algorithms.
              Built for coaches, athletes, and competition organizers.
            </p>

            <div className="flex flex-wrap gap-4">
              <ShimmerButton onClick={() => setActiveTab("calculator")}>
                Try Score Calculator
              </ShimmerButton>
              <Button variant="outline" size="lg" onClick={loadStatistics}>
                View Sample Analytics
              </Button>
            </div>
          </motion.div>
        </SpotlightCard>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="calculator">Score Calculator</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
          </TabsList>

          {/* Score Calculator Tab */}
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
                          Format: number + letter (e.g., 107B, 5253B, 6243D)
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="height">Height / Apparatus</Label>
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
                        <p className="text-xs text-muted-foreground">
                          DD varies by height per FINA rules
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Judge Scores (0.0 - 10.0)</Label>
                      <div className="grid grid-cols-5 gap-2">
                        {judgeScores.map((score, index) => (
                          <div key={index} className="space-y-1">
                            <Label className="text-xs text-muted-foreground">J{index + 1}</Label>
                            <Input
                              type="number"
                              min="0"
                              max="10"
                              step="0.5"
                              value={score}
                              onChange={(e) => updateJudgeScore(index, e.target.value)}
                              className="text-center"
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
                            <div className="text-sm text-muted-foreground">Execution Score</div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm">Score Breakdown</Label>
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
                        <CardTitle className="text-lg">Mean Score</CardTitle>
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
                        <CardTitle className="text-lg">Quartiles</CardTitle>
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

          {/* Features Tab */}
          <TabsContent value="features">
            <BentoGrid className="max-w-5xl mx-auto">
              {features.map((feature, index) => (
                <BentoGridItem
                  key={index}
                  title={feature.title}
                  description={feature.description}
                  header={feature.header}
                  icon={feature.icon}
                  className={index === 3 || index === 6 ? "md:col-span-2" : ""}
                />
              ))}
            </BentoGrid>
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}
