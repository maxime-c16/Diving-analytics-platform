"use client"

import React, { useState, useCallback, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Upload,
  FileUp,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  FileText,
  X,
} from "lucide-react"
import { Button, Input, Label } from "@/components/ui"
import { api, type PdfJobStatus, type DivingHeight, DIVING_HEIGHTS } from "@/lib/api"
import { cn } from "@/lib/utils"

interface PdfUploaderProps {
  onComplete?: () => void
}

type UploadState = "idle" | "uploading" | "polling" | "completed" | "failed"

export function PdfUploader({ onComplete }: PdfUploaderProps) {
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [state, setState] = useState<UploadState>("idle")
  const [jobId, setJobId] = useState<string | null>(null)
  const [jobStatus, setJobStatus] = useState<PdfJobStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [competitionName, setCompetitionName] = useState("")
  const [eventType, setEventType] = useState<DivingHeight>("3m")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile?.type === "application/pdf") {
      setFile(droppedFile)
      setError(null)
    } else {
      setError("Please drop a PDF file")
    }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setError(null)
    }
  }

  const startPolling = useCallback((id: string) => {
    const poll = async () => {
      try {
        const status = await api.getPdfJobStatus(id)
        setJobStatus(status)
        if (status.status === "completed") {
          setState("completed")
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
        } else if (status.status === "failed") {
          setState("failed")
          setError(status.errors?.join(", ") || "OCR processing failed")
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
        }
      } catch (err) {
        console.error("Polling error:", err)
      }
    }
    poll() // immediate first poll
    pollIntervalRef.current = setInterval(poll, 2000)
  }, [])

  const handleUpload = async () => {
    if (!file) return
    setState("uploading")
    setError(null)
    try {
      const result = await api.uploadPdf(file, {
        competitionName: competitionName || undefined,
        eventType,
      })
      setJobId(result.jobId)
      setState("polling")
      startPolling(result.jobId)
    } catch (err: any) {
      setState("failed")
      setError(err.message || "Upload failed")
    }
  }

  const handleImport = async () => {
    if (!jobId) return
    try {
      await api.importPdfJob(jobId, {
        competitionName: competitionName || jobStatus?.competitionName,
        eventType: eventType,
      })
      onComplete?.()
      reset()
    } catch (err: any) {
      setError(err.message || "Import failed")
    }
  }

  const reset = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    setFile(null)
    setState("idle")
    setJobId(null)
    setJobStatus(null)
    setError(null)
    setCompetitionName("")
  }

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
          dragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50",
          (state !== "idle" && state !== "failed") && "pointer-events-none opacity-60"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          className="hidden"
        />
        <AnimatePresence mode="wait">
          {file ? (
            <motion.div
              key="file"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center gap-2"
            >
              <FileText className="h-10 w-10 text-primary" />
              <p className="font-medium text-sm">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-2"
            >
              <FileUp className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Drag & drop a PDF or <span className="text-primary">browse</span>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Metadata Fields */}
      {file && state === "idle" && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="grid gap-4 sm:grid-cols-2"
        >
          <div className="space-y-2">
            <Label htmlFor="competitionName">Competition Name (optional)</Label>
            <Input
              id="competitionName"
              placeholder="e.g. IDF Winter Championships"
              value={competitionName}
              onChange={(e) => setCompetitionName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="eventType">Event Type</Label>
            <select
              id="eventType"
              value={eventType}
              onChange={(e) => setEventType(e.target.value as DivingHeight)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {DIVING_HEIGHTS.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>
        </motion.div>
      )}

      {/* Status Display */}
      <AnimatePresence>
        {state === "polling" && jobStatus && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-lg border bg-muted/50 p-4"
          >
            <div className="flex items-center gap-3 mb-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="font-medium">Processing OCR...</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Status:</span>{" "}
                <span className="capitalize">{jobStatus.status}</span>
              </div>
              {jobStatus.divesExtracted !== undefined && (
                <div>
                  <span className="text-muted-foreground">Dives:</span> {jobStatus.divesExtracted}
                </div>
              )}
              {jobStatus.confidence !== undefined && (
                <div>
                  <span className="text-muted-foreground">Confidence:</span>{" "}
                  {(jobStatus.confidence * 100).toFixed(0)}%
                </div>
              )}
              {jobStatus.competitionName && (
                <div className="col-span-2 truncate">
                  <span className="text-muted-foreground">Competition:</span> {jobStatus.competitionName}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {state === "completed" && jobStatus && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-lg border border-green-500/30 bg-green-500/10 p-4"
          >
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="font-medium text-green-700 dark:text-green-400">OCR Complete!</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm mb-4">
              <div>
                <span className="text-muted-foreground">Dives Extracted:</span>{" "}
                <span className="font-medium">{jobStatus.divesExtracted}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Confidence:</span>{" "}
                <span className="font-medium">{(jobStatus.confidence! * 100).toFixed(0)}%</span>
              </div>
              {jobStatus.competitionName && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Competition:</span>{" "}
                  <span className="font-medium">{jobStatus.competitionName}</span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={handleImport} className="flex-1">
                Import to Database
              </Button>
              <Button variant="outline" onClick={reset}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 text-sm text-red-500"
        >
          <AlertTriangle className="h-4 w-4" />
          {error}
        </motion.div>
      )}

      {/* Action Buttons */}
      {file && state === "idle" && (
        <div className="flex gap-2">
          <Button onClick={handleUpload} className="flex-1">
            <Upload className="h-4 w-4 mr-2" /> Upload & Process
          </Button>
          <Button variant="outline" onClick={reset}>
            Cancel
          </Button>
        </div>
      )}

      {state === "uploading" && (
        <Button disabled className="w-full">
          <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...
        </Button>
      )}

      {state === "failed" && (
        <Button variant="outline" onClick={reset} className="w-full">
          Try Again
        </Button>
      )}
    </div>
  )
}
