"use client"

import React, { useState, useEffect, useCallback } from "react"
import Head from "next/head"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  FileText,
  Upload,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  FileUp,
  Bug,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui"
import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui"
import { GradientText } from "@/components/aceternity"
import { api, type IngestionLog, type IngestionStatus as IStatus } from "@/lib/api"
import { cn } from "@/lib/utils"
import { PdfUploader } from "@/components/pdf-uploader"

const statusConfig: Record<IStatus, { icon: React.ReactNode; color: string; label: string }> = {
  pending: { icon: <Clock className="h-4 w-4" />, color: "text-yellow-500", label: "Pending" },
  processing: { icon: <RefreshCw className="h-4 w-4 animate-spin" />, color: "text-blue-500", label: "Processing" },
  completed: { icon: <CheckCircle2 className="h-4 w-4" />, color: "text-green-500", label: "Completed" },
  failed: { icon: <XCircle className="h-4 w-4" />, color: "text-red-500", label: "Failed" },
  partial: { icon: <AlertCircle className="h-4 w-4" />, color: "text-orange-500", label: "Partial" },
}

export default function CompetitionsPage() {
  const [logs, setLogs] = useState<IngestionLog[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [page, setPage] = useState(0)
  const limit = 10

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params: { limit: number; offset: number; status?: string } = { limit, offset: page * limit }
      if (statusFilter !== "all") params.status = statusFilter
      const result = await api.getIngestionLogs(params)
      setLogs(result.data)
      setTotal(result.total)
    } catch (err) {
      console.error("Failed to fetch logs", err)
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const handleUploadComplete = () => {
    // Refresh list after upload
    fetchLogs()
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—"
    return new Date(dateStr).toLocaleString()
  }

  return (
    <>
      <Head>
        <title>Competitions | Diving Analytics</title>
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
              <Link href="/">
                <Button variant="ghost" size="sm">Home</Button>
              </Link>
              <Link href="/competitions">
                <Button variant="ghost" size="sm" className="text-primary">Competitions</Button>
              </Link>
              <Link href="/debug/ocr">
                <Button variant="outline" size="sm" className="gap-1" aria-label="Open OCR debug interface">
                  <Bug className="h-4 w-4" /> Debug
                </Button>
              </Link>
            </nav>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col gap-8">
            {/* Page Title */}
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                <GradientText>Competitions</GradientText>
              </h1>
              <p className="text-muted-foreground mt-1">
                Upload and manage diving competition results
              </p>
            </div>

            {/* Tabs: Upload / History */}
            <Tabs defaultValue="upload" className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="upload" className="gap-2">
                  <Upload className="h-4 w-4" /> Upload
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-2">
                  <FileText className="h-4 w-4" /> History
                </TabsTrigger>
              </TabsList>

              {/* Upload Tab */}
              <TabsContent value="upload" className="mt-6">
                <div className="grid gap-6 md:grid-cols-2">
                  {/* PDF Upload Card */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileUp className="h-5 w-5 text-primary" />
                        PDF Upload (OCR)
                      </CardTitle>
                      <CardDescription>
                        Upload a competition result PDF. OCR will extract athlete names, dive codes, and scores.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <PdfUploader onComplete={handleUploadComplete} />
                    </CardContent>
                  </Card>

                  {/* CSV Upload Card */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-green-500" />
                        CSV Upload
                      </CardTitle>
                      <CardDescription>
                        Upload structured CSV with columns: athlete_name, dive_code, judge_scores, etc.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        CSV upload coming soon. Use the PDF uploader for now.
                      </p>
                      <Button disabled variant="outline" className="w-full">
                        <Upload className="h-4 w-4 mr-2" /> Select CSV
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* History Tab */}
              <TabsContent value="history" className="mt-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Ingestion History</CardTitle>
                      <CardDescription>
                        {total} total job{total !== 1 ? "s" : ""}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={statusFilter}
                        onChange={(e) => {
                          setStatusFilter(e.target.value)
                          setPage(0)
                        }}
                        className="h-9 rounded-md border bg-background px-3 text-sm"
                      >
                        <option value="all">All Statuses</option>
                        <option value="completed">Completed</option>
                        <option value="processing">Processing</option>
                        <option value="failed">Failed</option>
                        <option value="partial">Partial</option>
                        <option value="pending">Pending</option>
                      </select>
                      <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
                        <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {loading && logs.length === 0 ? (
                      <div className="flex items-center justify-center py-12 text-muted-foreground">
                        <RefreshCw className="h-5 w-5 animate-spin mr-2" /> Loading...
                      </div>
                    ) : logs.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        No ingestion jobs found. Upload a PDF or CSV to get started.
                      </div>
                    ) : (
                      <div className="divide-y">
                        {logs.map((log, idx) => {
                          const cfg = statusConfig[log.status]
                          return (
                            <motion.div
                              key={log.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.03 }}
                              className="flex items-center justify-between py-3 group"
                            >
                              <div className="flex items-center gap-3">
                                <div className={cn("flex items-center justify-center w-8 h-8 rounded-full bg-muted", cfg.color)}>
                                  {cfg.icon}
                                </div>
                                <div>
                                  <p className="font-medium text-sm">{log.fileName}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {log.fileType.toUpperCase()} • {formatDate(log.createdAt)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4 text-sm">
                                <div className="text-right hidden sm:block">
                                  <p className={cfg.color}>{cfg.label}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {log.processedRows}/{log.totalRows} rows
                                  </p>
                                </div>
                                <Link href={`/competitions/${log.id}`}>
                                  <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ChevronRight className="h-4 w-4" />
                                  </Button>
                                </Link>
                              </div>
                            </motion.div>
                          )
                        })}
                      </div>
                    )}

                    {/* Pagination */}
                    {total > limit && (
                      <div className="flex items-center justify-between pt-4 border-t mt-4">
                        <p className="text-sm text-muted-foreground">
                          Page {page + 1} of {Math.ceil(total / limit)}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={page === 0}
                            onClick={() => setPage((p) => p - 1)}
                          >
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={(page + 1) * limit >= total}
                            onClick={() => setPage((p) => p + 1)}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </>
  )
}
