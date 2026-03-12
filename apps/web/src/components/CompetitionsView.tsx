import { useEffect, useMemo, useState } from "react";
import { applyDivingRules } from "../../../../packages/diving-rules";
import { fetchJson } from "./api";
import { athleteProfileHref } from "./links";
import { ScoreNotes } from "./ScoreNotes";

type Competition = {
  id: number;
  name: string;
  location: string | null;
  date: string | null;
  totalDives: number;
  totalAthletes: number;
  totalEvents: number;
  averageDiveScore: number | null;
  winningScore: number | null;
};

type CompetitionAthlete = {
  id: number;
  name: string;
  birthYear: string | null;
  club: string | null;
  rank: number | null;
  diveCount: number;
  averageDiveScore: number | null;
  finalTotal: number | null;
  events: string[];
};

type CompetitionEntry = {
  id: number;
  entryName: string;
  primaryName: string;
  rank: number | null;
  eventName: string | null;
  eventType: "individual" | "synchro";
  participantNames: string[];
  diveCount: number;
  bestDive: number | null;
  finalTotal: number | null;
};

type CompetitionDive = {
  id: number;
  athleteId: number | null;
  entryId: number | null;
  athleteName: string;
  entryName: string | null;
  participantNames: string[];
  rank: number | null;
  eventName: string | null;
  eventType: "individual" | "synchro";
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
};

type CompetitionDetailResponse = {
  competition: Competition;
  athletes: CompetitionAthlete[];
  entries: CompetitionEntry[];
  eventSummaries: Array<{
    eventName: string;
    eventType: "individual" | "synchro";
    athleteCount: number;
    diveCount: number;
    winningScore: number | null;
  }>;
  dives: CompetitionDive[];
};

function readQueryParam(name: string) {
  if (typeof window === "undefined") {
    return "";
  }
  return new URLSearchParams(window.location.search).get(name) || "";
}

function writeQueryParam(name: string, value: string) {
  if (typeof window === "undefined") {
    return;
  }
  const url = new URL(window.location.href);
  if (value) {
    url.searchParams.set(name, value);
  } else {
    url.searchParams.delete(name);
  }
  window.history.replaceState({}, "", url.toString());
}

function formatScore(value: number | null) {
  if (typeof value !== "number") {
    return "n/a";
  }
  return value.toFixed(2).replace(/\.00$/, "");
}

function normalizePersonName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function rankGlyph(rank: number | null) {
  if (rank === 1) {
    return "◎";
  }
  if (rank === 2) {
    return "◌";
  }
  if (rank === 3) {
    return "·";
  }
  return "—";
}

function rankLabel(rank: number | null) {
  if (!rank) {
    return "rank n/a";
  }
  return `rank ${rank}`;
}

function renderLedgerScores(scores: number[], droppedIndexes: number[]) {
  const dropped = new Set(droppedIndexes);
  return scores.map((score, index) => (
    <span
      className={`ledger-score-chip${dropped.has(index) ? " dropped" : ""}`}
      key={`${score}-${index}`}
    >
      {formatScore(score)}
    </span>
  ));
}

export function CompetitionsView() {
  const [competitionId, setCompetitionId] = useState("");
  const [selectedEvent, setSelectedEvent] = useState("");
  const [selectedEntryId, setSelectedEntryId] = useState("");
  const [selectedDiveId, setSelectedDiveId] = useState("");
  const [analysisView, setAnalysisView] = useState("overview");
  const [list, setList] = useState<Competition[]>([]);
  const [detail, setDetail] = useState<CompetitionDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCompetitionId(readQueryParam("id"));
    setSelectedEvent(readQueryParam("event"));
    setSelectedEntryId(readQueryParam("entry"));
    setSelectedDiveId(readQueryParam("dive"));
    setAnalysisView(readQueryParam("view") || "overview");
  }, []);

  useEffect(() => {
    fetchJson<Competition[]>("/competitions")
      .then(setList)
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!competitionId) {
      setDetail(null);
      return;
    }

    fetchJson<CompetitionDetailResponse>(`/competitions/${competitionId}`)
      .then((response) => {
        setDetail(response);

        const fallbackEvent = response.eventSummaries[0]?.eventName || "";
        const currentEvent =
          selectedEvent &&
          response.eventSummaries.some((event) => event.eventName === selectedEvent)
            ? selectedEvent
            : fallbackEvent;

        if (currentEvent !== selectedEvent) {
          setSelectedEvent(currentEvent);
          writeQueryParam("event", currentEvent);
        }

        if (
          selectedEntryId &&
          !response.entries.some((entry) => String(entry.id) === selectedEntryId)
        ) {
          setSelectedEntryId("");
          writeQueryParam("entry", "");
        }

        if (selectedDiveId) {
          const focusedDive = response.dives.find((dive) => String(dive.id) === selectedDiveId);
          if (!focusedDive) {
            setSelectedDiveId("");
            writeQueryParam("dive", "");
          } else {
            const requestedView = readQueryParam("view");
            setAnalysisView(requestedView === "athlete" ? "athlete" : "ledger");
            if (focusedDive.eventName && focusedDive.eventName !== currentEvent) {
              setSelectedEvent(focusedDive.eventName);
              writeQueryParam("event", focusedDive.eventName);
            }
            if (focusedDive.entryId && String(focusedDive.entryId) !== selectedEntryId) {
              setSelectedEntryId(String(focusedDive.entryId));
              writeQueryParam("entry", String(focusedDive.entryId));
            }
          }
        }
      })
      .catch((err) => setError(err.message));
  }, [competitionId, selectedDiveId]);

  const eventScoped = useMemo(() => {
    if (!detail) {
      return null;
    }

    const currentEvent = selectedEvent || detail.eventSummaries[0]?.eventName || "";
    const eventSummary =
      detail.eventSummaries.find((event) => event.eventName === currentEvent) ||
      detail.eventSummaries[0] ||
      null;

    const dives = detail.dives.filter((dive) => dive.eventName === currentEvent);
    const entries = detail.entries
      .filter((entry) => entry.eventName === currentEvent)
      .map((entry) => ({
        ...entry,
        dives: dives.filter((dive) => dive.entryId === entry.id),
      }))
      .sort((left, right) => {
        const leftRank = left.rank ?? Number.POSITIVE_INFINITY;
        const rightRank = right.rank ?? Number.POSITIVE_INFINITY;
        if (leftRank !== rightRank) {
          return leftRank - rightRank;
        }
        return (right.finalTotal || 0) - (left.finalTotal || 0);
      });

    const selectedEntry =
      entries.find((entry) => String(entry.id) === selectedEntryId) || entries[0] || null;

    const athleteByName = new Map(
      detail.athletes.map((athlete) => [normalizePersonName(athlete.name), athlete]),
    );
    const selectedMembers = (selectedEntry?.participantNames || [])
      .map((name) => athleteByName.get(normalizePersonName(name)))
      .filter((member): member is CompetitionAthlete => Boolean(member));

    const diveCodeBreakdown = Array.from(
      dives.reduce((map, dive) => {
        const current = map.get(dive.diveCode) || { count: 0, scores: [] as number[] };
        current.count += 1;
        if (typeof dive.finalScore === "number") {
          current.scores.push(dive.finalScore);
        }
        map.set(dive.diveCode, current);
        return map;
      }, new Map<string, { count: number; scores: number[] }>()),
    )
      .map(([diveCode, summary]) => ({
        diveCode,
        count: summary.count,
        averageScore:
          summary.scores.length > 0
            ? summary.scores.reduce((sum, score) => sum + score, 0) / summary.scores.length
            : null,
      }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 12);

    const ledgerGroups = Array.from(
      dives.reduce((map, dive) => {
        const key = dive.entryId ? `entry-${dive.entryId}` : `athlete-${dive.athleteId || dive.athleteName}`;
        const existing = map.get(key);
        if (existing) {
          existing.dives.push(dive);
          return map;
        }
        map.set(key, {
          key,
          label: dive.entryName || dive.athleteName,
          participantNames: dive.participantNames,
          rank: dive.rank,
          dives: [dive],
        });
        return map;
      }, new Map<string, { key: string; label: string; participantNames: string[]; rank: number | null; dives: CompetitionDive[] }>()),
      ([, value]) => value,
    );

    return {
      currentEvent,
      eventSummary,
      entries,
      dives,
      ledgerGroups,
      selectedEntry,
      selectedMembers,
      diveCodeBreakdown,
      isSynchro: eventSummary?.eventType === "synchro",
    };
  }, [detail, selectedEntryId, selectedEvent]);

  useEffect(() => {
    if (!selectedDiveId || (analysisView !== "ledger" && analysisView !== "athlete")) {
      return;
    }
    if (typeof document === "undefined") {
      return;
    }
    const focusedRow = document.querySelector<HTMLElement>(`[data-dive-id="${selectedDiveId}"]`);
    if (!focusedRow) {
      return;
    }
    focusedRow.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [analysisView, selectedDiveId, eventScoped?.currentEvent]);

  function openCompetition(id: number) {
    const value = String(id);
    setCompetitionId(value);
    setSelectedEntryId("");
    setSelectedDiveId("");
    setAnalysisView("overview");
    writeQueryParam("id", value);
    writeQueryParam("dive", "");
    writeQueryParam("view", "overview");
  }

  function openEvent(eventName: string) {
    setSelectedEvent(eventName);
    setSelectedEntryId("");
    setSelectedDiveId("");
    setAnalysisView("overview");
    writeQueryParam("event", eventName);
    writeQueryParam("entry", "");
    writeQueryParam("dive", "");
    writeQueryParam("view", "overview");
  }

  function openEntryInEvent(entryId: number) {
    const value = String(entryId);
    setSelectedEntryId(value);
    setSelectedDiveId("");
    setAnalysisView("athlete");
    writeQueryParam("entry", value);
    writeQueryParam("dive", "");
    writeQueryParam("view", "athlete");
  }

  return (
    <div className="page-grid">
      {error ? <div className="notice">{error}</div> : null}

      <section className="panel">
        <h2>Imported competitions</h2>
        <table className="table table-clickable">
          <thead>
            <tr>
              <th>Competition</th>
              <th>Date</th>
              <th>Athletes</th>
              <th>Dives</th>
              <th>Winning total</th>
            </tr>
          </thead>
          <tbody>
            {list.map((competition) => (
              <tr
                key={competition.id}
                data-selected={String(competition.id) === competitionId}
                onClick={() => openCompetition(competition.id)}
              >
                <td>
                  <strong>{competition.name}</strong>
                  <div className="muted">{competition.location || "Location not recorded"}</div>
                </td>
                <td>{competition.date || "Unknown"}</td>
                <td>{competition.totalAthletes}</td>
                <td>{competition.totalDives}</td>
                <td>{formatScore(competition.winningScore)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {detail && eventScoped ? (
        <>
          <section className="metrics">
            <div className="metric">
              <span>Meet</span>
              <strong>{detail.competition.name}</strong>
            </div>
            <div className="metric">
              <span>Events</span>
              <strong>{detail.competition.totalEvents}</strong>
            </div>
            <div className="metric">
              <span>Athletes</span>
              <strong>{detail.competition.totalAthletes}</strong>
            </div>
            <div className="metric">
              <span>Dives</span>
              <strong>{detail.competition.totalDives}</strong>
            </div>
          </section>

          <section className="panel">
            <h2>Meet analysis workspace</h2>
            <div className="analysis-layout">
              <div className="analysis-rail">
                <div className="rail-block">
                  <div className="rail-head">
                    <div className="rail-label">Event navigator</div>
                    <span className="chip rail-chip">{detail.eventSummaries.length} events</span>
                  </div>
                  <div className="stack rail-scroll">
                    {detail.eventSummaries.map((event) => (
                      <button
                        className="rail-item"
                        data-active={event.eventName === eventScoped.currentEvent}
                        key={event.eventName}
                        onClick={() => openEvent(event.eventName)}
                        type="button"
                      >
                        <strong>{event.eventName}</strong>
                        <span>
                          {event.athleteCount} {event.eventType === "synchro" ? "entries" : "athletes"} ·{" "}
                          {event.diveCount} dives
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rail-block">
                  <div className="rail-label">Meet metadata</div>
                  <div className="stack compact-stack">
                    <div className="list-item compact-item">
                      <strong>{detail.competition.location || "Location not recorded"}</strong>
                      <div className="muted">{detail.competition.date || "Date not recorded"}</div>
                    </div>
                    <div className="list-item compact-item">
                      <strong>{eventScoped.eventSummary?.eventName || "Event not recorded"}</strong>
                      <div className="muted">
                        {eventScoped.isSynchro ? "synchro event" : "individual event"} · winning total{" "}
                        {formatScore(eventScoped.eventSummary?.winningScore || null)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="analysis-main">
                <div className="metrics metrics-3">
                  <div className="metric">
                    <span>Selected event</span>
                    <strong>{eventScoped.currentEvent}</strong>
                  </div>
                  <div className="metric">
                    <span>{eventScoped.isSynchro ? "Entries" : "Entrants"}</span>
                    <strong>{eventScoped.entries.length}</strong>
                  </div>
                  <div className="metric">
                    <span>Dive codes in use</span>
                    <strong>{eventScoped.diveCodeBreakdown.length}</strong>
                  </div>
                </div>

                {eventScoped.selectedEntry?.dives[0] ? (
                  <div className="panel">
                    <h2>Applied judging rule</h2>
                    <ScoreNotes
                      difficulty={eventScoped.selectedEntry.dives[0].difficulty}
                      eventType={eventScoped.selectedEntry.dives[0].eventType}
                      executionScores={eventScoped.selectedEntry.dives[0].executionScores}
                      finalScore={eventScoped.selectedEntry.dives[0].finalScore}
                      judgeScores={eventScoped.selectedEntry.dives[0].judgeScores}
                      synchronizationScores={eventScoped.selectedEntry.dives[0].synchronizationScores}
                    />
                  </div>
                ) : null}

                <div className="analysis-switcher panel">
                  <div className="toolbar">
                    <button
                      className="toggle-pill"
                      data-active={analysisView === "overview"}
                      onClick={() => {
                        setAnalysisView("overview");
                        writeQueryParam("view", "overview");
                      }}
                      type="button"
                    >
                      Event overview
                    </button>
                    <button
                      className="toggle-pill"
                      data-active={analysisView === "athlete"}
                      onClick={() => {
                        setAnalysisView("athlete");
                        writeQueryParam("view", "athlete");
                      }}
                      type="button"
                    >
                      {eventScoped.isSynchro ? "Pair focus" : "Athlete focus"}
                    </button>
                    <button
                      className="toggle-pill"
                      data-active={analysisView === "ledger"}
                      onClick={() => {
                        setAnalysisView("ledger");
                        writeQueryParam("view", "ledger");
                      }}
                      type="button"
                    >
                      Full ledger
                    </button>
                  </div>
                  <div className="muted">
                    {analysisView === "overview"
                      ? "Use the event summary to compare the field before drilling into a specific entry."
                      : analysisView === "athlete"
                        ? eventScoped.isSynchro
                          ? "Keep one pair in focus with both diver names and split judging visible."
                          : "Keep one athlete in focus and inspect their progression without the rest of the report in the way."
                        : "Open the full event log only when you need per-dive inspection or auditing."}
                  </div>
                </div>

                {analysisView === "overview" ? (
                  <div className="two-column">
                    <div className="panel">
                      <h2>{eventScoped.isSynchro ? "Pair leaderboard" : "Event leaderboard"}</h2>
                      <table className="table">
                        <thead>
                          <tr>
                            <th>{eventScoped.isSynchro ? "Entry" : "Athlete"}</th>
                            <th>Rank</th>
                            <th>Dives</th>
                            <th>Best dive</th>
                            <th>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {eventScoped.entries.map((entry) => (
                            <tr
                              key={entry.id}
                              data-selected={String(entry.id) === String(eventScoped.selectedEntry?.id)}
                              onClick={() => openEntryInEvent(entry.id)}
                            >
                              <td>
                                <strong>{entry.entryName}</strong>
                                <div className="muted">
                                  {entry.participantNames.length > 1
                                    ? entry.participantNames.join(" / ")
                                    : entry.primaryName}
                                </div>
                              </td>
                              <td>
                                <span className={`rank-mark rank-${entry.rank || "other"}`}>
                                  <span className="rank-mark-glyph" aria-hidden="true">
                                    {rankGlyph(entry.rank)}
                                  </span>
                                  <span>{rankLabel(entry.rank)}</span>
                                </span>
                              </td>
                              <td>{entry.diveCount}</td>
                              <td>{formatScore(entry.bestDive)}</td>
                              <td>{formatScore(entry.finalTotal)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="panel">
                      <h2>Dive code mix</h2>
                      <div className="stack compact-stack">
                        {eventScoped.diveCodeBreakdown.map((item) => (
                          <div className="list-item compact-item" key={item.diveCode}>
                            <div className="between-row">
                              <strong>{item.diveCode}</strong>
                              <span>{item.count} uses</span>
                            </div>
                            <div className="score-bar compact-score-bar">
                              <div className="score-bar-meter">
                                <div
                                  className="score-bar-fill"
                                  style={{
                                    width: `${Math.min((item.count / Math.max(eventScoped.entries.length, 1)) * 100, 100)}%`,
                                  }}
                                />
                              </div>
                              <span className="muted">{formatScore(item.averageScore)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}

                {analysisView === "athlete" && eventScoped.selectedEntry ? (
                  <div className="focus-layout">
                    <div className="panel focus-summary-panel">
                      <h2>{eventScoped.isSynchro ? "Selected pair" : "Selected athlete in event"}</h2>
                      <div className="stack compact-stack">
                        <div className="list-item compact-item">
                          <strong>{eventScoped.selectedEntry.entryName}</strong>
                          <div className="entry-rank-row">
                            <span className={`rank-mark rank-${eventScoped.selectedEntry.rank || "other"}`}>
                              <span className="rank-mark-glyph" aria-hidden="true">
                                {rankGlyph(eventScoped.selectedEntry.rank)}
                              </span>
                              <span>{rankLabel(eventScoped.selectedEntry.rank)}</span>
                            </span>
                            <span className="muted">total {formatScore(eventScoped.selectedEntry.finalTotal)}</span>
                          </div>
                        </div>
                        <div className="cluster">
                          {eventScoped.selectedMembers.map((member) => (
                            <a className="chip" href={athleteProfileHref(member.id)} key={member.id}>
                              {member.name}
                            </a>
                          ))}
                          <span className="chip">
                            {eventScoped.selectedEntry.diveCount} dives in event
                          </span>
                        </div>
                        <div className="analysis-subpanel">
                          <div className="rail-label">
                            {eventScoped.isSynchro ? "Switch pair" : "Switch athlete"}
                          </div>
                          <div className="focus-entry-list">
                            {eventScoped.entries.map((entry) => (
                              <button
                                className="focus-entry-item"
                                data-active={String(entry.id) === String(eventScoped.selectedEntry?.id)}
                                key={entry.id}
                                onClick={() => openEntryInEvent(entry.id)}
                                type="button"
                              >
                                <strong>{entry.entryName}</strong>
                                <span>
                                  {rankGlyph(entry.rank)} {rankLabel(entry.rank)} · {formatScore(entry.finalTotal)}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="panel focus-table-panel">
                      <h2>{eventScoped.isSynchro ? "Synchro dive progression" : "Event dive progression"}</h2>
                      <table className="table table-analysis">
                        <thead>
                          <tr>
                            <th>Dive</th>
                            <th>DD</th>
                            {eventScoped.isSynchro ? (
                              <>
                                <th>Execution</th>
                                <th>Synchronization</th>
                              </>
                            ) : (
                              <th>Scores</th>
                            )}
                            <th>Points</th>
                            <th>Cumulative</th>
                          </tr>
                        </thead>
                        <tbody>
                          {eventScoped.selectedEntry.dives.map((dive) => (
                            <tr
                              data-dive-id={dive.id}
                              data-focused={String(dive.id) === selectedDiveId}
                              key={dive.id}
                            >
                              <td>
                                <strong>{dive.diveCode}</strong>
                                {dive.description ? (
                                  <div className="muted table-subnote">{dive.description}</div>
                                ) : null}
                              </td>
                              <td>{dive.difficulty || "n/a"}</td>
                              {eventScoped.isSynchro ? (
                                <>
                                  <td>{dive.executionScores.join(", ") || "n/a"}</td>
                                  <td>{dive.synchronizationScores.join(", ") || "n/a"}</td>
                                </>
                              ) : (
                                <td>{dive.judgeScores.join(", ") || "n/a"}</td>
                              )}
                              <td>{formatScore(dive.finalScore)}</td>
                              <td>{formatScore(dive.cumulativeScore)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}

                {analysisView === "ledger" ? (
                  <div className="panel">
                    <h2>Event dive ledger</h2>
                    <table className="table table-ledger">
                      <thead>
                        <tr>
                          <th className="ledger-col-dive">Dive</th>
                          <th className="ledger-col-height">Height</th>
                          <th className="ledger-col-dd">DD</th>
                          {eventScoped.isSynchro ? (
                            <>
                              <th className="ledger-col-score">Execution</th>
                              <th className="ledger-col-score">Synchronization</th>
                            </>
                          ) : null}
                          <th className="ledger-col-number ledger-col-final">Score</th>
                          <th className="ledger-col-number ledger-col-cumulative">Cumulative</th>
                        </tr>
                      </thead>
                      {eventScoped.ledgerGroups.map((group) => (
                        <tbody className="ledger-group" key={group.key}>
                          <tr className="ledger-group-head">
                            <td colSpan={eventScoped.isSynchro ? 7 : 5}>
                              <div className="ledger-group-title">
                                <strong>
                                  {(group.participantNames.length > 0 ? group.participantNames : [group.label]).map(
                                    (name, index, names) => {
                                      const athlete = detail.athletes.find(
                                        (candidate) =>
                                          normalizePersonName(candidate.name) === normalizePersonName(name),
                                      );
                                      return (
                                        <span key={name}>
                                          {athlete ? (
                                            <a className="ledger-link" href={athleteProfileHref(athlete.id)}>
                                              {athlete.name}
                                            </a>
                                          ) : (
                                            <span className="ledger-link">{name}</span>
                                          )}
                                          {index < names.length - 1 ? " / " : ""}
                                        </span>
                                      );
                                    },
                                  )}
                                </strong>
                                <span className="ledger-group-meta">
                                  {`${rankGlyph(group.rank)} ${rankLabel(group.rank)} · ${group.dives.length} dives`}
                                </span>
                              </div>
                            </td>
                          </tr>
                          {group.dives.map((dive) => (
                            <tr
                              data-dive-id={dive.id}
                              data-focused={String(dive.id) === selectedDiveId}
                              key={dive.id}
                            >
                            <td className="ledger-dive-cell">
                              <strong className="ledger-primary">{dive.diveCode}</strong>
                              {dive.description ? (
                                <div className="muted ledger-secondary">{dive.description}</div>
                              ) : null}
                            </td>
                            <td className="ledger-number-cell">{dive.height || "n/a"}</td>
                            <td className="ledger-number-cell">{dive.difficulty || "n/a"}</td>
                            {(() => {
                              const breakdown = applyDivingRules({
                                eventType: dive.eventType,
                                difficulty: dive.difficulty,
                                judgeScores: dive.judgeScores,
                                executionScores: dive.executionScores,
                                synchronizationScores: dive.synchronizationScores,
                              });

                              if (eventScoped.isSynchro) {
                                const executionBucket = breakdown.buckets.find((bucket) =>
                                  bucket.id.startsWith("execution"),
                                );
                                const synchronizationBucket = breakdown.buckets.find(
                                  (bucket) => bucket.id === "synchronization",
                                );
                                return (
                                  <>
                                    <td className="ledger-score-cell">
                                      <div className="ledger-score-row">
                                        {executionBucket
                                          ? renderLedgerScores(
                                              executionBucket.scores,
                                              executionBucket.droppedIndexes,
                                            )
                                          : "n/a"}
                                      </div>
                                    </td>
                                    <td className="ledger-score-cell">
                                      <div className="ledger-score-row">
                                        {synchronizationBucket
                                          ? renderLedgerScores(
                                              synchronizationBucket.scores,
                                              synchronizationBucket.droppedIndexes,
                                            )
                                          : "n/a"}
                                      </div>
                                    </td>
                                  </>
                                );
                              }

                              const bucket = breakdown.buckets[0];
                              return (
                                <td className="ledger-score-cell">
                                  <div className="ledger-score-row">
                                    {bucket ? renderLedgerScores(bucket.scores, bucket.droppedIndexes) : "n/a"}
                                  </div>
                                </td>
                              );
                            })()}
                            <td className="ledger-number-cell ledger-cell-final">{formatScore(dive.finalScore)}</td>
                            <td className="ledger-number-cell ledger-cell-cumulative">{formatScore(dive.cumulativeScore)}</td>
                          </tr>
                          ))}
                        </tbody>
                      ))}
                    </table>
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
