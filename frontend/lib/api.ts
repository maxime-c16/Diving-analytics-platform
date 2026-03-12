const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';
const COMPUTE_API = process.env.NEXT_PUBLIC_COMPUTE_URL || '/compute';

export type DivingHeight = '1m' | '3m' | '5m' | '7.5m' | '10m';

export const DIVING_HEIGHTS: DivingHeight[] = ['1m', '3m', '5m', '7.5m', '10m'];
export const SPRINGBOARD_HEIGHTS: DivingHeight[] = ['1m', '3m'];
export const PLATFORM_HEIGHTS: DivingHeight[] = ['5m', '7.5m', '10m'];

export interface CalculateScoreRequest {
  diveCode: string;
  height: DivingHeight;
  judgeScores: number[];
}

export interface ScoreResult {
  diveCode: string;
  height: DivingHeight;
  difficulty: number;
  judgeScores: number[];
  droppedScores: number[];
  effectiveScores: number[];
  rawScore: number;
  finalScore: number;
}

export interface BatchScoreRequest {
  dives: CalculateScoreRequest[];
}

export interface BatchScoreResult {
  results: ScoreResult[];
  total: number;
}

export interface StatisticsRequest {
  scores: number[];
}

export interface StatisticsResult {
  count: number;
  mean: number;
  median: number;
  std: number;
  variance: number;
  min: number;
  max: number;
  range: number;
  q1: number;
  q3: number;
  iqr: number;
  skewness: number;
  kurtosis: number;
  percentiles: Record<string, number>;
}

export interface JudgeConsistencyRequest {
  dives: { judgeScores: number[] }[];
}

export interface JudgeStats {
  judgeIndex: number;
  mean: number;
  std: number;
  min: number;
  max: number;
  consistency: 'high' | 'medium' | 'low';
}

export interface JudgeConsistencyResult {
  judges: JudgeStats[];
  overallStd: number;
  numDives: number;
  consistency: 'high' | 'medium' | 'low';
}

export interface JudgeStatsResult {
  judges: {
    judgeIndex: number;
    judge: string;
    mean: number;
    std: number;
    min: number;
    max: number;
    diveCount: number;
    consistency: 'high' | 'medium' | 'low';
  }[];
  overallConsistency: 'high' | 'medium' | 'low';
}

class ApiClient {
  private async fetch<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Health checks
  async getHealth() {
    return this.fetch<{ status: string; timestamp: string }>(`${API_BASE}/health`);
  }

  async getScoresHealth() {
    return this.fetch<{ status: string; service: string; features: string[] }>(`${API_BASE}/scores/health`);
  }

  // Score calculation
  async calculateScore(request: CalculateScoreRequest): Promise<ScoreResult> {
    return this.fetch<ScoreResult>(`${API_BASE}/scores/calculate`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async calculateBatch(request: BatchScoreRequest): Promise<BatchScoreResult> {
    return this.fetch<BatchScoreResult>(`${API_BASE}/scores/batch`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async calculateTotal(dives: CalculateScoreRequest[]): Promise<{
    dives: ScoreResult[];
    totalScore: number;
    numDives: number;
  }> {
    return this.fetch(`${API_BASE}/scores/calculate-total`, {
      method: 'POST',
      body: JSON.stringify(dives),
    });
  }

  // Analytics (compute engine)
  async getStatistics(request: StatisticsRequest): Promise<StatisticsResult> {
    return this.fetch<StatisticsResult>(`${COMPUTE_API}/analytics/statistics`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getJudgeConsistency(request: JudgeConsistencyRequest): Promise<JudgeConsistencyResult> {
    return this.fetch<JudgeConsistencyResult>(`${COMPUTE_API}/analytics/judge-consistency`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async predictScore(historicalScores: number[], difficulty: number) {
    return this.fetch<{
      predictedScore: number;
      confidence: number;
      lowerBound: number;
      upperBound: number;
      trend: string;
    }>(`${COMPUTE_API}/analytics/predict-score`, {
      method: 'POST',
      body: JSON.stringify({ historicalScores, difficulty }),
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Ingestion API
  // ─────────────────────────────────────────────────────────────────────────────

  async getIngestionLogs(params?: { status?: string; limit?: number; offset?: number }) {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    const qs = query.toString();
    return this.fetch<{ data: IngestionLog[]; total: number }>(
      `${API_BASE}/ingestion/logs${qs ? `?${qs}` : ''}`
    );
  }

  async getIngestionStatus(id: string) {
    return this.fetch<IngestionLog>(`${API_BASE}/ingestion/status/${id}`);
  }

  async getIngestionErrors(id: string) {
    return this.fetch<{ errors: RowError[] }>(`${API_BASE}/ingestion/status/${id}/errors`);
  }

  // PDF OCR endpoints
  async uploadPdf(file: File, metadata?: { competitionName?: string; eventType?: DivingHeight }) {
    const formData = new FormData();
    formData.append('file', file);
    if (metadata?.competitionName) formData.append('competitionName', metadata.competitionName);
    if (metadata?.eventType) formData.append('eventType', metadata.eventType);

    const response = await fetch(`${API_BASE}/ingestion/upload/pdf`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(err.message || `HTTP ${response.status}`);
    }
    return response.json() as Promise<{ success: boolean; jobId: string; statusUrl: string }>;
  }

  async getPdfJobStatus(jobId: string) {
    return this.fetch<PdfJobStatus>(`${API_BASE}/ingestion/pdf/status/${jobId}`);
  }

  async importPdfJob(jobId: string, overrides?: { competitionName?: string; eventType?: string }) {
    return this.fetch<{ success: boolean; message: string; data: IngestionLog }>(
      `${API_BASE}/ingestion/pdf/import/${jobId}`,
      {
        method: 'POST',
        body: JSON.stringify(overrides || {}),
      }
    );
  }

  // Update extracted dives before import
  async updateExtractedDives(jobId: string, dives: ExtractedDive[]) {
    return this.fetch<{ success: boolean; message: string }>(
      `${API_BASE}/ingestion/pdf/update/${jobId}`,
      {
        method: 'PUT',
        body: JSON.stringify({ dives }),
      }
    );
  }

  // Update dive in database after import
  async updateDive(diveId: number, updates: Partial<{
    athleteName: string;
    diveCode: string;
    roundNumber: number;
    judgeScores: number[];
    difficulty: number;
    finalScore: number;
  }>) {
    return this.fetch<{ success: boolean; message: string }>(
      `${API_BASE}/ingestion/dive/${diveId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }
    );
  }

  // Delete a dive from the database
  async deleteDive(diveId: number) {
    return this.fetch<{ success: boolean; message: string; deletedId: number }>(
      `${API_BASE}/ingestion/dive/${diveId}`,
      {
        method: 'DELETE',
      }
    );
  }

  // Delete a competition and all its dives
  async deleteCompetition(competitionId: number) {
    return this.fetch<{ success: boolean; message: string; deletedId: number }>(
      `${API_BASE}/ingestion/competition/${competitionId}`,
      {
        method: 'DELETE',
      }
    );
  }

  // Update an athlete's details
  async updateAthlete(athleteId: number, updates: Partial<{ name: string; country: string }>) {
    return this.fetch<{ success: boolean; message: string }>(
      `${API_BASE}/ingestion/athlete/${athleteId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }
    );
  }

  // Get judge consistency statistics for a competition
  async getJudgeStats(competitionId: string) {
    return this.fetch<JudgeStatsResult>(`${API_BASE}/ingestion/competition/${competitionId}/judge-stats`);
  }

  // CSV upload
  async uploadCsv(
    file: File,
    metadata: { competitionName: string; eventType: DivingHeight; competitionDate?: string; location?: string }
  ) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('competitionName', metadata.competitionName);
    formData.append('eventType', metadata.eventType);
    if (metadata.competitionDate) formData.append('competitionDate', metadata.competitionDate);
    if (metadata.location) formData.append('location', metadata.location);

    const response = await fetch(`${API_BASE}/ingestion/upload/csv`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(err.message || `HTTP ${response.status}`);
    }
    return response.json() as Promise<{ success: boolean; message: string; data: IngestionLog }>;
  }

  // Get competition data with dives
  async getCompetitionData(id: string) {
    return this.fetch<CompetitionData>(`${API_BASE}/ingestion/competition/${id}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Ingestion Types
// ─────────────────────────────────────────────────────────────────────────────

export type IngestionStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'partial';

export interface IngestionLog {
  id: string;
  fileName: string;
  fileType: 'csv' | 'pdf' | 'json';
  status: IngestionStatus;
  totalRows: number;
  processedRows: number;
  failedRows: number;
  errorMessage?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  competitionId?: number;
  confidence?: number;  // OCR extraction confidence score (0.0 - 1.0)
  competitionName?: string;
  location?: string;
  eventType?: string;
  athleteCount?: number;
  diveCount?: number;
  averageScore?: number;
}

export interface RowError {
  row: number;
  error: string;
  data?: Record<string, unknown>;
}

export interface PdfJobStatus {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  message?: string;
  confidence?: number;
  competitionName?: string;
  eventType?: string;
  divesExtracted?: number;
  errors?: string[];
  dives?: ExtractedDive[];
  // Multi-height support
  detectedHeights?: DivingHeight[];
  eventsDetected?: string[];
  hasMultipleHeights?: boolean;
  // Progress tracking
  phase?: 'starting' | 'converting' | 'ocr' | 'parsing' | 'complete';
  currentPage?: number;
  totalPages?: number;
  progress?: number; // 0-100 percentage
}

export interface ExtractedDive {
  athlete_name: string;
  dive_code: string;
  round_number: number;
  judgeScores?: number[];  // Standardized: camelCase 'judgeScores' across all layers
  difficulty?: number;
  final_score?: number;
  rank?: number;
  country?: string;
  event_name?: string;
  height?: DivingHeight;  // Per-dive height detection
}

// ─────────────────────────────────────────────────────────────────────────────
// Competition Data Types
// ─────────────────────────────────────────────────────────────────────────────

export interface CompetitionData {
  competition: {
    id: number;
    name: string;
    date?: string;
    location?: string;
    eventType?: string;
  };
  eventNames: string[];  // List of distinct event names (e.g., "Elite - Dames - 3m")
  hasMultipleEvents: boolean;  // True if competition has multiple events
  statistics: {
    totalDives: number;
    totalAthletes: number;
    averageScore: number;
    highestScore: number;
    lowestScore: number;
    rounds: number;
  };
  athletes: AthleteResult[];
  rounds: RoundData[];
  // Per-event data (only present if hasMultipleEvents)
  events?: Record<string, {
    statistics: CompetitionData['statistics'];
    athletes: AthleteResult[];
    rounds: RoundData[];
  }>;
}

export interface AthleteResult {
  rank: number;
  athlete: {
    id: number;
    name: string;
    country?: string;
  };
  totalScore: number;
  averageScore: number;
  diveCount: number;
  dives: DiveResult[];
}

export interface DiveResult {
  id: number;
  roundNumber: number;
  diveCode: string;
  difficulty: number;
  judgeScores?: number[];
  finalScore: number;
  rank?: number;
  eventName?: string;  // Event this dive belongs to
}

export interface RoundData {
  roundNumber: number;
  diveCount: number;
  averageScore: number;
  highestScore: number;
  dives: {
    id: number;
    athleteName: string;
    athleteCountry?: string;
    diveCode: string;
    difficulty: number;
    judgeScores?: number[];
    finalScore: number;
    rank?: number;
    eventName?: string;  // Event this dive belongs to
  }[];
}

export const api = new ApiClient();
