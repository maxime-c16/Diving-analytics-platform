import { applyDivingRules, type DivingEventType } from "../../../../packages/diving-rules";

type ScoreNotesProps = {
  eventType: DivingEventType;
  difficulty: number | null;
  judgeScores?: number[];
  executionScores?: number[];
  synchronizationScores?: number[];
  finalScore?: number | null;
  compact?: boolean;
};

function formatScore(value: number | null | undefined) {
  if (typeof value !== "number") {
    return "n/a";
  }
  return value.toFixed(2).replace(/\.00$/, "");
}

export function ScoreNotes(props: ScoreNotesProps) {
  const breakdown = applyDivingRules({
    eventType: props.eventType,
    difficulty: props.difficulty,
    judgeScores: props.judgeScores,
    executionScores: props.executionScores,
    synchronizationScores: props.synchronizationScores,
  });

  const scoreDelta =
    breakdown.supported &&
    typeof props.finalScore === "number" &&
    typeof breakdown.computedScore === "number"
      ? Math.abs(props.finalScore - breakdown.computedScore)
      : null;

  return (
    <div className={`score-notes${props.compact ? " compact" : ""}`}>
      <div className="score-notes-head">
        <span className="score-rule-chip">
          {breakdown.supported
            ? `${breakdown.eventType} · ${breakdown.judgePanelSize}J`
            : `${breakdown.eventType} · unsupported`}
        </span>
        {breakdown.supported ? (
          <span className="score-rule-meta">
            kept {formatScore(breakdown.keptSum)} · official {formatScore(breakdown.computedScore)}
          </span>
        ) : (
          <span className="score-rule-meta">{breakdown.reason}</span>
        )}
      </div>

      <div className="score-buckets">
        {breakdown.buckets.map((bucket) => (
          <div className="score-bucket" key={bucket.id}>
            <div className="score-bucket-label">{bucket.label}</div>
            <div className="score-chip-row">
              {bucket.scores.map((score, index) => (
                <span
                  className={`score-chip ${bucket.droppedIndexes.includes(index) ? "dropped" : "kept"}`}
                  key={`${bucket.id}-${index}-${score}`}
                >
                  {formatScore(score)}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="score-rule-foot">
        <span>{breakdown.supported ? breakdown.formulaLabel : "No official rule available for this panel shape in-app."}</span>
        {scoreDelta !== null ? (
          <span className={scoreDelta > 0.05 ? "score-variance warning" : "score-variance ok"}>
            live {formatScore(props.finalScore)} · delta {formatScore(scoreDelta)}
          </span>
        ) : null}
      </div>
    </div>
  );
}
