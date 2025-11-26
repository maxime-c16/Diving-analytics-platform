"use client"

import React, { useState, useEffect, useCallback } from "react"
import Head from "next/head"
import Link from "next/link"
import { useRouter } from "next/router"
import { motion } from "framer-motion"
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Download,
  Users,
  Activity,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui"
import { Button } from "@/components/ui"
import { GradientText } from "@/components/aceternity"
import { api, type IngestionLog, type RowError, type IngestionStatus as IStatus } from "@/lib/api"
import { cn } from "@/lib/utils"

const statusConfig: Record<IStatus, { icon: React.ReactNode; color: string; bgColor: string; label: string }> = {
  pending: {
    icon: <Clock className="h-5 w-5" />,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    label: "Pending",
  },
  processing: {
    icon: <RefreshCw className="h-5 w-5 animate-spin" />,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    label: "Processing",
  },
  completed: {
    icon: <CheckCircle2 className="h-5 w-5" />,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    label: "Completed",
  },
  failed: {
    icon: <XCircle className="h-5 w-5" />,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    label: "Failed",
  },
  partial: {
    icon: <AlertCircle className="h-5 w-5" />,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    label: "Partial",
  },
}

export default function CompetitionDetailPage() {
  const router = useRouter()
  const { id } = router.query
  const [log, setLog] = useState<IngestionLog | null>(null)
  const [errors, setErrors] = useState<RowError[]>([])
  const [loading, setLoading] = useState(true)

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
    } catch (err) {
      console.error("Failed to fetch data", err)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Auto-refresh if processing
  useEffect(() => {
    if (log?.status === "processing") {
      const interval = setInterval(fetchData, 3000)
      return () => clearInterval(interval)
    }
  }, [log?.status, fetchData])

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—"
    return new Date(dateStr).toLocaleString()
  }

  if (loading && !log) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!log) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <XCircle className="h-12 w-12 text-red-500" />
        <p className="text-lg">Ingestion job not found</p>
        <Link href="/competitions">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Competitions
          </Button>
        </Link>
      </div>
    )
  }

  const cfg = statusConfig[log.status]
  const successRate = log.totalRows > 0 ? (log.processedRows / log.totalRows) * 100 : 0

  return (
    <>
      <Head>
        <title>{log.fileName} | Diving Analytics</title>
      </Head>

      <main className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-lg">
          <div className="container mx-auto flex h-16 items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl">
              <span className="text-primary">🤿</span>
              <GradientText>Diving Analytics</GradientText>
            </Link>
            <nav className="flex items-center gap-4">
              <Link href="/competitions">
                <Button variant="ghost" size="sm">Competitions</Button>
              </Link>
            </nav>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          {/* Back Link */}
          <Link href="/competitions" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Competitions
          </Link>

          {/* Title */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{log.fileName}</h1>
              <p className="text-muted-foreground">
                {log.fileType.toUpperCase()} • Uploaded {formatDate(log.createdAt)}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>

          {/* Status Cards */}
          <div className="grid gap-4 md:grid-cols-4 mb-8">
            {/* Status */}
            <Card className={cn("border-l-4", cfg.color.replace("text-", "border-"))}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-full", cfg.bgColor, cfg.color)}>{cfg.icon}</div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className="text-lg font-semibold">{cfg.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Total Rows */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-muted">
                    <Activity className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Rows</p>
                    <p className="text-lg font-semibold">{log.totalRows}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Processed */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-green-500/10">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Processed</p>
                    <p className="text-lg font-semibold">{log.processedRows}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Failed */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-red-500/10">
                    <XCircle className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Failed</p>
                    <p className="text-lg font-semibold">{log.failedRows}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Progress Bar */}
          {log.totalRows > 0 && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-base">Processing Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary to-blue-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${successRate}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {successRate.toFixed(1)}% complete ({log.processedRows} of {log.totalRows} rows)
                </p>
              </CardContent>
            </Card>
          )}

          {/* Error Message */}
          {log.errorMessage && (
            <Card className="mb-8 border-red-500/30">
              <CardHeader>
                <CardTitle className="text-base text-red-500 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" /> Error
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{log.errorMessage}</p>
              </CardContent>
            </Card>
          )}

          {/* Row Errors */}
          {errors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Row Errors ({errors.length})</CardTitle>
                <CardDescription>Individual row processing errors</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-y-auto divide-y">
                  {errors.map((err, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.02 }}
                      className="py-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Row {err.row}</span>
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                          Error
                        </span>
                      </div>
                      <p className="text-sm text-red-500 mt-1">{err.error}</p>
                      {err.data && (
                        <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-x-auto">
                          {JSON.stringify(err.data, null, 2)}
                        </pre>
                      )}
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timestamps */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-base">Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p className="font-medium">{formatDate(log.createdAt)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Started</p>
                  <p className="font-medium">{formatDate(log.startedAt)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Completed</p>
                  <p className="font-medium">{formatDate(log.completedAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  )
}
