export type DivingEventType = "individual" | "synchro";

export type ScoreBucket = {
  id: string;
  label: string;
  scores: number[];
  droppedIndexes: number[];
  keptIndexes: number[];
};

export type DiveRuleApplication =
  | {
      supported: true;
      eventType: DivingEventType;
      judgePanelSize: 5 | 7 | 9 | 11;
      formulaLabel: string;
      difficulty: number | null;
      keptSum: number;
      computedScore: number | null;
      totalJudges: number;
      buckets: ScoreBucket[];
    }
  | {
      supported: false;
      eventType: DivingEventType;
      reason: string;
      difficulty: number | null;
      totalJudges: number;
      buckets: ScoreBucket[];
    };

type ApplyRuleInput = {
  eventType: DivingEventType;
  difficulty: number | null;
  judgeScores?: number[];
  executionScores?: number[];
  synchronizationScores?: number[];
};

function roundScore(value: number) {
  return Number(value.toFixed(2));
}

function normalizeScores(scores?: number[]) {
  return (scores || []).filter((score) => typeof score === "number" && !Number.isNaN(score));
}

function pickDroppedIndexes(scores: number[], lowestCount: number, highestCount: number) {
  const ascending = scores.map((score, index) => ({ score, index }));
  ascending.sort((left, right) => {
    if (left.score !== right.score) {
      return left.score - right.score;
    }
    return left.index - right.index;
  });

  const dropped = new Set<number>();

  for (let offset = 0; offset < lowestCount && offset < ascending.length; offset += 1) {
    dropped.add(ascending[offset].index);
  }

  for (let offset = 0; offset < highestCount && offset < ascending.length; offset += 1) {
    const candidate = ascending[ascending.length - 1 - offset];
    if (candidate) {
      dropped.add(candidate.index);
    }
  }

  return Array.from(dropped).sort((left, right) => left - right);
}

function buildBucket(
  id: string,
  label: string,
  scores: number[],
  lowestCount: number,
  highestCount: number,
): ScoreBucket {
  const droppedIndexes = pickDroppedIndexes(scores, lowestCount, highestCount);
  const droppedIndexSet = new Set(droppedIndexes);
  const keptIndexes = scores
    .map((_, index) => index)
    .filter((index) => !droppedIndexSet.has(index));

  return {
    id,
    label,
    scores,
    droppedIndexes,
    keptIndexes,
  };
}

function keptSum(bucket: ScoreBucket) {
  return bucket.keptIndexes.reduce((sum, index) => sum + bucket.scores[index], 0);
}

export function applyDivingRules(input: ApplyRuleInput): DiveRuleApplication {
  const difficulty = typeof input.difficulty === "number" ? input.difficulty : null;

  if (input.eventType === "individual") {
    const scores = normalizeScores(input.judgeScores);
    if (scores.length === 5) {
      const bucket = buildBucket("awards", "Awards", scores, 1, 1);
      const kept = keptSum(bucket);
      return {
        supported: true,
        eventType: "individual",
        judgePanelSize: 5,
        formulaLabel: "Drop 1 highest and 1 lowest, keep 3, multiply by DD",
        difficulty,
        keptSum: roundScore(kept),
        computedScore: difficulty !== null ? roundScore(kept * difficulty) : null,
        totalJudges: scores.length,
        buckets: [bucket],
      };
    }

    if (scores.length === 7) {
      const bucket = buildBucket("awards", "Awards", scores, 2, 2);
      const kept = keptSum(bucket);
      return {
        supported: true,
        eventType: "individual",
        judgePanelSize: 7,
        formulaLabel: "Drop 2 highest and 2 lowest, keep 3, multiply by DD",
        difficulty,
        keptSum: roundScore(kept),
        computedScore: difficulty !== null ? roundScore(kept * difficulty) : null,
        totalJudges: scores.length,
        buckets: [bucket],
      };
    }

    return {
      supported: false,
      eventType: "individual",
      reason: `Unsupported individual judge panel size: ${scores.length}`,
      difficulty,
      totalJudges: scores.length,
      buckets: scores.length ? [{ id: "awards", label: "Awards", scores, droppedIndexes: [], keptIndexes: scores.map((_, index) => index) }] : [],
    };
  }

  const executionScores = normalizeScores(input.executionScores);
  const synchronizationScores = normalizeScores(input.synchronizationScores);

  if (executionScores.length === 4 && synchronizationScores.length === 5) {
    const execution = buildBucket("execution", "Execution", executionScores, 1, 1);
    const synchronization = buildBucket("synchronization", "Synchronization", synchronizationScores, 1, 1);
    const kept = keptSum(execution) + keptSum(synchronization);
    return {
      supported: true,
      eventType: "synchro",
      judgePanelSize: 9,
      formulaLabel: "Drop high and low from execution and synchronization, then ((sum / 5) * 3) * DD",
      difficulty,
      keptSum: roundScore(kept),
      computedScore: difficulty !== null ? roundScore((kept / 5) * 3 * difficulty) : null,
      totalJudges: executionScores.length + synchronizationScores.length,
      buckets: [execution, synchronization],
    };
  }

  if (executionScores.length === 6 && synchronizationScores.length === 5) {
    const executionA = buildBucket("execution-a", "Execution Diver A", executionScores.slice(0, 3), 1, 1);
    const executionB = buildBucket("execution-b", "Execution Diver B", executionScores.slice(3), 1, 1);
    const synchronization = buildBucket("synchronization", "Synchronization", synchronizationScores, 1, 1);
    const kept = keptSum(executionA) + keptSum(executionB) + keptSum(synchronization);
    return {
      supported: true,
      eventType: "synchro",
      judgePanelSize: 11,
      formulaLabel: "Drop high and low in both execution triplets and synchronization, then ((sum / 5) * 3) * DD",
      difficulty,
      keptSum: roundScore(kept),
      computedScore: difficulty !== null ? roundScore((kept / 5) * 3 * difficulty) : null,
      totalJudges: executionScores.length + synchronizationScores.length,
      buckets: [executionA, executionB, synchronization],
    };
  }

  return {
    supported: false,
    eventType: "synchro",
    reason: `Unsupported synchro panel shape: execution=${executionScores.length}, synchronization=${synchronizationScores.length}`,
    difficulty,
    totalJudges: executionScores.length + synchronizationScores.length,
    buckets: [
      {
        id: "execution",
        label: "Execution",
        scores: executionScores,
        droppedIndexes: [],
        keptIndexes: executionScores.map((_, index) => index),
      },
      {
        id: "synchronization",
        label: "Synchronization",
        scores: synchronizationScores,
        droppedIndexes: [],
        keptIndexes: synchronizationScores.map((_, index) => index),
      },
    ].filter((bucket) => bucket.scores.length > 0),
  };
}
