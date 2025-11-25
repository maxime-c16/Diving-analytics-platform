const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api';
const COMPUTE_API = process.env.NEXT_PUBLIC_COMPUTE_URL || 'http://localhost:5001';

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
}

export const api = new ApiClient();
