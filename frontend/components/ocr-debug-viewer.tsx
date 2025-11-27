"use client"

import React, { useState, useMemo, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  FileText,
  Layers,
  Target,
  User,
  Hash,
  Award,
  Edit3,
  Save,
  X,
  Loader2,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui"
import { Button, Input, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui"
import { cn } from "@/lib/utils"
import type { PdfJobStatus, ExtractedDive } from "@/lib/api"

interface OcrDebugViewerProps {
  jobStatus: PdfJobStatus
  rawOcrText?: string
  pdfUrl?: string
  onDiveUpdate?: (index: number, updatedDive: ExtractedDive) => Promise<void>
  onSaveAllChanges?: (dives: ExtractedDive[]) => Promise<void>
  editable?: boolean
}

// Confidence thresholds
const CONFIDENCE_HIGH = 0.85
const CONFIDENCE_MEDIUM = 0.7

// Field validation status
type ValidationStatus = "valid" | "warning" | "error" | "unknown"

interface DiveValidation {
  dive: ExtractedDive
  index: number
  status: ValidationStatus
  issues: string[]
  fieldStatus: {
    athleteName: ValidationStatus
    diveCode: ValidationStatus
    judgeScores: ValidationStatus
    difficulty: ValidationStatus
    finalScore: ValidationStatus
    roundNumber: ValidationStatus
  }
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= CONFIDENCE_HIGH) return "text-green-500"
  if (confidence >= CONFIDENCE_MEDIUM) return "text-yellow-500"
  return "text-red-500"
}

function getConfidenceBgColor(confidence: number): string {
  if (confidence >= CONFIDENCE_HIGH) return "bg-green-500/10 border-green-500/30"
  if (confidence >= CONFIDENCE_MEDIUM) return "bg-yellow-500/10 border-yellow-500/30"
  return "bg-red-500/10 border-red-500/30"
}

function getStatusColor(status: ValidationStatus): string {
  switch (status) {
    case "valid": return "text-green-500"
    case "warning": return "text-yellow-500"
    case "error": return "text-red-500"
    default: return "text-muted-foreground"
  }
}

function getStatusBgColor(status: ValidationStatus): string {
  switch (status) {
    case "valid": return "bg-green-500/10"
    case "warning": return "bg-yellow-500/10"
    case "error": return "bg-red-500/10"
    default: return "bg-muted/50"
  }
}

function getStatusIcon(status: ValidationStatus) {
  switch (status) {
    case "valid": return <CheckCircle2 className="h-4 w-4 text-green-500" />
    case "warning": return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    case "error": return <AlertCircle className="h-4 w-4 text-red-500" />
    default: return <AlertCircle className="h-4 w-4 text-muted-foreground" />
  }
}

// Validate a single dive and return issues
function validateDive(dive: ExtractedDive, index: number): DiveValidation {
  const issues: string[] = []
  const fieldStatus: DiveValidation["fieldStatus"] = {
    athleteName: "valid",
    diveCode: "valid",
    judgeScores: "valid",
    difficulty: "valid",
    finalScore: "valid",
    roundNumber: "valid",
  }

  // Validate athlete name
  if (!dive.athlete_name || dive.athlete_name.trim() === "") {
    issues.push("Missing athlete name")
    fieldStatus.athleteName = "error"
  } else if (dive.athlete_name === "Unknown" || dive.athlete_name === "Unknown Athlete") {
    issues.push("Athlete name not detected")
    fieldStatus.athleteName = "warning"
  }

  // Validate dive code - must match pattern [1-6]XX[X][A-D]
  const diveCodePattern = /^[1-6]\d{2,3}[A-Da-d]$/
  if (!dive.dive_code) {
    issues.push("Missing dive code")
    fieldStatus.diveCode = "error"
  } else if (!diveCodePattern.test(dive.dive_code)) {
    issues.push(`Invalid dive code format: ${dive.dive_code}`)
    fieldStatus.diveCode = "error"
  }

  // Validate judge scores
  if (!dive.judge_scores || dive.judge_scores.length === 0) {
    issues.push("Missing judge scores")
    fieldStatus.judgeScores = "warning"
  } else {
    // Check count (should be 5-7)
    if (dive.judge_scores.length < 5 || dive.judge_scores.length > 7) {
      issues.push(`Unusual number of judge scores: ${dive.judge_scores.length}`)
      fieldStatus.judgeScores = "warning"
    }
    // Check range (0-10) and 0.5 increment
    for (const score of dive.judge_scores) {
      if (score < 0 || score > 10) {
        issues.push(`Judge score out of range: ${score}`)
        fieldStatus.judgeScores = "error"
        break
      }
      if ((score * 2) !== Math.floor(score * 2)) {
        issues.push(`Judge score not on 0.5 increment: ${score}`)
        fieldStatus.judgeScores = "warning"
        break
      }
    }
  }

  // Validate difficulty (1.0-4.5)
  if (dive.difficulty === undefined || dive.difficulty === null) {
    issues.push("Missing difficulty")
    fieldStatus.difficulty = "warning"
  } else if (dive.difficulty < 1.0 || dive.difficulty > 4.5) {
    issues.push(`Difficulty out of range: ${dive.difficulty}`)
    fieldStatus.difficulty = "error"
  }

  // Validate final score
  if (dive.final_score === undefined || dive.final_score === null) {
    issues.push("Missing final score")
    fieldStatus.finalScore = "warning"
  } else if (dive.final_score < 0 || dive.final_score > 200) {
    issues.push(`Final score out of range: ${dive.final_score}`)
    fieldStatus.finalScore = "error"
  }

  // Validate round number
  if (dive.round_number === undefined || dive.round_number === null) {
    fieldStatus.roundNumber = "warning"
  } else if (dive.round_number < 1 || dive.round_number > 10) {
    issues.push(`Round number unusual: ${dive.round_number}`)
    fieldStatus.roundNumber = "warning"
  }

  // Overall status
  let status: ValidationStatus = "valid"
  if (issues.some(i => i.includes("Missing") || i.includes("Invalid"))) {
    status = "error"
  } else if (issues.length > 0) {
    status = "warning"
  }

  return { dive, index, status, issues, fieldStatus }
}

// Editable field component
function EditableField({ 
  label, 
  value, 
  onChange, 
  type = "text",
  status,
  icon,
  mono,
  editing,
  placeholder
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: "text" | "number"
  status: ValidationStatus
  icon: React.ReactNode
  mono?: boolean
  editing: boolean
  placeholder?: string
}) {
  if (editing) {
    return (
      <div className={cn("p-2 rounded border", getStatusBgColor(status))}>
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
          {icon} {label}
        </div>
        <Input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn("h-7 text-sm", mono && "font-mono")}
          placeholder={placeholder}
        />
      </div>
    )
  }
  
  return (
    <div className={cn("p-2 rounded border", getStatusBgColor(status))}>
      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
        {icon} {label}
      </div>
      <p className={cn("font-medium", mono && "font-mono", getStatusColor(status))}>{value || "—"}</p>
    </div>
  )
}

// Dive row component with expandable details and editing
function DiveDebugRow({ 
  validation, 
  expanded, 
  onToggle,
  onUpdate,
  editable = false,
}: { 
  validation: DiveValidation
  expanded: boolean
  onToggle: () => void
  onUpdate?: (updatedDive: ExtractedDive) => void
  editable?: boolean
}) {
  const { dive, index, status, issues, fieldStatus } = validation
  const [editing, setEditing] = useState(false)
  const [editedDive, setEditedDive] = useState<ExtractedDive>({ ...dive })

  const handleSave = () => {
    if (onUpdate) {
      onUpdate(editedDive)
    }
    setEditing(false)
  }

  const handleCancel = () => {
    setEditedDive({ ...dive })
    setEditing(false)
  }

  const updateField = (field: keyof ExtractedDive, value: string) => {
    setEditedDive(prev => {
      const updated = { ...prev }
      if (field === 'judge_scores') {
        // Parse comma-separated scores
        updated.judge_scores = value.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n))
      } else if (field === 'round_number' || field === 'rank') {
        (updated as any)[field] = parseInt(value) || undefined
      } else if (field === 'difficulty' || field === 'final_score') {
        (updated as any)[field] = parseFloat(value) || undefined
      } else {
        (updated as any)[field] = value
      }
      return updated
    })
  }

  return (
    <div className={cn("border rounded-lg overflow-hidden", getStatusBgColor(status))}>
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          {getStatusIcon(status)}
          <span className="font-medium">Dive #{index + 1}</span>
          <span className="font-mono text-sm bg-muted px-2 py-0.5 rounded">{dive.dive_code || "—"}</span>
          <span className="text-sm text-muted-foreground">{dive.athlete_name || "Unknown"}</span>
        </div>
        <div className="flex items-center gap-2">
          {issues.length > 0 && (
            <span className="text-xs text-muted-foreground">{issues.length} issue{issues.length !== 1 ? "s" : ""}</span>
          )}
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 space-y-4 border-t">
              {/* Edit controls */}
              {editable && (
                <div className="flex items-center justify-end gap-2">
                  {editing ? (
                    <>
                      <Button size="sm" variant="outline" onClick={handleCancel}>
                        <X className="h-3 w-3 mr-1" /> Cancel
                      </Button>
                      <Button size="sm" onClick={handleSave}>
                        <Save className="h-3 w-3 mr-1" /> Save
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                      <Edit3 className="h-3 w-3 mr-1" /> Edit
                    </Button>
                  )}
                </div>
              )}

              {/* Field Details Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <EditableField
                  label="Athlete Name"
                  value={editing ? editedDive.athlete_name : (dive.athlete_name || "")}
                  onChange={(v) => updateField('athlete_name', v)}
                  status={fieldStatus.athleteName}
                  icon={<User className="h-3 w-3" />}
                  editing={editing}
                  placeholder="Enter athlete name"
                />
                <EditableField
                  label="Dive Code"
                  value={editing ? editedDive.dive_code : (dive.dive_code || "")}
                  onChange={(v) => updateField('dive_code', v)}
                  status={fieldStatus.diveCode}
                  icon={<Target className="h-3 w-3" />}
                  mono
                  editing={editing}
                  placeholder="e.g., 101B"
                />
                <EditableField
                  label="Round"
                  value={editing ? (editedDive.round_number?.toString() || "") : (dive.round_number?.toString() || "")}
                  onChange={(v) => updateField('round_number', v)}
                  type="number"
                  status={fieldStatus.roundNumber}
                  icon={<Hash className="h-3 w-3" />}
                  editing={editing}
                  placeholder="1"
                />
                <EditableField
                  label="Difficulty"
                  value={editing ? (editedDive.difficulty?.toString() || "") : (dive.difficulty?.toFixed(1) || "")}
                  onChange={(v) => updateField('difficulty', v)}
                  type="number"
                  status={fieldStatus.difficulty}
                  icon={<Layers className="h-3 w-3" />}
                  editing={editing}
                  placeholder="2.0"
                />
                <EditableField
                  label="Final Score"
                  value={editing ? (editedDive.final_score?.toString() || "") : (dive.final_score?.toFixed(2) || "")}
                  onChange={(v) => updateField('final_score', v)}
                  type="number"
                  status={fieldStatus.finalScore}
                  icon={<Award className="h-3 w-3" />}
                  editing={editing}
                  placeholder="45.00"
                />
                {/* Judge Scores - special handling */}
                <div className={cn("p-2 rounded border", getStatusBgColor(fieldStatus.judgeScores))}>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                    <Eye className="h-3 w-3" /> Judge Scores
                  </div>
                  {editing ? (
                    <Input
                      value={editedDive.judge_scores?.join(', ') || ''}
                      onChange={(e) => updateField('judge_scores', e.target.value)}
                      className="h-7 text-sm font-mono"
                      placeholder="7.0, 7.5, 8.0, 7.5, 7.0"
                    />
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {dive.judge_scores?.map((score, i) => (
                        <span key={i} className="font-mono text-xs bg-muted px-1 py-0.5 rounded">
                          {score.toFixed(1)}
                        </span>
                      )) || <span className="text-muted-foreground">—</span>}
                    </div>
                  )}
                </div>
              </div>

              {/* Additional fields */}
              {(dive.country || dive.event_name || dive.height || dive.rank) && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  {dive.country && <span><span className="text-muted-foreground">Country:</span> {dive.country}</span>}
                  {dive.event_name && <span><span className="text-muted-foreground">Event:</span> {dive.event_name}</span>}
                  {dive.height && <span><span className="text-muted-foreground">Height:</span> {dive.height}</span>}
                  {dive.rank && <span><span className="text-muted-foreground">Rank:</span> {dive.rank}</span>}
                </div>
              )}

              {/* Issues */}
              {issues.length > 0 && (
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Issues:</span>
                  <ul className="space-y-1">
                    {issues.map((issue, i) => (
                      <li key={i} className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Main component
export function OcrDebugViewer({ 
  jobStatus, 
  rawOcrText, 
  pdfUrl,
  onDiveUpdate,
  onSaveAllChanges,
  editable = false,
}: OcrDebugViewerProps) {
  const [expandedDives, setExpandedDives] = useState<Set<number>>(new Set())
  const [showOnlyIssues, setShowOnlyIssues] = useState(false)
  const [activeTab, setActiveTab] = useState("dives")
  const [editedDives, setEditedDives] = useState<ExtractedDive[]>(jobStatus.dives || [])
  const [hasChanges, setHasChanges] = useState(false)
  const [saving, setSaving] = useState(false)

  // Validate all dives (using editedDives if there are changes)
  const validations = useMemo(() => {
    const dives = hasChanges ? editedDives : (jobStatus.dives || [])
    return dives.map((dive, index) => validateDive(dive, index))
  }, [jobStatus.dives, editedDives, hasChanges])

  // Filter validations if showing only issues
  const displayedValidations = useMemo(() => {
    if (showOnlyIssues) {
      return validations.filter(v => v.status !== "valid")
    }
    return validations
  }, [validations, showOnlyIssues])

  // Statistics
  const stats = useMemo(() => {
    const total = validations.length
    const valid = validations.filter(v => v.status === "valid").length
    const warnings = validations.filter(v => v.status === "warning").length
    const errors = validations.filter(v => v.status === "error").length
    return { total, valid, warnings, errors }
  }, [validations])

  const toggleDive = (index: number) => {
    setExpandedDives(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  const expandAll = () => {
    setExpandedDives(new Set(displayedValidations.map((_, i) => validations.indexOf(displayedValidations[i]))))
  }

  const collapseAll = () => {
    setExpandedDives(new Set())
  }

  // Handle individual dive update
  const handleDiveUpdate = useCallback((index: number, updatedDive: ExtractedDive) => {
    setEditedDives(prev => {
      const updated = [...prev]
      updated[index] = updatedDive
      return updated
    })
    setHasChanges(true)
    
    // Call the optional onDiveUpdate callback
    if (onDiveUpdate) {
      onDiveUpdate(index, updatedDive)
    }
  }, [onDiveUpdate])

  // Handle save all changes
  const handleSaveAll = async () => {
    if (!onSaveAllChanges) return
    
    setSaving(true)
    try {
      await onSaveAllChanges(editedDives)
      setHasChanges(false)
    } catch (error) {
      console.error('Failed to save changes:', error)
    } finally {
      setSaving(false)
    }
  }

  const confidence = jobStatus.confidence ?? 0

  return (
    <div className="space-y-6">
      {/* Header with overall confidence */}
      <Card className={cn("border-2", getConfidenceBgColor(confidence))}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                OCR Debug View
              </CardTitle>
              <CardDescription>
                Review extraction results and identify potential issues
              </CardDescription>
            </div>
            <div className="text-right">
              <div className={cn("text-3xl font-bold", getConfidenceColor(confidence))}>
                {(confidence * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-muted-foreground">Overall Confidence</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-xs text-muted-foreground">Total Dives</div>
            </div>
            <div className="text-center p-3 bg-green-500/10 rounded-lg">
              <div className="text-2xl font-bold text-green-500">{stats.valid}</div>
              <div className="text-xs text-muted-foreground">Valid</div>
            </div>
            <div className="text-center p-3 bg-yellow-500/10 rounded-lg">
              <div className="text-2xl font-bold text-yellow-500">{stats.warnings}</div>
              <div className="text-xs text-muted-foreground">Warnings</div>
            </div>
            <div className="text-center p-3 bg-red-500/10 rounded-lg">
              <div className="text-2xl font-bold text-red-500">{stats.errors}</div>
              <div className="text-xs text-muted-foreground">Errors</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for different views */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dives">
            <Target className="h-4 w-4 mr-1" /> Extracted Dives
          </TabsTrigger>
          <TabsTrigger value="metadata">
            <Layers className="h-4 w-4 mr-1" /> Metadata
          </TabsTrigger>
          <TabsTrigger value="raw">
            <FileText className="h-4 w-4 mr-1" /> Raw OCR
          </TabsTrigger>
        </TabsList>

        {/* Dives Tab */}
        <TabsContent value="dives" className="space-y-4">
          {/* Controls */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Button
                variant={showOnlyIssues ? "default" : "outline"}
                size="sm"
                onClick={() => setShowOnlyIssues(!showOnlyIssues)}
                className="gap-1"
              >
                {showOnlyIssues ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                {showOnlyIssues ? "Show All" : "Show Issues Only"}
              </Button>
              <span className="text-sm text-muted-foreground">
                Showing {displayedValidations.length} of {validations.length} dives
              </span>
            </div>
            <div className="flex gap-2">
              {editable && hasChanges && (
                <Button 
                  size="sm" 
                  onClick={handleSaveAll}
                  disabled={saving}
                  className="gap-1"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save All Changes
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={expandAll}>Expand All</Button>
              <Button variant="outline" size="sm" onClick={collapseAll}>Collapse All</Button>
            </div>
          </div>

          {/* Dive List */}
          <div className="space-y-2">
            {displayedValidations.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p className="font-medium">All dives validated successfully!</p>
                  <p className="text-sm">No issues found in the extraction.</p>
                </CardContent>
              </Card>
            ) : (
              displayedValidations.map((validation) => (
                <DiveDebugRow
                  key={validation.index}
                  validation={validation}
                  expanded={expandedDives.has(validation.index)}
                  onToggle={() => toggleDive(validation.index)}
                  editable={editable}
                  onUpdate={(updatedDive) => handleDiveUpdate(validation.index, updatedDive)}
                />
              ))
            )}
          </div>
        </TabsContent>

        {/* Metadata Tab */}
        <TabsContent value="metadata" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Extracted Metadata</CardTitle>
              <CardDescription>Competition and event information detected from the PDF</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-muted-foreground">Competition Name</span>
                <p className="font-medium">{jobStatus.competitionName || "—"}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Event Type</span>
                <p className="font-medium">{jobStatus.eventType || "—"}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Dives Extracted</span>
                <p className="font-medium">{jobStatus.divesExtracted || 0}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Confidence Score</span>
                <p className={cn("font-medium", getConfidenceColor(confidence))}>
                  {(confidence * 100).toFixed(1)}%
                </p>
              </div>
              {jobStatus.detectedHeights && jobStatus.detectedHeights.length > 0 && (
                <div className="col-span-2">
                  <span className="text-sm text-muted-foreground">Detected Heights</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {jobStatus.detectedHeights.map((h, i) => (
                      <span key={i} className="px-2 py-1 bg-primary/10 rounded text-sm font-medium">{h}</span>
                    ))}
                  </div>
                </div>
              )}
              {jobStatus.eventsDetected && jobStatus.eventsDetected.length > 0 && (
                <div className="col-span-2">
                  <span className="text-sm text-muted-foreground">Events Detected</span>
                  <div className="space-y-1 mt-1">
                    {jobStatus.eventsDetected.map((e, i) => (
                      <p key={i} className="text-sm">{e}</p>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Errors if any */}
          {jobStatus.errors && jobStatus.errors.length > 0 && (
            <Card className="border-red-500/30">
              <CardHeader>
                <CardTitle className="text-red-500 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" /> OCR Errors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {jobStatus.errors.map((err, i) => (
                    <li key={i} className="text-sm text-red-500 flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      {err}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Raw OCR Tab */}
        <TabsContent value="raw" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Raw OCR Text</CardTitle>
              <CardDescription>
                The raw text extracted from the PDF via OCR (first 10,000 characters)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {rawOcrText ? (
                <pre className="bg-muted p-4 rounded-lg text-xs font-mono whitespace-pre-wrap overflow-auto max-h-[500px]">
                  {rawOcrText}
                </pre>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Raw OCR text not available. This data is only stored temporarily during processing.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
