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
  type JudgeStatsResult,
} from "@/lib/api"
import { cn } from "@/lib/utils"
import { calculateEffectiveSum, getDroppedIndices } from "@/lib/scoring"
import type { ExtendedAthleteResult, ExtendedDiveResult, ExtendedRoundData } from "@/lib/types"
import { EditDiveModal, DeleteConfirmDialog, AthleteGrid, JudgeScoreCell } from "@/components/competition"
import { 
  AthleteProgressionChart,
  JudgeConsistencyChart,
  ScoreDistributionChart,
  RoundComparisonRadar,
  DifficultyScoreScatter,
  DiveCategoryComparator
} from "@/components/charts"

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
  const [judgeStats, setJudgeStats] = useState<JudgeStatsResult | null>(null)
  const [errors, setErrors] = useState<RowError[]>([])
  const [loading, setLoading] = useState(true)
  const [retrying, setRetrying] = useState(false)
  const [expandedAthlete, setExpandedAthlete] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState("standings")
  const [selectedEvent, setSelectedEvent] = useState<string>("all") // "all" or specific event name
  
  // CRUD modals state
  const [editDiveId, setEditDiveId] = useState<number | null>(null)
  const [deleteDiveId, setDeleteDiveId] = useState<number | null>(null)
  const [showDeleteCompetition, setShowDeleteCompetition] = useState(false)
  
  // Keyboard navigation state
  const [focusedAthleteIndex, setFocusedAthleteIndex] = useState<number>(-1)

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
          const [compData, judgeStatsData] = await Promise.all([
            api.getCompetitionData(id),
            api.getJudgeStats(id).catch(() => null), // Optional, don't fail if unavailable
          ]);
          setCompetitionData(compData)
          setJudgeStats(judgeStatsData)
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

  // Convert AthleteResult to ExtendedAthleteResult for new components
  const extendedAthletes = useMemo((): ExtendedAthleteResult[] => {
    if (!currentData?.athletes) return []
    return currentData.athletes.map((athlete) => ({
      ...athlete,
      dives: athlete.dives.map((dive) => ({
        ...dive,
        penaltyCode: undefined,
        penaltyDescription: undefined,
      })) as ExtendedDiveResult[],
    }))
  }, [currentData])

  // Keyboard navigation: J/K for athletes, E for edit, Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in an input
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      // Skip if a modal is open
      if (editDiveId !== null || deleteDiveId !== null || showDeleteCompetition) {
        if (e.key === 'Escape') {
          // Close any open modal
          setEditDiveId(null)
          setDeleteDiveId(null)
          setShowDeleteCompetition(false)
        }
        return
      }

      const athleteCount = extendedAthletes.length
      if (athleteCount === 0) return

      switch (e.key.toLowerCase()) {
        case 'j':
          // Move to next athlete
          e.preventDefault()
          setFocusedAthleteIndex((prev) => {
            const next = prev < athleteCount - 1 ? prev + 1 : 0
            // Scroll focused athlete into view
            setTimeout(() => {
              const el = document.querySelector(`[data-athlete-index="${next}"]`)
              el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }, 0)
            return next
          })
          break
        case 'k':
          // Move to previous athlete
          e.preventDefault()
          setFocusedAthleteIndex((prev) => {
            const next = prev > 0 ? prev - 1 : athleteCount - 1
            // Scroll focused athlete into view
            setTimeout(() => {
              const el = document.querySelector(`[data-athlete-index="${next}"]`)
              el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }, 0)
            return next
          })
          break
        case 'e':
          // Edit first dive of focused athlete
          if (focusedAthleteIndex >= 0 && focusedAthleteIndex < athleteCount) {
            e.preventDefault()
            const athlete = extendedAthletes[focusedAthleteIndex]
            if (athlete.dives.length > 0) {
              setEditDiveId(athlete.dives[0].id)
            }
          }
          break
        case 'escape':
          // Clear focus
          setFocusedAthleteIndex(-1)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [extendedAthletes, focusedAthleteIndex, editDiveId, deleteDiveId, showDeleteCompetition])

  // Get all dives for chart components
  const allDives = useMemo(() => {
    return extendedAthletes.flatMap((a) => a.dives)
  }, [extendedAthletes])

  // Get all scores for distribution chart
  const allScores = useMemo(() => {
    return allDives.map((d) => d.finalScore).filter((s): s is number => s !== null && s !== undefined)
  }, [allDives])

  // Convert rounds to ExtendedRoundData
  const extendedRounds = useMemo((): ExtendedRoundData[] => {
    if (!currentData?.rounds) return []
    return currentData.rounds.map((round) => {
      const scores = round.dives.map((d) => d.finalScore).filter((s): s is number => s !== null && s !== undefined)
      const sortedScores = [...scores].sort((a, b) => a - b)
      const median = sortedScores.length > 0 
        ? sortedScores.length % 2 === 0 
          ? (sortedScores[sortedScores.length / 2 - 1] + sortedScores[sortedScores.length / 2]) / 2
          : sortedScores[Math.floor(sortedScores.length / 2)]
        : 0
      const mean = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
      const variance = scores.length > 0 
        ? scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length
        : 0
      
      return {
        ...round,
        lowestScore: Math.min(...scores) || 0,
        medianScore: median,
        stdDeviation: Math.sqrt(variance),
      }
    })
  }, [currentData])

  // Find dive for edit modal
  const editDive = useMemo(() => {
    if (!editDiveId) return null
    return allDives.find((d) => d.id === editDiveId) || null
  }, [editDiveId, allDives])

  // Optimistic update handler for dive edits - updates local state immediately
  const handleDiveSaved = useCallback((updatedDive: ExtendedDiveResult) => {
    setCompetitionData((prev) => {
      if (!prev) return prev
      
      // Helper to update dive in athlete's dives array
      const updateAthleteDives = (athletes: AthleteResult[]): AthleteResult[] => {
        return athletes.map((athlete) => ({
          ...athlete,
          dives: athlete.dives.map((dive) =>
            dive.id === updatedDive.id
              ? { ...dive, ...updatedDive }
              : dive
          ),
          // Recalculate athlete's total score
          totalScore: athlete.dives.reduce((sum, dive) => {
            const score = dive.id === updatedDive.id ? updatedDive.finalScore : dive.finalScore
            return sum + (score ?? 0)
          }, 0),
        }))
      }

      // Update rounds array if it exists
      const updateRounds = (rounds: RoundData[]): RoundData[] => {
        return rounds.map((round) => ({
          ...round,
          dives: round.dives.map((dive) =>
            dive.id === updatedDive.id
              ? { ...dive, ...updatedDive }
              : dive
          ),
        }))
      }

      // Update main athletes and rounds
      const updatedAthletes = updateAthleteDives(prev.athletes)
      const updatedRounds = updateRounds(prev.rounds || [])

      // Update events if they exist
      const updatedEvents = prev.events
        ? Object.fromEntries(
            Object.entries(prev.events).map(([eventName, eventData]) => [
              eventName,
              {
                ...eventData,
                athletes: updateAthleteDives(eventData.athletes),
                rounds: updateRounds(eventData.rounds || []),
              },
            ])
          )
        : undefined

      return {
        ...prev,
        athletes: updatedAthletes,
        rounds: updatedRounds,
        events: updatedEvents,
      }
    })
    setEditDiveId(null)
  }, [])

  // Optimistic delete handler for dives - removes dive from local state immediately
  const handleDiveDeleted = useCallback((deletedDiveId: number) => {
    setCompetitionData((prev) => {
      if (!prev) return prev

      // Helper to remove dive from athlete's dives array and recalculate total
      const removeFromAthletes = (athletes: AthleteResult[]): AthleteResult[] => {
        return athletes.map((athlete) => {
          const filteredDives = athlete.dives.filter((dive) => dive.id !== deletedDiveId)
          return {
            ...athlete,
            dives: filteredDives,
            totalScore: filteredDives.reduce((sum, dive) => sum + (dive.finalScore ?? 0), 0),
          }
        })
      }

      // Helper to remove dive from rounds
      const removeFromRounds = (rounds: RoundData[]): RoundData[] => {
        return rounds.map((round) => ({
          ...round,
          dives: round.dives.filter((dive) => dive.id !== deletedDiveId),
        }))
      }

      // Update main arrays
      const updatedAthletes = removeFromAthletes(prev.athletes)
      const updatedRounds = removeFromRounds(prev.rounds || [])

      // Update events if they exist
      const updatedEvents = prev.events
        ? Object.fromEntries(
            Object.entries(prev.events).map(([eventName, eventData]) => [
              eventName,
              {
                ...eventData,
                athletes: removeFromAthletes(eventData.athletes),
                rounds: removeFromRounds(eventData.rounds || []),
              },
            ])
          )
        : undefined

      // Update statistics
      const allRemainingDives = updatedAthletes.flatMap((a) => a.dives)
      const updatedStatistics = {
        ...prev.statistics,
        totalDives: allRemainingDives.length,
      }

      return {
        ...prev,
        athletes: updatedAthletes,
        rounds: updatedRounds,
        events: updatedEvents,
        statistics: updatedStatistics,
      }
    })
    setDeleteDiveId(null)
  }, [])

  // CRUD handlers
  const handleEditDive = useCallback((diveId: number) => {
    setEditDiveId(diveId)
  }, [])

  const handleDeleteDive = useCallback((diveId: number) => {
    setDeleteDiveId(diveId)
  }, [])

  // Handler for athlete name changes - updates all references in local state
  const handleAthleteNameChange = useCallback((athleteId: number, newName: string) => {
    setCompetitionData((prev) => {
      if (!prev) return prev

      // Helper to update athlete name in athletes array
      const updateAthletes = (athletes: AthleteResult[]): AthleteResult[] => {
        return athletes.map((athlete) =>
          athlete.athlete.id === athleteId
            ? { ...athlete, athlete: { ...athlete.athlete, name: newName } }
            : athlete
        )
      }

      // Helper to update athlete name in rounds array
      const updateRounds = (rounds: RoundData[]): RoundData[] => {
        return rounds.map((round) => ({
          ...round,
          dives: round.dives.map((dive) =>
            // Match by checking if the dive belongs to this athlete
            // We need to find the athlete by ID in the main athletes array
            prev.athletes.find(a => a.athlete.id === athleteId)?.dives.some(d => d.id === dive.id)
              ? { ...dive, athleteName: newName }
              : dive
          ),
        }))
      }

      // Update main arrays
      const updatedAthletes = updateAthletes(prev.athletes)
      const updatedRounds = updateRounds(prev.rounds || [])

      // Update events if they exist
      const updatedEvents = prev.events
        ? Object.fromEntries(
            Object.entries(prev.events).map(([eventName, eventData]) => [
              eventName,
              {
                ...eventData,
                athletes: updateAthletes(eventData.athletes),
                rounds: updateRounds(eventData.rounds || []),
              },
            ])
          )
        : undefined

      return {
        ...prev,
        athletes: updatedAthletes,
        rounds: updatedRounds,
        events: updatedEvents,
      }
    })
  }, [])

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
              {/* Delete competition button */}
              {comp?.id && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowDeleteCompetition(true)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              )}
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
                    <AthleteGrid
                      athletes={extendedAthletes}
                      onEditDive={handleEditDive}
                      onDeleteDive={handleDeleteDive}
                      onAthleteNameChange={handleAthleteNameChange}
                      showCrud={true}
                      focusedIndex={focusedAthleteIndex}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="rounds" className="space-y-4">
                {currentData?.rounds.map((round) => {
                  // Find max judges for this round
                  const maxJudges = Math.max(
                    ...round.dives.map((d) => d.judgeScores?.length || 0),
                    5
                  );
                  
                  // Sort dives by score for this round and assign round-specific rankings
                  const sortedDives = [...round.dives]
                    .sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0))
                    .map((dive, idx) => ({
                      ...dive,
                      roundRank: idx + 1, // Round-specific rank (1st, 2nd, 3rd in THIS round)
                    }));
                  
                  return (
                    <Card key={round.roundNumber}>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <Activity className="h-5 w-5 text-primary" />
                            Round {round.roundNumber}
                            {selectedEvent !== "all" && (
                              <span className="text-sm font-normal text-muted-foreground">— {selectedEvent}</span>
                            )}
                          </span>
                          <div className="flex items-center gap-4 text-sm font-normal text-muted-foreground">
                            <span>{round.diveCount} dives</span>
                            <span>Avg: {round.averageScore.toFixed(1)}</span>
                            <span className="text-green-600">Best: {round.highestScore.toFixed(1)}</span>
                          </div>
                        </CardTitle>
                        <CardDescription>
                          Rankings for this round only (not cumulative standings)
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse text-sm">
                            <thead>
                              <tr className="border-b text-xs text-muted-foreground">
                                <th className="text-center py-2 px-2 w-14">
                                  <span className="flex flex-col items-center">
                                    <span>Round</span>
                                    <span>Rank</span>
                                  </span>
                                </th>
                                <th className="text-left py-2 px-2 min-w-[140px]">Athlete</th>
                                <th className="text-left py-2 px-2 w-16">Dive</th>
                                <th className="text-center py-2 px-1 w-10">DD</th>
                                {/* Judge columns */}
                                {Array.from({ length: maxJudges }).map((_, i) => (
                                  <th key={i} className="text-center py-2 px-1 w-10">
                                    J{i + 1}
                                  </th>
                                ))}
                                <th className="text-center py-2 px-1 w-12">Sum</th>
                                <th className="text-right py-2 px-2 w-16">Score</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sortedDives.map((dive) => {
                                  const judgeScores = dive.judgeScores || [];
                                  const droppedIndices = getDroppedIndices(judgeScores);
                                  const effectiveSum = calculateEffectiveSum(judgeScores);
                                  const roundRank = dive.roundRank;
                                  
                                  return (
                                    <tr 
                                      key={dive.id} 
                                      className={cn(
                                        "border-b last:border-0 transition-colors hover:bg-muted/30",
                                        roundRank <= 3 && "bg-primary/5"
                                      )}
                                    >
                                      {/* Round Rank */}
                                      <td className="py-2 px-2 text-center">
                                        <div className={cn(
                                          "inline-flex items-center justify-center w-7 h-7 rounded-full font-bold text-sm",
                                          roundRank === 1 && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
                                          roundRank === 2 && "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
                                          roundRank === 3 && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                                          roundRank > 3 && "text-muted-foreground"
                                        )}>
                                          {roundRank}
                                        </div>
                                      </td>
                                      
                                      {/* Athlete */}
                                      <td className="py-2 px-2">
                                        <span className="font-medium">{dive.athleteName ?? "Unknown"}</span>
                                        {dive.athleteCountry && (
                                          <span className="text-muted-foreground text-xs ml-1">
                                            ({dive.athleteCountry})
                                          </span>
                                        )}
                                      </td>
                                      
                                      {/* Dive Code */}
                                      <td className="py-2 px-2 font-mono font-medium">
                                        {dive.diveCode ?? "—"}
                                      </td>
                                      
                                      {/* Difficulty */}
                                      <td className="py-2 px-1 text-center text-muted-foreground">
                                        {dive.difficulty?.toFixed(1) ?? "—"}
                                      </td>
                                      
                                      {/* Judge Scores */}
                                      {Array.from({ length: maxJudges }).map((_, judgeIndex) => {
                                        const score = judgeScores[judgeIndex];
                                        const isDropped = droppedIndices.includes(judgeIndex);
                                        
                                        return (
                                          <td key={judgeIndex} className="py-2 px-1 text-center">
                                            {score !== undefined ? (
                                              <JudgeScoreCell 
                                                score={score} 
                                                isDropped={isDropped}
                                                compact
                                              />
                                            ) : (
                                              <span className="text-muted-foreground/30">—</span>
                                            )}
                                          </td>
                                        );
                                      })}
                                      
                                      {/* Effective Sum */}
                                      <td className="py-2 px-1 text-center text-muted-foreground">
                                        {effectiveSum.sum.toFixed(1)}
                                      </td>
                                      
                                      {/* Final Score */}
                                      <td className="py-2 px-2 text-right font-bold text-primary">
                                        {dive.finalScore?.toFixed(2) ?? "—"}
                                      </td>
                                    </tr>
                                  );
                                })}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </TabsContent>

              <TabsContent value="charts" className="space-y-6">
                {/* Enhanced Charts Section */}
                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Athlete Score Progression */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Score Progression</CardTitle>
                      <CardDescription>Cumulative scores by round</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <AthleteProgressionChart athletes={extendedAthletes} />
                    </CardContent>
                  </Card>

                  {/* Judge Consistency Chart */}
                  {judgeStats && judgeStats.judges && judgeStats.judges.length > 0 ? (
                    <JudgeConsistencyChart judgeStats={judgeStats} />
                  ) : (
                    <Card>
                      <CardHeader>
                        <CardTitle>Judge Consistency</CardTitle>
                        <CardDescription>Mean and standard deviation by judge</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground text-center py-8">
                          {judgeStats ? "No judge score data available for this competition." : "Loading judge statistics..."}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Score Distribution */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Score Distribution</CardTitle>
                      <CardDescription>Histogram of final dive scores</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScoreDistributionChart dives={allDives} binSize={10} />
                    </CardContent>
                  </Card>

                  {/* Round Comparison Radar */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Round Comparison</CardTitle>
                      <CardDescription>Performance metrics by round</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <RoundComparisonRadar athletes={extendedAthletes} />
                    </CardContent>
                  </Card>

                  {/* Dive Category Comparator */}
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle>Dive Category Analysis</CardTitle>
                      <CardDescription>Compare performance across Forward, Back, Reverse, Inward, Twisting, and Armstand dives</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <DiveCategoryComparator athletes={extendedAthletes} />
                    </CardContent>
                  </Card>

                  {/* Difficulty vs Score Scatter */}
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle>Difficulty vs Score</CardTitle>
                      <CardDescription>Relationship between dive difficulty and final score</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <DifficultyScoreScatter dives={allDives} showTrendline />
                    </CardContent>
                  </Card>
                </div>

                {/* Legacy Charts - kept for reference */}
                <Card>
                  <CardHeader>
                    <CardTitle>Athlete Total Scores</CardTitle>
                    <CardDescription>Top 10 athletes</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={athleteScoreData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis type="category" dataKey="name" width={80} />
                          <Tooltip />
                          <Bar dataKey="total" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
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

        {/* Edit Dive Modal */}
        <EditDiveModal
          open={!!editDive}
          dive={editDive}
          onOpenChange={(open) => !open && setEditDiveId(null)}
          onSave={handleDiveSaved}
        />

        {/* Delete Dive Confirmation Dialog */}
        <DeleteConfirmDialog
          open={!!deleteDiveId}
          onOpenChange={(open) => !open && setDeleteDiveId(null)}
          itemType="dive"
          itemId={deleteDiveId || 0}
          itemName={allDives.find((d) => d.id === deleteDiveId)?.diveCode}
          onDelete={() => handleDiveDeleted(deleteDiveId!)}
        />

        {/* Delete Competition Confirmation Dialog */}
        <DeleteConfirmDialog
          open={showDeleteCompetition}
          onOpenChange={setShowDeleteCompetition}
          itemType="competition"
          itemId={comp?.id || 0}
          itemName={comp?.name}
          cascadeWarning={`This will permanently delete all ${stats?.totalDives || 0} dives and ${stats?.totalAthletes || 0} athlete records associated with this competition.`}
          onDelete={() => {
            // Navigate back to competitions list after deletion
            router.push('/competitions')
          }}
        />
      </main>
    </>
  )
}
