"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import Head from "next/head"
import Link from "next/link"
import { useRouter } from "next/router"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Trophy,
  Users,
  Activity,
  Target,
  TrendingUp,
  Medal,
  BarChart3,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Layers,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui"
import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui"
import { GradientText } from "@/components/aceternity"
import {
  api,
  type IngestionLog,
  type RowError,
  type IngestionStatus as IStatus,
  type CompetitionData,
  type AthleteResult,
  type RoundData,
} from "@/lib/api"
import { cn } from "@/lib/utils"

const statusConfig: Record<IStatus, { icon: React.ReactNode; color: string; bgColor: string; label: string }> = {
  pending: { icon: <Clock className="h-5 w-5" />, color: "text-yellow-500", bgColor: "bg-yellow-500/10", label: "Pending" },
  processing: { icon: <RefreshCw className="h-5 w-5 animate-spin" />, color: "text-blue-500", bgColor: "bg-blue-500/10", label: "Processing" },
  completed: { icon: <CheckCircle2 className="h-5 w-5" />, color: "text-green-500", bgColor: "bg-green-500/10", label: "Completed" },
  failed: { icon: <XCircle className="h-5 w-5" />, color: "text-red-500", bgColor: "bg-red-500/10", label: "Failed" },
  partial: { icon: <AlertCircle className="h-5 w-5" />, color: "text-orange-500", bgColor: "bg-orange-500/10", label: "Partial" },
}

export default function CompetitionDetailPage() {
  const router = useRouter()
  const { id } = router.query
  const [log, setLog] = useState<IngestionLog | null>(null)
  const [competitionData, setCompetitionData] = useState<CompetitionData | null>(null)
  const [errors, setErrors] = useState<RowError[]>([])
  const [loading, setLoading] = useState(true)
  const [retrying, setRetrying] = useState(false)
  const [expandedAthlete, setExpandedAthlete] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState("standings")
  const [selectedEvent, setSelectedEvent] = useState<string>("all") // "all" or specific event name

  const fetchData = useCallback(async () => {
    if (!id || typeof id !== "string") return
    setLoading(true)
    try {
      const [logData, errorsData] = await Promise.all([
        api.getIngestionStatus(id),
        api.getIngestionErrors(id),
      ])
      setLog(logData)
      setErrors(errorsData.errors || [])

      // Fetch competition data for completed or partial imports (partial = some dives imported successfully)
      if ((logData.status === "completed" || logData.status === "partial") && logData.competitionId) {
        try {
          const compData = await api.getCompetitionData(id)
          setCompetitionData(compData)
        } catch (err) {
          console.error("Failed to fetch competition data", err)
        }
      }
    } catch (err) {
      console.error("Failed to fetch data", err)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    if (log?.status === "processing") {
      const interval = setInterval(fetchData, 3000)
      return () => clearInterval(interval)
    }
  }, [log?.status, fetchData])

  // Extract the original PDF job ID from the file name (e.g., "pdf-import-pdf-xxx" -> "pdf-xxx")
  const getPdfJobId = (fileName: string): string | null => {
    if (fileName.startsWith('pdf-import-')) {
      return fileName.replace('pdf-import-', '')
    }
    return null
  }

  const handleRetryImport = async () => {
    if (!log) return
    const pdfJobId = getPdfJobId(log.fileName)
    if (!pdfJobId) {
      console.error("Cannot retry: not a PDF import or invalid file name")
      return
    }

    setRetrying(true)
    try {
      await api.importPdfJob(pdfJobId, {
        eventType: 'auto', // Use auto height detection
      })
      // Refresh the page to show updated status
      await fetchData()
    } catch (err) {
      console.error("Failed to retry import", err)
    } finally {
      setRetrying(false)
    }
  }

  const formatDate = (dateStr?: string) => dateStr ? new Date(dateStr).toLocaleString() : "—"

  const getMedalColor = (rank: number) => {
    if (rank === 1) return "text-yellow-500"
    if (rank === 2) return "text-gray-400"
    if (rank === 3) return "text-amber-600"
    return "text-muted-foreground"
  }

  // Get the current view data based on selected event - MUST be before early returns
  const currentData = useMemo(() => {
    if (!competitionData) return null
    
    if (selectedEvent === "all" || !competitionData.hasMultipleEvents) {
      return {
        statistics: competitionData.statistics,
        athletes: competitionData.athletes,
        rounds: competitionData.rounds,
      }
    }
    
    // Get event-specific data
    const eventData = competitionData.events?.[selectedEvent]
    if (eventData) {
      return {
        statistics: eventData.statistics,
        athletes: eventData.athletes,
        rounds: eventData.rounds,
      }
    }
    
    return {
      statistics: competitionData.statistics,
      athletes: competitionData.athletes,
      rounds: competitionData.rounds,
    }
  }, [competitionData, selectedEvent])

  if (loading && !log) {
    return <div className="min-h-screen flex items-center justify-center"><RefreshCw className="h-8 w-8 animate-spin text-primary" /></div>
  }

  if (!log) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <XCircle className="h-12 w-12 text-red-500" />
        <p className="text-lg">Competition not found</p>
        <Link href="/competitions"><Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button></Link>
      </div>
    )
  }

  const cfg = statusConfig[log.status]
  const comp = competitionData?.competition
  
  const stats = currentData?.statistics

  const athleteScoreData = currentData?.athletes.slice(0, 10).map(a => ({
    name: a.athlete.name.split(" ").pop() || a.athlete.name,
    total: a.totalScore,
  })) || []

  const roundData = currentData?.rounds.map(r => ({
    round: `R${r.roundNumber}`,
    average: Math.round(r.averageScore * 10) / 10,
    highest: r.highestScore,
  })) || []

  const difficultyMap = new Map<string, number>()
  currentData?.athletes.forEach(a => a.dives.forEach(d => {
    const dd = d.difficulty.toFixed(1)
    difficultyMap.set(dd, (difficultyMap.get(dd) || 0) + 1)
  }))
  const difficultyData = Array.from(difficultyMap.entries()).map(([dd, count]) => ({ dd, count })).sort((a, b) => parseFloat(a.dd) - parseFloat(b.dd))

  return (
    <>
      <Head><title>{comp?.name || log.fileName} | Diving Analytics</title></Head>
      <main className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-lg">
          <div className="container mx-auto flex h-16 items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl">
              <span className="text-primary">🤿</span>
              <GradientText>Diving Analytics</GradientText>
            </Link>
            <Link href="/competitions"><Button variant="ghost" size="sm">Competitions</Button></Link>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          <Link href="/competitions" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Competitions
          </Link>

          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                <GradientText>{comp?.name || log.fileName}</GradientText>
              </h1>
              <div className="flex items-center gap-4 mt-2 text-muted-foreground">
                {comp?.eventType && <span className="font-medium">{comp.eventType}</span>}
                {comp?.location && <span>📍 {comp.location}</span>}
                {comp?.date && <span>📅 {new Date(comp.date).toLocaleDateString()}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full", cfg.bgColor, cfg.color)}>
                {cfg.icon}<span className="text-sm font-medium">{cfg.label}</span>
              </div>
              {/* Show retry button for failed/partial PDF imports */}
              {(log.status === "failed" || log.status === "partial") && log.fileName.startsWith("pdf-import-") && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRetryImport} 
                  disabled={retrying}
                  className="gap-1"
                >
                  <RotateCcw className={cn("h-4 w-4", retrying && "animate-spin")} />
                  {retrying ? "Retrying..." : "Retry Import"}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>
            </div>
          </div>

          {stats && (
            <div className="grid gap-4 md:grid-cols-6 mb-8">
              <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-full bg-primary/10"><Users className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold">{stats.totalAthletes}</p><p className="text-xs text-muted-foreground">Athletes</p></div></div></CardContent></Card>
              <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-full bg-blue-500/10"><Target className="h-5 w-5 text-blue-500" /></div><div><p className="text-2xl font-bold">{stats.totalDives}</p><p className="text-xs text-muted-foreground">Total Dives</p></div></div></CardContent></Card>
              <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-full bg-green-500/10"><TrendingUp className="h-5 w-5 text-green-500" /></div><div><p className="text-2xl font-bold">{stats.highestScore.toFixed(1)}</p><p className="text-xs text-muted-foreground">Highest</p></div></div></CardContent></Card>
              <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-full bg-amber-500/10"><BarChart3 className="h-5 w-5 text-amber-500" /></div><div><p className="text-2xl font-bold">{stats.averageScore.toFixed(1)}</p><p className="text-xs text-muted-foreground">Average</p></div></div></CardContent></Card>
              <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-full bg-purple-500/10"><Activity className="h-5 w-5 text-purple-500" /></div><div><p className="text-2xl font-bold">{stats.rounds}</p><p className="text-xs text-muted-foreground">Rounds</p></div></div></CardContent></Card>
              <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-full bg-red-500/10"><Target className="h-5 w-5 text-red-500" /></div><div><p className="text-2xl font-bold">{stats.lowestScore.toFixed(1)}</p><p className="text-xs text-muted-foreground">Lowest</p></div></div></CardContent></Card>
            </div>
          )}

          {/* Event selector for multi-event competitions */}
          {competitionData?.hasMultipleEvents && competitionData.eventNames.length > 0 && (
            <div className="mb-6">
              <Card>
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">Events</CardTitle>
                      <span className="text-sm text-muted-foreground">({competitionData.eventNames.length} events in this meet)</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={selectedEvent === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedEvent("all")}
                      className="gap-1"
                    >
                      <Users className="h-4 w-4" />
                      All Events
                    </Button>
                    {competitionData.eventNames.map((eventName) => (
                      <Button
                        key={eventName}
                        variant={selectedEvent === eventName ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedEvent(eventName)}
                      >
                        {eventName}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {competitionData ? (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full max-w-lg grid-cols-4">
                <TabsTrigger value="standings"><Trophy className="h-4 w-4 mr-1" /> Standings</TabsTrigger>
                <TabsTrigger value="rounds"><Activity className="h-4 w-4 mr-1" /> Rounds</TabsTrigger>
                <TabsTrigger value="charts"><BarChart3 className="h-4 w-4 mr-1" /> Charts</TabsTrigger>
                <TabsTrigger value="details"><AlertCircle className="h-4 w-4 mr-1" /> Details</TabsTrigger>
              </TabsList>

              <TabsContent value="standings" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-yellow-500" />
                      Final Standings
                      {selectedEvent !== "all" && (
                        <span className="text-sm font-normal text-muted-foreground ml-2">— {selectedEvent}</span>
                      )}
                    </CardTitle>
                    <CardDescription>Competition rankings based on total score</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {currentData?.athletes.map((athlete, idx) => (
                        <motion.div key={athlete.athlete.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                          <div
                            className={cn("flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors", expandedAthlete === athlete.athlete.id ? "bg-muted" : "hover:bg-muted/50", athlete.rank <= 3 && "border-l-4", athlete.rank === 1 && "border-l-yellow-500", athlete.rank === 2 && "border-l-gray-400", athlete.rank === 3 && "border-l-amber-600")}
                            onClick={() => setExpandedAthlete(expandedAthlete === athlete.athlete.id ? null : athlete.athlete.id)}
                          >
                            <div className="flex items-center gap-4">
                              <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-bold", athlete.rank <= 3 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                                {athlete.rank <= 3 ? <Medal className={cn("h-5 w-5", getMedalColor(athlete.rank))} /> : athlete.rank}
                              </div>
                              <div>
                                <p className="font-semibold">{athlete.athlete.name}</p>
                                <p className="text-sm text-muted-foreground">{athlete.athlete.country || "—"} • {athlete.diveCount} dives</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-6">
                              <div className="text-right"><p className="text-2xl font-bold">{athlete.totalScore.toFixed(2)}</p><p className="text-xs text-muted-foreground">Total</p></div>
                              <div className="text-right"><p className="text-lg font-medium text-muted-foreground">{athlete.averageScore.toFixed(2)}</p><p className="text-xs text-muted-foreground">Avg</p></div>
                              {expandedAthlete === athlete.athlete.id ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                            </div>
                          </div>
                          <AnimatePresence>
                            {expandedAthlete === athlete.athlete.id && (
                              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                                <div className="p-4 bg-muted/30 rounded-b-lg border border-t-0 space-y-2">
                                  <p className="text-sm font-medium text-muted-foreground mb-3">Dive Breakdown</p>
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="text-left text-muted-foreground text-xs">
                                        <th className="w-12 p-1">Round</th>
                                        <th className="w-20 p-1">Code</th>
                                        <th className="w-16 p-1">DD</th>
                                        <th className="p-1">Judges</th>
                                        <th className="w-20 text-right p-1">Score</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {athlete.dives.map((dive) => (
                                        <tr key={dive.id} className="bg-background rounded-md">
                                          <td className="w-12 p-2 text-muted-foreground">R{dive.roundNumber ?? "?"}</td>
                                          <td className="w-20 p-2 font-mono font-medium">{dive.diveCode ?? "—"}</td>
                                          <td className="w-16 p-2 text-muted-foreground">{dive.difficulty ?? "—"}</td>
                                          <td className="p-2 text-xs text-muted-foreground">{dive.judgeScores ? `[${dive.judgeScores.join(", ")}]` : "—"}</td>
                                          <td className="w-20 p-2 text-right font-bold">{dive.finalScore?.toFixed(2) ?? "—"}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="rounds" className="space-y-4">
                {currentData?.rounds.map((round) => (
                  <Card key={round.roundNumber}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>
                          Round {round.roundNumber}
                          {selectedEvent !== "all" && (
                            <span className="text-sm font-normal text-muted-foreground ml-2">— {selectedEvent}</span>
                          )}
                        </span>
                        <div className="flex items-center gap-4 text-sm font-normal text-muted-foreground">
                          <span>{round.diveCount} dives</span>
                          <span>Avg: {round.averageScore.toFixed(1)}</span>
                          <span>Best: {round.highestScore.toFixed(1)}</span>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead><tr className="border-b"><th className="text-left p-2">Rank</th><th className="text-left p-2">Athlete</th><th className="text-left p-2">Dive</th><th className="text-center p-2">DD</th><th className="text-center p-2">Judges</th><th className="text-right p-2">Score</th></tr></thead>
                          <tbody>
                            {[...round.dives].sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0)).map((dive, idx) => (
                              <tr key={dive.id} className="border-b last:border-0 hover:bg-muted/50">
                                <td className="p-2 font-medium w-12">{dive.rank ?? idx + 1}</td>
                                <td className="p-2 w-48"><span className="font-medium">{dive.athleteName ?? "Unknown"}</span>{dive.athleteCountry && <span className="text-muted-foreground ml-2">({dive.athleteCountry})</span>}</td>
                                <td className="p-2 font-mono w-20">{dive.diveCode ?? "—"}</td>
                                <td className="p-2 text-center w-16">{dive.difficulty ?? "—"}</td>
                                <td className="p-2 text-center text-xs text-muted-foreground">{dive.judgeScores?.join(", ") ?? "—"}</td>
                                <td className="p-2 text-right font-bold w-20">{dive.finalScore?.toFixed(2) ?? "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="charts" className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <Card><CardHeader><CardTitle>Athlete Total Scores</CardTitle><CardDescription>Top 10 athletes</CardDescription></CardHeader><CardContent><div className="h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={athleteScoreData} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis type="category" dataKey="name" width={80} /><Tooltip /><Bar dataKey="total" fill="#3b82f6" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div></CardContent></Card>
                  <Card><CardHeader><CardTitle>Round Performance</CardTitle><CardDescription>Avg and highest by round</CardDescription></CardHeader><CardContent><div className="h-80"><ResponsiveContainer width="100%" height="100%"><LineChart data={roundData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="round" /><YAxis /><Tooltip /><Legend /><Line type="monotone" dataKey="average" stroke="#3b82f6" strokeWidth={2} name="Average" /><Line type="monotone" dataKey="highest" stroke="#10b981" strokeWidth={2} name="Highest" /></LineChart></ResponsiveContainer></div></CardContent></Card>
                  <Card className="md:col-span-2"><CardHeader><CardTitle>Difficulty Distribution</CardTitle><CardDescription>Number of dives at each DD</CardDescription></CardHeader><CardContent><div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={difficultyData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="dd" /><YAxis /><Tooltip /><Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></CardContent></Card>
                </div>
              </TabsContent>

              <TabsContent value="details" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card><CardHeader><CardTitle>Ingestion Details</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid grid-cols-2 gap-4 text-sm"><div><p className="text-muted-foreground">File Name</p><p className="font-medium">{log.fileName}</p></div><div><p className="text-muted-foreground">File Type</p><p className="font-medium uppercase">{log.fileType}</p></div><div><p className="text-muted-foreground">Total Rows</p><p className="font-medium">{log.totalRows}</p></div><div><p className="text-muted-foreground">Processed</p><p className="font-medium text-green-500">{log.processedRows}</p></div><div><p className="text-muted-foreground">Failed</p><p className="font-medium text-red-500">{log.failedRows}</p></div><div><p className="text-muted-foreground">Competition ID</p><p className="font-medium">{log.competitionId || "—"}</p></div>{log.confidence !== undefined && log.confidence !== null && (<div><p className="text-muted-foreground">OCR Confidence</p><p className={cn("font-medium", log.confidence >= 0.85 ? "text-green-500" : log.confidence >= 0.7 ? "text-yellow-500" : "text-red-500")}>{(log.confidence * 100).toFixed(0)}%</p></div>)}</div></CardContent></Card>
                  <Card><CardHeader><CardTitle>Timeline</CardTitle></CardHeader><CardContent><div className="grid gap-4 text-sm"><div><p className="text-muted-foreground">Created</p><p className="font-medium">{formatDate(log.createdAt)}</p></div><div><p className="text-muted-foreground">Started</p><p className="font-medium">{formatDate(log.startedAt)}</p></div><div><p className="text-muted-foreground">Completed</p><p className="font-medium">{formatDate(log.completedAt)}</p></div></div></CardContent></Card>
                </div>
                {errors.length > 0 && (
                  <Card className="border-red-500/30"><CardHeader><CardTitle className="text-red-500 flex items-center gap-2"><AlertCircle className="h-5 w-5" />Row Errors ({errors.length})</CardTitle></CardHeader><CardContent><div className="max-h-64 overflow-y-auto space-y-2">{errors.map((err, idx) => (<div key={idx} className="p-3 bg-red-500/5 rounded-md text-sm"><span className="font-medium">Row {err.row}</span><p className="text-red-500 mt-1">{err.error}</p></div>))}</div></CardContent></Card>
                )}
              </TabsContent>
            </Tabs>
          ) : log.status !== "completed" ? (
            <Card><CardHeader><CardTitle>Processing Status</CardTitle></CardHeader><CardContent><div className="space-y-4"><div className="h-3 w-full bg-muted rounded-full overflow-hidden"><motion.div className="h-full bg-gradient-to-r from-primary to-blue-500" initial={{ width: 0 }} animate={{ width: `${log.totalRows > 0 ? (log.processedRows / log.totalRows) * 100 : 0}%` }} transition={{ duration: 0.5 }} /></div><p className="text-sm text-muted-foreground">{log.processedRows} of {log.totalRows} rows processed</p>{log.errorMessage && <div className="p-4 bg-red-500/10 rounded-lg text-red-500">{log.errorMessage}</div>}</div></CardContent></Card>
          ) : (
            <Card><CardContent className="py-12 text-center text-muted-foreground"><AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>No competition data available</p></CardContent></Card>
          )}
        </div>
      </main>
    </>
  )
}
