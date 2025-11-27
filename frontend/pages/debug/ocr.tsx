"use client"

import React, { useState, useCallback, useEffect } from "react"
import Head from "next/head"
import Link from "next/link"
import { useRouter } from "next/router"
import {
  FileText,
  RefreshCw,
  Upload,
  Bug,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui"
import { Button } from "@/components/ui"
import { GradientText } from "@/components/aceternity"
import { OcrDebugViewer } from "@/components/ocr-debug-viewer"
import { api, type PdfJobStatus, type ExtractedDive } from "@/lib/api"

export default function OcrDebugPage() {
  const router = useRouter()
  const { jobId } = router.query
  
  const [jobStatus, setJobStatus] = useState<PdfJobStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [uploadingPdf, setUploadingPdf] = useState(false)
  const [pollingJobId, setPollingJobId] = useState<string | null>(null)

  // Fetch job status
  const fetchJobStatus = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const status = await api.getPdfJobStatus(id)
      setJobStatus(status)
      return status
    } catch (err: any) {
      setError(err.message || "Failed to fetch job status")
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  // Load job status from URL parameter
  useEffect(() => {
    if (jobId && typeof jobId === "string") {
      fetchJobStatus(jobId)
    }
  }, [jobId, fetchJobStatus])

  // Poll for job status while processing
  useEffect(() => {
    if (!pollingJobId) return

    const interval = setInterval(async () => {
      const status = await fetchJobStatus(pollingJobId)
      if (status && (status.status === "completed" || status.status === "failed")) {
        setPollingJobId(null)
        // Update URL with job ID
        router.replace(`/debug/ocr?jobId=${pollingJobId}`, undefined, { shallow: true })
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [pollingJobId, fetchJobStatus, router])

  // Handle PDF file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type === "application/pdf") {
      setPdfFile(file)
      // Create object URL for PDF preview
      if (pdfUrl) URL.revokeObjectURL(pdfUrl)
      setPdfUrl(URL.createObjectURL(file))
      // Reset job status when new file is selected
      setJobStatus(null)
      setError(null)
    }
  }

  // Handle PDF upload and processing
  const handleUpload = async () => {
    if (!pdfFile) return
    
    setUploadingPdf(true)
    setError(null)
    
    try {
      const result = await api.uploadPdf(pdfFile)
      setPollingJobId(result.jobId)
      fetchJobStatus(result.jobId)
    } catch (err: any) {
      setError(err.message || "Upload failed")
    } finally {
      setUploadingPdf(false)
    }
  }

  // Cleanup object URL on unmount
  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl)
    }
  }, [pdfUrl])

  // Handle saving all changes to extracted dives
  const handleSaveAllChanges = useCallback(async (dives: ExtractedDive[]) => {
    if (!jobStatus?.jobId && !pollingJobId && !jobId) {
      setError("No job ID available")
      return
    }
    
    const currentJobId = jobStatus?.jobId || pollingJobId || (jobId as string)
    
    try {
      await api.updateExtractedDives(currentJobId, dives)
      // Refresh job status to reflect changes
      await fetchJobStatus(currentJobId)
    } catch (err: any) {
      setError(err.message || "Failed to save changes")
      throw err
    }
  }, [jobStatus?.jobId, pollingJobId, jobId, fetchJobStatus])

  const isProcessing = jobStatus?.status === "processing" || jobStatus?.status === "queued" || !!pollingJobId

  return (
    <>
      <Head>
        <title>OCR Debug View | Diving Analytics</title>
      </Head>
      
      <main className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-lg">
          <div className="container mx-auto flex h-16 items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl">
              <span className="text-primary">🤿</span>
              <GradientText>Diving Analytics</GradientText>
            </Link>
            <div className="flex items-center gap-2">
              <Link href="/competitions">
                <Button variant="ghost" size="sm">Competitions</Button>
              </Link>
              <Button variant="outline" size="sm" className="gap-1">
                <Bug className="h-4 w-4" /> Debug Mode
              </Button>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <Link href="/" className="hover:text-foreground">Home</Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground">OCR Debug</span>
          </div>

          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
                <Bug className="h-8 w-8 text-primary" />
                <GradientText>OCR Debug View</GradientText>
              </h1>
              <p className="text-muted-foreground mt-2">
                Inspect OCR extraction results with low confidence highlighting
              </p>
            </div>
          </div>

          {/* Two-column layout: PDF preview + Debug results */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Left: PDF Upload/Preview */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" /> PDF Document
                  </CardTitle>
                  <CardDescription>
                    Upload a PDF to analyze or view an existing job
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* File Input */}
                  <div className="border-2 border-dashed rounded-lg p-6 text-center">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="pdf-input"
                    />
                    <label htmlFor="pdf-input" className="cursor-pointer">
                      {pdfFile ? (
                        <div className="flex flex-col items-center gap-2">
                          <FileText className="h-10 w-10 text-primary" />
                          <p className="font-medium">{pdfFile.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                          <Button variant="outline" size="sm" className="mt-2" asChild>
                            <span>Change File</span>
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <Upload className="h-10 w-10 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            Click to select a PDF file
                          </p>
                        </div>
                      )}
                    </label>
                  </div>

                  {/* Upload Button */}
                  {pdfFile && !jobStatus && !pollingJobId && (
                    <Button 
                      onClick={handleUpload} 
                      disabled={uploadingPdf}
                      className="w-full"
                    >
                      {uploadingPdf ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" /> Process PDF
                        </>
                      )}
                    </Button>
                  )}

                  {/* Processing Status */}
                  {isProcessing && (
                    <div className="flex items-center gap-3 p-4 bg-blue-500/10 rounded-lg">
                      <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                      <div>
                        <p className="font-medium text-blue-700 dark:text-blue-300">Processing OCR...</p>
                        <p className="text-xs text-muted-foreground">
                          This may take a few moments
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Job Completed */}
                  {jobStatus?.status === "completed" && (
                    <div className="flex items-center gap-3 p-4 bg-green-500/10 rounded-lg">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="font-medium text-green-700 dark:text-green-300">OCR Complete</p>
                        <p className="text-xs text-muted-foreground">
                          {jobStatus.divesExtracted} dives extracted with {((jobStatus.confidence ?? 0) * 100).toFixed(0)}% confidence
                        </p>
                      </div>
                    </div>
                  )}

                  {/* PDF Preview */}
                  {pdfUrl && (
                    <div className="border rounded-lg overflow-hidden bg-muted/50">
                      <div className="p-2 bg-muted border-b text-xs font-medium text-muted-foreground">
                        PDF Preview
                      </div>
                      <div className="aspect-[3/4] bg-white">
                        <iframe
                          src={`${pdfUrl}#toolbar=0&navpanes=0`}
                          className="w-full h-full"
                          title="PDF Preview"
                        />
                      </div>
                    </div>
                  )}

                  {/* Job ID Input for existing jobs */}
                  {!pdfFile && (
                    <div className="pt-4 border-t">
                      <p className="text-sm text-muted-foreground mb-2">
                        Or enter an existing job ID:
                      </p>
                      <form 
                        onSubmit={(e) => {
                          e.preventDefault()
                          const formData = new FormData(e.currentTarget)
                          const id = formData.get("jobId") as string
                          if (id) {
                            router.push(`/debug/ocr?jobId=${id}`)
                          }
                        }}
                        className="flex gap-2"
                      >
                        <input
                          name="jobId"
                          placeholder="pdf-xxxxxxxx-xxxx-xxxx"
                          defaultValue={jobId as string}
                          className="flex-1 px-3 py-2 text-sm border rounded-md bg-background"
                        />
                        <Button type="submit" variant="outline" size="sm">
                          Load
                        </Button>
                      </form>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right: Debug Results */}
            <div className="space-y-4">
              {error && (
                <Card className="border-red-500/30">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-2 text-red-500">
                      <AlertCircle className="h-5 w-5" />
                      <span>{error}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {loading && !jobStatus && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
                    <p className="text-muted-foreground">Loading job status...</p>
                  </CardContent>
                </Card>
              )}

              {!jobStatus && !loading && !error && (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <Bug className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">No OCR results to display</p>
                    <p className="text-sm mt-1">
                      Upload a PDF or enter a job ID to see debug information
                    </p>
                  </CardContent>
                </Card>
              )}

              {jobStatus && jobStatus.status !== "queued" && jobStatus.status !== "processing" && (
                <OcrDebugViewer 
                  jobStatus={jobStatus}
                  editable={true}
                  onSaveAllChanges={handleSaveAllChanges}
                />
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
