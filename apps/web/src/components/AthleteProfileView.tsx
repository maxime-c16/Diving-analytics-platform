import { useEffect, useState } from "react";
import { fetchJson } from "./api";
import { athleteProfileHref, athleteTechniqueHref, clubProfileHref, competitionFocusHref } from "./links";

type AthleteProfile = {
  athlete: {
    id: number;
    name: string;
    birthYear: string | null;
    club: string | null;
    clubs: string[];
    latestClub: string | null;
    competitionCount: number;
    diveCount: number;
    averageDiveScore: number | null;
    bestTotal: number | null;
    latestCompetitionDate: string | null;
    recentFormAverage: number | null;
    mostUsedDiveCode: string | null;
  };
  athleteBrief: {
    latestResult: {
      label: string;
      competitionId: number;
      entryId: number | null;
      eventName: string | null;
      competitionDate: string | null;
      finalTotal: number | null;
      rank: number | null;
    } | null;
    bestEvent: {
      label: string;
      bestTotal: number | null;
      competitionCount: number;
    } | null;
    mostImprovedArea: {
      label: string;
      change: number | null;
    } | null;
    focusForNextTraining: {
      label: string;
      reason: string;
    } | null;
  };
  coachingInsights: {
    strongestFamily: {
      label: string;
      bestDive: number | null;
      bestTotal: number | null;
    } | null;
    mostUsedCode: {
      code: string;
      attempts: number;
    } | null;
    highestCeiling: {
      label: string;
      bestTotal: number | null;
    } | null;
    needsReview: {
      label: string;
      scoreDeviation: number | null;
      averageScore: number | null;
    } | null;
  };
  progression: {
    competitionTotals: Array<{
      competitionId: number;
      competitionName: string;
      competitionDate: string | null;
      finalTotal: number | null;
    }>;
    ranks: Array<{
      competitionId: number;
      competitionName: string;
      competitionDate: string | null;
      rank: number | null;
      finalTotal: number | null;
    }>;
    familyUsage: Array<{
      competitionId: number;
      competitionName: string;
      competitionDate: string | null;
      familyCounts: Record<string, number>;
    }>;
  };
  techniqueSummary: {
    mostReliableGroup: GroupSignal | null;
    highestScoringGroup: GroupSignal | null;
    highestDifficultyGroup: GroupSignal | null;
    lowSampleGroups: string[];
    groupsNotUsedRecently: string[];
    groups: GroupSignal[];
  };
  clubHistory: Array<{
    club: string | null;
    athleteId: number;
    lastSeenAt: string | null;
  }>;
  latestCompetition: {
    competitionId: number;
    competitionName: string;
    competitionDate: string | null;
    eventName: string | null;
    eventType: "individual" | "synchro";
    entryId: number | null;
    rank: number | null;
    finalTotal: number | null;
    partnerNames: string[];
    partnerLinks: Array<{
      id: number;
      name: string;
    }>;
  } | null;
  eventTypeStats: Array<{
    eventFamily: string;
    label: string;
    eventType: "individual" | "synchro";
    bestTotal: number | null;
    bestDive: number | null;
    competitionCount: number;
    latestCompetitionDate: string | null;
    latestCompetitionId: number | null;
    latestCompetitionName: string | null;
    latestEventName: string | null;
    latestEntryId: number | null;
  }>;
  bestDiveByEventType: Array<{
    eventFamily: string;
    label: string;
    bestDiveCode: string | null;
    bestDiveScore: number | null;
    eventName: string | null;
    competitionId: number | null;
    competitionName: string | null;
    entryId: number | null;
    diveId: number | null;
  }>;
  partnerStats: Array<{
    partnerName: string;
    partnerId: number | null;
    bestTotal: number | null;
    latestCompetitionDate: string | null;
    latestCompetitionId: number | null;
    latestCompetitionName: string | null;
    latestEventName: string | null;
    latestEntryId: number | null;
    appearances: number;
  }>;
  competitionHistory: Array<{
    competitionId: number;
    competitionName: string;
    competitionDate: string | null;
    eventName: string | null;
    eventType: "individual" | "synchro";
    entryId: number | null;
    rank: number | null;
    finalTotal: number | null;
    partnerNames: string[];
    partnerLinks: Array<{
      id: number;
      name: string;
    }>;
  }>;
  dives: Array<{
    id: number;
    entryId: number | null;
    rank: number | null;
    eventName: string | null;
    eventType: "individual" | "synchro";
    entryName: string | null;
    participantNames: string[];
    diveCode: string;
    description: string | null;
    height: string | null;
    difficulty: number | null;
    judgeScores: number[];
    executionScores: number[];
    synchronizationScores: number[];
    finalScore: number | null;
    cumulativeScore: number | null;
    penalty: number | null;
    competitionId: number;
    competitionName: string;
    competitionDate: string | null;
  }>;
};

type GroupSignal = {
  label: string;
  count: number;
  averageScore: number | null;
  averageDifficulty: number | null;
  bestScore: number | null;
  scoreDeviation: number | null;
};

type ViewMode = "summary" | "detailed";

function formatScore(value: number | null) {
  if (typeof value !== "number") {
    return "n/a";
  }
  return value.toFixed(2).replace(/\.00$/, "");
}

function rankGlyph(rank: number | null) {
  if (rank === 1) return "◎";
  if (rank === 2) return "◌";
  if (rank === 3) return "·";
  return "—";
}

function rankLabel(rank: number | null) {
  if (!rank) return "rank n/a";
  return `rank ${rank}`;
}

function summariseBestDiveContext(label: string, eventName: string | null) {
  if (!eventName) return "Event not recorded";
  const normalizedFamily = label.toLowerCase().replace("synchro ", "").replace(/\s+/g, " ").trim();
  const compact = eventName
    .replace(/Masters?\s+/i, "")
    .replace(/Elite\s*-\s*/i, "")
    .replace(/\bSynchro\b/i, "")
    .replace(new RegExp(normalizedFamily.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+-\s+/g, " · ")
    .trim()
    .replace(/^·\s*/, "")
    .replace(/\s+·$/, "");
  return compact || eventName;
}

function Sparkline(props: { values: Array<number | null>; inverse?: boolean }) {
  const filtered = props.values.filter((value): value is number => typeof value === "number");
  if (filtered.length < 2) {
    return <div className="trend-empty">Not enough history</div>;
  }
  const max = Math.max(...filtered);
  const min = Math.min(...filtered);
  const range = max - min || 1;
  const points = props.values
    .map((value, index) => {
      const x = (index / Math.max(props.values.length - 1, 1)) * 100;
      const safe = typeof value === "number" ? value : min;
      const normalized = props.inverse ? (safe - min) / range : 1 - (safe - min) / range;
      const y = normalized * 44 + 6;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg className="trend-line" viewBox="0 0 100 56" preserveAspectRatio="none">
      <polyline fill="none" points={points} stroke="currentColor" strokeWidth="2.25" />
    </svg>
  );
}

export function AthleteProfileView(props: { athleteId: string; initialDetail?: AthleteProfile | null }) {
  const [detail, setDetail] = useState<AthleteProfile | null>(props.initialDetail || null);
  const [error, setError] = useState<string | null>(null);
  const [visibleCompetitionHistoryCount, setVisibleCompetitionHistoryCount] = useState(6);
  const [visibleDiveCount, setVisibleDiveCount] = useState(5);
  const [viewMode, setViewMode] = useState<ViewMode>("summary");
  const [sourceContext, setSourceContext] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<AthleteProfile>(`/athletes/${props.athleteId}`)
      .then(setDetail)
      .catch((err) => setError(err.message));
  }, [props.athleteId]);

  useEffect(() => {
    setVisibleCompetitionHistoryCount(6);
    setVisibleDiveCount(5);
    setViewMode("summary");
  }, [props.athleteId]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    setSourceContext(params.get("from") || null);
  }, [props.athleteId]);

  if (error) {
    return <div className="notice">{error}</div>;
  }

  if (!detail) {
    return <div className="notice">Loading athlete profile...</div>;
  }

  const bestDiveCards = detail.bestDiveByEventType.filter((item) => item.bestDiveCode);
  const visibleCompetitionHistory = detail.competitionHistory.slice(0, visibleCompetitionHistoryCount);
  const visibleDives = detail.dives.slice(0, visibleDiveCount);
  const athleteContextLabel = `Athlete profile / ${detail.athlete.name}`;
  const techniqueContextLabel = `${athleteContextLabel} / Dive technique`;
  const latestCompetitionHref = detail.latestCompetition
    ? competitionFocusHref({
        competitionId: detail.latestCompetition.competitionId,
        eventName: detail.latestCompetition.eventName,
        entryId: detail.latestCompetition.entryId,
        from: `${athleteContextLabel} / Review last competition`,
      })
    : null;
  const bestDiveHref = bestDiveCards[0]
    ? competitionFocusHref({
        competitionId: bestDiveCards[0].competitionId || "",
        eventName: bestDiveCards[0].eventName,
        entryId: bestDiveCards[0].entryId,
        diveId: bestDiveCards[0].diveId,
        view: "ledger",
        hash: "ledger-panel",
        from: `${athleteContextLabel} / Open best dive`,
      })
    : null;
  const twistingReviewHref = athleteTechniqueHref(props.athleteId, {
    groupId: 5,
    mode: "detailed",
    from: `${athleteContextLabel} / Review twisting dives`,
  });
  const latestVsBestSummary = detail.athleteBrief.latestResult && detail.athleteBrief.bestEvent
    ? `${formatScore(detail.athleteBrief.latestResult.finalTotal)} now vs ${formatScore(detail.athleteBrief.bestEvent.bestTotal)} peak`
    : "Not enough competition history";

  return (
    <div className="page-grid">
      {sourceContext ? (
        <div className="workspace-origin-strip">Opened from: {sourceContext}</div>
      ) : null}

      <section className="profile-hero panel">
        <div>
          <h2>{detail.athlete.name}</h2>
          <div className="profile-meta-row">
            <span>{detail.athlete.birthYear || "Birth year not recorded"}</span>
            {detail.athlete.latestClub ? (
              <a href={clubProfileHref(detail.athlete.latestClub)}>{detail.athlete.latestClub}</a>
            ) : (
              <span>Club not recorded</span>
            )}
            <span>{detail.athlete.competitionCount} competitions</span>
            <span>{detail.athlete.diveCount} dives</span>
          </div>
        </div>
      </section>

      <section className="panel mode-panel">
        <div className="section-head">
          <h2>Profile mode</h2>
          <span className="muted">Start light for divers, expand for coaches and analysts</span>
        </div>
        <div className="toolbar">
          <button className="button secondary" data-active={viewMode === "summary"} onClick={() => setViewMode("summary")} type="button">
            Summary
          </button>
          <button className="button secondary" data-active={viewMode === "detailed"} onClick={() => setViewMode("detailed")} type="button">
            Detailed analysis
          </button>
        </div>
      </section>

      <section className="metrics">
        <div className="metric">
          <span>Latest result</span>
          <strong>{formatScore(detail.athleteBrief.latestResult?.finalTotal || null)}</strong>
          <small>{detail.athleteBrief.latestResult?.label || "No result recorded"}</small>
        </div>
        <div className="metric">
          <span>Best event</span>
          <strong>{detail.athleteBrief.bestEvent?.label || "n/a"}</strong>
          <small>{formatScore(detail.athleteBrief.bestEvent?.bestTotal || null)}</small>
        </div>
        <div className="metric">
          <span>Most improved area</span>
          <strong>{detail.athleteBrief.mostImprovedArea?.label || "n/a"}</strong>
          <small>
            {detail.athleteBrief.mostImprovedArea?.change
              ? `+${formatScore(detail.athleteBrief.mostImprovedArea.change)} average score`
              : "Not enough progression history"}
          </small>
        </div>
        <div className="metric">
          <span>Focus for next training</span>
          <strong>{detail.athleteBrief.focusForNextTraining?.label || "n/a"}</strong>
          <small>{detail.athleteBrief.focusForNextTraining?.reason || "No training focus generated yet"}</small>
        </div>
      </section>

      <section className="two-column">
        <div className="panel">
          <div className="section-head">
            <h2>Performance brief</h2>
            <span className="muted">What happened, what matters, and where to go next</span>
          </div>
          <div className="stack compact-stack">
            <div className="list-item compact-item">
              <strong>Latest result</strong>
              <div className="muted">
                {detail.athleteBrief.latestResult
                  ? `${detail.athleteBrief.latestResult.label} · ${rankLabel(detail.athleteBrief.latestResult.rank)}`
                  : "No competition history available"}
              </div>
            </div>
            <div className="list-item compact-item">
              <strong>Best event type</strong>
              <div className="muted">
                {detail.athleteBrief.bestEvent
                  ? `${detail.athleteBrief.bestEvent.label} · best total ${formatScore(detail.athleteBrief.bestEvent.bestTotal)}`
                  : "Best event not recorded"}
              </div>
            </div>
            <div className="list-item compact-item">
              <strong>Most improved area</strong>
              <div className="muted">
                {detail.athleteBrief.mostImprovedArea
                  ? `${detail.athleteBrief.mostImprovedArea.label} improved by ${formatScore(detail.athleteBrief.mostImprovedArea.change)}`
                  : "Not enough history to detect a positive movement yet"}
              </div>
            </div>
            <div className="list-item compact-item">
              <strong>Focus for next training</strong>
              <div className="muted">{detail.athleteBrief.focusForNextTraining?.reason || "No focused recommendation yet"}</div>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="section-head">
            <h2>Coach interpretation</h2>
            <span className="muted">Quick coaching read of the current dataset</span>
          </div>
          <div className="coach-grid">
            <div className="coach-card">
              <strong>Strongest family</strong>
              <span>{detail.coachingInsights.strongestFamily?.label || "n/a"}</span>
              <small>best dive {formatScore(detail.coachingInsights.strongestFamily?.bestDive || null)}</small>
            </div>
            <div className="coach-card">
              <strong>Most used code</strong>
              <span>{detail.coachingInsights.mostUsedCode?.code || "n/a"}</span>
              <small>{detail.coachingInsights.mostUsedCode?.attempts || 0} attempts</small>
            </div>
            <div className="coach-card">
              <strong>Highest ceiling</strong>
              <span>{detail.coachingInsights.highestCeiling?.label || "n/a"}</span>
              <small>{formatScore(detail.coachingInsights.highestCeiling?.bestTotal || null)}</small>
            </div>
            <div className="coach-card coach-card-warning">
              <strong>Needs review</strong>
              <span>{detail.coachingInsights.needsReview?.label || "No alert"}</span>
              <small>
                {detail.coachingInsights.needsReview?.scoreDeviation
                  ? `variance ${formatScore(detail.coachingInsights.needsReview.scoreDeviation)}`
                  : "No unstable repeated pattern detected"}
              </small>
            </div>
          </div>
        </div>
      </section>

      <section className="panel context-panel">
        <div className="section-head">
          <h2>Next actions</h2>
          <span className="muted">Use guided entry points instead of digging through the full profile first</span>
        </div>
        <div className="context-links">
          {latestCompetitionHref ? (
            <a className="context-link-card" href={latestCompetitionHref}>
              <strong>Review last competition</strong>
              <span>{detail.latestCompetition?.competitionName}</span>
            </a>
          ) : null}
          {bestDiveHref ? (
            <a className="context-link-card" href={bestDiveHref}>
              <strong>Open best dive</strong>
              <span>{bestDiveCards[0].bestDiveCode} · {bestDiveCards[0].label}</span>
            </a>
          ) : null}
          <a className="context-link-card" href={athleteTechniqueHref(props.athleteId, { from: techniqueContextLabel })}>
            <strong>Dive technique</strong>
            <span>Open the grouped technical review</span>
          </a>
          <a className="context-link-card" href={twistingReviewHref}>
            <strong>Review twisting dives</strong>
            <span>{detail.techniqueSummary.groups.find((group) => group.label === "Twisting")?.count || 0} twisting attempts</span>
          </a>
          <div className="context-link-card context-link-card-static">
            <strong>Compare latest vs best</strong>
            <span>{latestVsBestSummary}</span>
          </div>
        </div>
      </section>

      <section className="panel context-panel">
        <div className="section-head">
          <h2>Quick paths</h2>
          <span className="muted">Return to the live competition context</span>
        </div>
        <div className="context-links">
          <a className="context-link-card" href={athleteTechniqueHref(props.athleteId, { from: techniqueContextLabel })}>
            <strong>Dive technique</strong>
            <span>Dive groups, code structure, and technical breakdown</span>
          </a>
          {detail.athlete.latestClub ? (
            <a className="context-link-card" href={clubProfileHref(detail.athlete.latestClub)}>
              <strong>Club</strong>
              <span>{detail.athlete.latestClub}</span>
            </a>
          ) : null}
          {latestCompetitionHref ? (
            <a className="context-link-card" href={latestCompetitionHref}>
              <strong>Latest competition</strong>
              <span>{detail.latestCompetition?.competitionName}</span>
            </a>
          ) : null}
          {bestDiveHref ? (
            <a className="context-link-card" href={bestDiveHref}>
              <strong>Best dive</strong>
              <span>{bestDiveCards[0].bestDiveCode} · {bestDiveCards[0].label}</span>
            </a>
          ) : null}
        </div>
      </section>

      <section className="two-column">
        <div className="panel">
          <div className="section-head">
            <h2>Progress over time</h2>
            <span className="muted">Light visuals for quick athlete reading</span>
          </div>
          <div className="trend-grid">
            <div className="trend-card">
              <strong>Total score trend</strong>
              <Sparkline values={detail.progression.competitionTotals.map((row) => row.finalTotal)} />
            </div>
            <div className="trend-card">
              <strong>Recent rank trend</strong>
              <Sparkline inverse values={detail.progression.ranks.map((row) => row.rank)} />
            </div>
            <div className="trend-card trend-card-wide">
              <strong>Dive-family usage trend</strong>
              <div className="trend-usage-list">
                {detail.progression.familyUsage.slice(-3).map((row) => (
                  <div className="trend-usage-row" key={row.competitionId}>
                    <span>{row.competitionName}</span>
                    <span className="muted">
                      {Object.entries(row.familyCounts)
                        .sort((left, right) => right[1] - left[1])
                        .slice(0, 3)
                        .map(([label, count]) => `${label} ${count}`)
                        .join(" · ") || "No dives recorded"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="section-head">
            <h2>Profile snapshot</h2>
            <span className="muted">Stable reference points for the current profile</span>
          </div>
          <div className="stack compact-stack">
            <div className="list-item compact-item">
              <strong>Latest club</strong>
              <div className="muted">
                {detail.athlete.latestClub ? (
                  <a href={clubProfileHref(detail.athlete.latestClub)}>{detail.athlete.latestClub}</a>
                ) : (
                  "Unknown club"
                )}
              </div>
            </div>
            <div className="list-item compact-item">
              <strong>Most used dive code</strong>
              <div className="muted">{detail.athlete.mostUsedDiveCode || "Not enough data"}</div>
            </div>
            <div className="list-item compact-item">
              <strong>Club history</strong>
              <div className="cluster">
                {detail.clubHistory.map((club) => (
                  <a className="chip" href={club.club ? clubProfileHref(club.club) : "#"} key={`${club.club}-${club.athleteId}`}>
                    {club.club || "Unknown club"}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="panel">
        <h2>Best event types</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Event type</th>
              <th>Best total</th>
              <th>Best dive</th>
              <th>Appearances</th>
              <th>Latest competition</th>
            </tr>
          </thead>
          <tbody>
            {detail.eventTypeStats.map((stat) => {
              const bestDive = bestDiveCards.find((item) => item.eventFamily === stat.eventFamily);
              return (
                <tr key={stat.eventFamily}>
                  <td>
                    <strong>{stat.label}</strong>
                    <div className="muted">{stat.eventType === "synchro" ? "Synchro" : "Individual"}</div>
                  </td>
                  <td>{formatScore(stat.bestTotal)}</td>
                  <td>
                    <strong>{bestDive?.bestDiveCode || "n/a"}</strong>
                    <div className="muted">{formatScore(bestDive?.bestDiveScore || null)}</div>
                  </td>
                  <td>{stat.competitionCount}</td>
                  <td>
                    {stat.latestCompetitionId ? (
                      <a
                        href={competitionFocusHref({
                          competitionId: stat.latestCompetitionId,
                          eventName: stat.latestEventName,
                          entryId: stat.latestEntryId,
                          from: `${athleteContextLabel} / Best event types`,
                        })}
                      >
                        {stat.latestCompetitionName}
                      </a>
                    ) : (
                      "n/a"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="two-column">
        <div className="panel">
          <div className="section-head">
            <h2>Competition history</h2>
            <span className="muted">Showing {visibleCompetitionHistory.length} of {detail.competitionHistory.length}</span>
          </div>
          <div className="stack">
            {visibleCompetitionHistory.map((row) => (
              <div className="list-item competition-history-item" key={`${row.competitionId}-${row.eventName}-${row.entryId}`}>
                <div className="between-row">
                  <div className="competition-history-main">
                    <span className={`rank-mark rank-${row.rank || "other"}`}>
                      <span className="rank-mark-glyph" aria-hidden="true">
                        {rankGlyph(row.rank)}
                      </span>
                      <span>{rankLabel(row.rank)}</span>
                    </span>
                      <a
                        href={competitionFocusHref({
                          competitionId: row.competitionId,
                          eventName: row.eventName,
                          entryId: row.entryId,
                          from: `${athleteContextLabel} / Competition history`,
                        })}
                      >
                        <strong>{row.competitionName}</strong>
                    </a>
                  </div>
                  <span>{formatScore(row.finalTotal)}</span>
                </div>
                <div className="muted" style={{ marginTop: 6 }}>
                  {row.competitionDate || "Date not recorded"} · {row.eventName || "Event not recorded"}
                </div>
                {row.partnerLinks.length > 0 ? (
                  <div className="cluster" style={{ marginTop: 8 }}>
                    {row.partnerLinks.map((partner) => (
                      <a className="chip" href={athleteProfileHref(partner.id, { from: `${athleteContextLabel} / Synchro partner` })} key={partner.id}>
                        {partner.name}
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          {visibleCompetitionHistory.length < detail.competitionHistory.length ? (
            <div style={{ marginTop: 14 }}>
              <button className="button secondary" onClick={() => setVisibleCompetitionHistoryCount((count) => count + 6)} type="button">
                Show 6 more
              </button>
            </div>
          ) : null}
        </div>

        <div className="panel">
          <h2>Best dives by event type</h2>
          <div className="best-dive-grid">
            {bestDiveCards.map((row) => (
              <a
                className="best-dive-card profile-card-link"
                href={
                  row.competitionId
                    ? competitionFocusHref({
                        competitionId: row.competitionId,
                        eventName: row.eventName,
                        entryId: row.entryId,
                        diveId: row.diveId,
                        view: "ledger",
                        hash: "ledger-panel",
                        from: `${athleteContextLabel} / Best dives by event type`,
                      })
                    : "#"
                }
                key={row.eventFamily}
              >
                <div className="best-dive-head">
                  <div>
                    <strong>{row.label}</strong>
                    <div className="muted best-dive-context">{summariseBestDiveContext(row.label, row.eventName)}</div>
                  </div>
                  <div className="best-dive-score">{formatScore(row.bestDiveScore)}</div>
                </div>
                <div className="best-dive-meta">
                  <div className="best-dive-code">{row.bestDiveCode}</div>
                  <div className="muted">{row.competitionName || "Competition not recorded"}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {viewMode === "detailed" && detail.partnerStats.length > 0 ? (
        <section className="panel">
          <h2>Synchro partners</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Partner</th>
                <th>Best total</th>
                <th>Appearances</th>
                <th>Latest competition</th>
              </tr>
            </thead>
            <tbody>
              {detail.partnerStats.map((partner) => (
                <tr key={partner.partnerName}>
                  <td>
                    {partner.partnerId ? (
                      <a href={athleteProfileHref(partner.partnerId, { from: `${athleteContextLabel} / Synchro partners` })}>
                        <strong>{partner.partnerName}</strong>
                      </a>
                    ) : (
                      <strong>{partner.partnerName}</strong>
                    )}
                  </td>
                  <td>{formatScore(partner.bestTotal)}</td>
                  <td>{partner.appearances}</td>
                  <td>
                    {partner.latestCompetitionId ? (
                      <a
                        href={competitionFocusHref({
                          competitionId: partner.latestCompetitionId,
                          eventName: partner.latestEventName,
                          entryId: partner.latestEntryId,
                          from: `${athleteContextLabel} / Synchro partners`,
                        })}
                      >
                        {partner.latestCompetitionName}
                      </a>
                    ) : (
                      "n/a"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {viewMode === "detailed" ? (
        <section className="panel">
          <div className="section-head">
            <h2>All dives</h2>
            <span className="muted">
              Showing {visibleDives.length} of {detail.dives.length}
            </span>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Competition</th>
                <th>Event</th>
                <th>Dive</th>
                <th>Score</th>
                <th>Cumulative</th>
              </tr>
            </thead>
            <tbody>
              {visibleDives.map((dive) => (
                <tr
                  className="table-row-link"
                  key={dive.id}
                  onClick={() =>
                    (window.location.href = competitionFocusHref({
                      competitionId: dive.competitionId,
                      eventName: dive.eventName,
                      entryId: dive.entryId,
                      diveId: dive.id,
                      view: "ledger",
                      hash: "ledger-panel",
                      from: `${athleteContextLabel} / All dives`,
                    }))
                  }
                >
                  <td>
                    <strong>{dive.competitionName}</strong>
                  </td>
                  <td>
                    <strong>{dive.eventName || "Unknown"}</strong>
                    <div className="muted">{dive.eventType === "synchro" ? dive.entryName : "Individual"}</div>
                  </td>
                  <td>
                    <strong>{dive.diveCode}</strong>
                    <div className="muted">{dive.description || ""}</div>
                  </td>
                  <td>{formatScore(dive.finalScore)}</td>
                  <td>{formatScore(dive.cumulativeScore)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {visibleDives.length < detail.dives.length ? (
            <div style={{ marginTop: 14 }}>
              <button className="button secondary" onClick={() => setVisibleDiveCount((count) => count + 5)} type="button">
                Show 5 more
              </button>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
