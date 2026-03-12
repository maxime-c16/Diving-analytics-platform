import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatScore(score: number): string {
  return score.toFixed(1)
}

export function getScoreClass(score: number): string {
  if (score >= 8.0) return "score-excellent"
  if (score >= 6.5) return "score-good"
  if (score >= 5.0) return "score-average"
  return "score-poor"
}

export function getDifficultyColor(difficulty: number): string {
  if (difficulty >= 3.0) return "text-red-500"
  if (difficulty >= 2.5) return "text-orange-500"
  if (difficulty >= 2.0) return "text-yellow-500"
  return "text-green-500"
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export function calculateRank(scores: number[]): number {
  return scores.reduce((a, b) => a + b, 0)
}
