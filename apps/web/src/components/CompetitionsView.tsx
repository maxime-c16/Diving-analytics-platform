import { useEffect, useMemo, useState } from "react";
import { applyDivingRules } from "../../../../packages/diving-rules";
import { fetchJson } from "./api";
import { athleteProfileHref, clubProfileHref } from "./links";
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
  clubs?: string[];
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

function normalizeClubName(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
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

type WorkspaceCrumb = {
  key: string;
  label: string;
  current?: boolean;
  onClick?: () => void;
};

export function CompetitionsView(props: {
  initialList?: Competition[];
  initialDetail?: CompetitionDetailResponse | null;
}) {
  const [competitionId, setCompetitionId] = useState("");
  const [workspaceMode, setWorkspaceMode] = useState("summary");
  const [selectedEvent, setSelectedEvent] = useState("");
  const [selectedEntryId, setSelectedEntryId] = useState("");
  const [selectedDiveId, setSelectedDiveId] = useState("");
  const [analysisView, setAnalysisView] = useState("overview");
  const [selectedClub, setSelectedClub] = useState("");
  const [focusTarget, setFocusTarget] = useState("");
  const [sourceContext, setSourceContext] = useState("");
  const [list, setList] = useState<Competition[]>(props.initialList || []);
  const [detail, setDetail] = useState<CompetitionDetailResponse | null>(props.initialDetail || null);
  const [error, setError] = useState<string | null>(null);
  const [visibleClubRosterCount, setVisibleClubRosterCount] = useState(10);

  useEffect(() => {
    setCompetitionId(readQueryParam("id"));
    const requestedView = readQueryParam("view");
    setWorkspaceMode(requestedView ? "detailed" : "summary");
    setSelectedEvent(readQueryParam("event"));
    setSelectedEntryId(readQueryParam("entry"));
    setSelectedDiveId(readQueryParam("dive"));
    setSelectedClub(readQueryParam("club"));
    setAnalysisView(readQueryParam("view") || "overview");
    setFocusTarget(readQueryParam("focus"));
    setSourceContext(readQueryParam("from"));
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
            setWorkspaceMode("detailed");
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

  useEffect(() => {
    setVisibleClubRosterCount(10);
  }, [competitionId, selectedEvent, selectedClub]);

  const eventScoped = useMemo(() => {
    if (!detail) {
      return null;
    }

    const currentEvent = selectedEvent || detail.eventSummaries[0]?.eventName || "";
    const eventSummary =
      detail.eventSummaries.find((event) => event.eventName === currentEvent) ||
      detail.eventSummaries[0] ||
      null;

    const athleteByName = new Map(
      detail.athletes.map((athlete) => [normalizePersonName(athlete.name), athlete]),
    );
    const requestedClub = selectedClub ? normalizeClubName(selectedClub) : "";

    const allDives = detail.dives.filter((dive) => dive.eventName === currentEvent);
    const allEntries = detail.entries
      .filter((entry) => entry.eventName === currentEvent)
      .map((entry) => ({
        ...entry,
        dives: allDives.filter((dive) => dive.entryId === entry.id),
        clubs: entry.participantNames
          .map((name) => athleteByName.get(normalizePersonName(name))?.club || null)
          .filter(Boolean) as string[],
      }))
      .sort((left, right) => {
        const leftRank = left.rank ?? Number.POSITIVE_INFINITY;
        const rightRank = right.rank ?? Number.POSITIVE_INFINITY;
        if (leftRank !== rightRank) {
          return leftRank - rightRank;
        }
        return (right.finalTotal || 0) - (left.finalTotal || 0);
      });

    const clubEntries = requestedClub
      ? allEntries.filter((entry) =>
          (entry.clubs || []).some((club) => normalizeClubName(club) === requestedClub),
        )
      : [];
    const activeEntries = analysisView === "club" && requestedClub ? clubEntries : allEntries;
    const activeEntryIds = new Set(activeEntries.map((entry) => entry.id));
    const dives = allDives.filter((dive) => !dive.entryId || activeEntryIds.has(dive.entryId));
    const entries = activeEntries;

    const selectedEntry =
      entries.find((entry) => String(entry.id) === selectedEntryId) || entries[0] || null;
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

    const eventClubs = Array.from(
      new Set(
        allEntries.flatMap((entry) => (entry.clubs || []).filter(Boolean)),
      ),
    ).sort((left, right) => left.localeCompare(right));

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
      eventClubs,
      selectedClub,
      clubEntries,
      clubRoster: detail.athletes
        .filter((athlete) => normalizeClubName(athlete.club) === requestedClub)
        .sort((left, right) => (right.finalTotal || 0) - (left.finalTotal || 0)),
      isSynchro: eventSummary?.eventType === "synchro",
    };
  }, [analysisView, detail, selectedClub, selectedEntryId, selectedEvent]);

  useEffect(() => {
    if (!selectedDiveId || (analysisView !== "ledger" && analysisView !== "athlete")) {
      return;
    }
    if (typeof document === "undefined") {
      return;
    }
    let attempts = 0;
    const scrollToDive = () => {
      const focusedRow = document.querySelector<HTMLElement>(
        `.analysis-panel:not([hidden]) [data-dive-id="${selectedDiveId}"]`,
      );
      if (!focusedRow) {
        attempts += 1;
        if (attempts < 8) {
          window.setTimeout(scrollToDive, 120);
        }
        return;
      }
      const ledgerPanel = focusedRow.closest<HTMLElement>(".panel");
      if (ledgerPanel) {
        const top = ledgerPanel.getBoundingClientRect().top + window.scrollY - 24;
        window.scrollTo({ top, behavior: "auto" });
      }
      const rowTop = focusedRow.getBoundingClientRect().top + window.scrollY - 120;
      window.scrollTo({ top: rowTop, behavior: "auto" });
    };
    scrollToDive();
  }, [analysisView, selectedDiveId, eventScoped?.currentEvent, selectedEntryId]);

  useEffect(() => {
    if (analysisView !== "athlete" || focusTarget !== "progression") {
      return;
    }
    if (typeof document === "undefined") {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      const panel = document.querySelector<HTMLElement>(".focus-table-panel");
      if (!panel) {
        return;
      }
      const top = panel.getBoundingClientRect().top + window.scrollY - 24;
      window.scrollTo({ top, behavior: "auto" });
    }, 120);
    return () => window.clearTimeout(timeoutId);
  }, [analysisView, focusTarget, competitionId, selectedEvent, selectedEntryId]);

  function openCompetition(id: number) {
    const value = String(id);
    setCompetitionId(value);
    setSelectedEntryId("");
    setSelectedDiveId("");
    setSelectedClub("");
    setAnalysisView("overview");
    setWorkspaceMode("summary");
    writeQueryParam("id", value);
    writeQueryParam("club", "");
    writeQueryParam("dive", "");
    writeQueryParam("view", "overview");
  }

  function openEvent(eventName: string) {
    setSelectedEvent(eventName);
    setSelectedEntryId("");
    setSelectedDiveId("");
    setAnalysisView("overview");
    setWorkspaceMode("summary");
    writeQueryParam("event", eventName);
    writeQueryParam("entry", "");
    writeQueryParam("dive", "");
    writeQueryParam("view", "overview");
  }

  function openEntryInEvent(entryId: number) {
    const value = String(entryId);
    setSelectedEntryId(value);
    setSelectedDiveId("");
    setSelectedClub("");
    setAnalysisView("athlete");
    setWorkspaceMode("detailed");
    writeQueryParam("entry", value);
    writeQueryParam("dive", "");
    writeQueryParam("club", "");
    writeQueryParam("view", "athlete");
  }

  function openClubFocus(clubName: string) {
    setSelectedClub(clubName);
    setSelectedEntryId("");
    setSelectedDiveId("");
    setAnalysisView("club");
    setWorkspaceMode("detailed");
    writeQueryParam("club", clubName);
    writeQueryParam("entry", "");
    writeQueryParam("dive", "");
    writeQueryParam("view", "club");
  }

  const focusedDive =
    selectedDiveId && eventScoped
      ? eventScoped.dives.find((dive) => String(dive.id) === selectedDiveId) || null
      : null;

  const workspaceCrumbs: WorkspaceCrumb[] = detail && eventScoped
    ? [
        {
          key: "competition",
          label: detail.competition.name,
          onClick: () => {
            setSelectedEntryId("");
            setSelectedDiveId("");
            setSelectedClub("");
            setAnalysisView("overview");
            writeQueryParam("entry", "");
            writeQueryParam("dive", "");
            writeQueryParam("club", "");
            writeQueryParam("view", "overview");
          },
        },
        {
          key: "event",
          label: eventScoped.currentEvent,
          onClick: () => openEvent(eventScoped.currentEvent),
        },
        ...(selectedClub
          ? [
              {
                key: "club-mode",
                label: "Club focus",
                onClick: () => {
                  setAnalysisView("club");
                  writeQueryParam("view", "club");
                },
              },
              {
                key: "club-name",
                label: selectedClub,
                current: analysisView === "club" && !selectedDiveId,
                onClick: () => openClubFocus(selectedClub),
              },
            ]
          : analysisView === "athlete" && eventScoped.selectedEntry
            ? [
                {
                  key: "focus-mode",
                  label: eventScoped.isSynchro ? "Pair focus" : "Athlete focus",
                  onClick: () => {
                    setAnalysisView("athlete");
                    writeQueryParam("view", "athlete");
                  },
                },
                {
                  key: "focus-entry",
                  label: eventScoped.selectedEntry.entryName,
                  current: !selectedDiveId,
                  onClick: () => openEntryInEvent(eventScoped.selectedEntry!.id),
                },
              ]
            : analysisView === "ledger"
              ? [
                  {
                    key: "ledger-mode",
                    label: "All dives",
                    current: !selectedDiveId,
                    onClick: () => {
                      setAnalysisView("ledger");
                      writeQueryParam("view", "ledger");
                    },
                  },
                ]
              : [
                  {
                    key: "overview-mode",
                    label: "Event overview",
                    current: true,
                    onClick: () => {
                      setAnalysisView("overview");
                      writeQueryParam("view", "overview");
                    },
                  },
                ]),
        ...(focusedDive
          ? [
              {
                key: "dive",
                label: focusedDive.diveCode,
                current: true,
              },
            ]
          : []),
      ]
    : [];
  const competitionContextLabel =
    detail && eventScoped ? `${detail.competition.name} / ${eventScoped.currentEvent}` : "Competition workspace";
  const leaderEntry = eventScoped?.entries[0] || null;
  const secondEntry = eventScoped?.entries[1] || null;
  const leadingClub = eventScoped?.eventClubs[0] || null;
  const leaderMargin =
    leaderEntry && secondEntry && typeof leaderEntry.finalTotal === "number" && typeof secondEntry.finalTotal === "number"
      ? leaderEntry.finalTotal - secondEntry.finalTotal
      : null;
  const repeatedCode = eventScoped?.diveCodeBreakdown[0] || null;
  const repeatedCodeShare =
    repeatedCode && eventScoped?.dives.length
      ? Math.round((repeatedCode.count / Math.max(eventScoped.dives.length, 1)) * 100)
      : null;
  const eventPressureNote =
    leaderMargin !== null
      ? leaderMargin <= 12
        ? "Tight field at the top of this event."
        : "Clear separation at the top of this event."
      : "Not enough ranked entries to assess separation.";

  return (
    <div className="page-grid">
      {sourceContext ? <div className="workspace-origin-strip">Opened from: {sourceContext}</div> : null}
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
              <span>Competition</span>
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

          <section className="panel mode-panel">
            <div className="section-head">
              <h2>Competition view</h2>
              <span className="muted">Start with the event story, then expand into the full competition review when needed</span>
            </div>
            <div className="toolbar">
              <button className="button secondary" data-active={workspaceMode === "summary"} onClick={() => setWorkspaceMode("summary")} type="button">
                Summary
              </button>
              <button className="button secondary" data-active={workspaceMode === "detailed"} onClick={() => setWorkspaceMode("detailed")} type="button">
                Detailed analysis
              </button>
            </div>
          </section>

          <section className="two-column">
            <div className="panel">
              <div className="section-head">
                <h2>Event brief</h2>
                <span className="muted">What happened in this event, who set the pace, and where to review it next</span>
              </div>
              <div className="stack compact-stack">
                <div className="list-item compact-item">
                  <strong>Selected event</strong>
                  <div className="muted">
                    {eventScoped.currentEvent} · {eventScoped.isSynchro ? "Synchro" : "Individual"} · winning total {formatScore(eventScoped.eventSummary?.winningScore || null)}
                  </div>
                </div>
                <div className="list-item compact-item">
                  <strong>Current leader</strong>
                  <div className="muted">
                    {leaderEntry
                      ? `${leaderEntry.entryName} · ${rankLabel(leaderEntry.rank)} · total ${formatScore(leaderEntry.finalTotal)}`
                      : "No ranked entry recorded"}
                  </div>
                </div>
                <div className="list-item compact-item">
                  <strong>Most-used dive code</strong>
                  <div className="muted">
                    {eventScoped.diveCodeBreakdown[0]
                      ? `${eventScoped.diveCodeBreakdown[0].diveCode} · ${eventScoped.diveCodeBreakdown[0].count} uses`
                      : "No dive-code pattern recorded"}
                  </div>
                </div>
                <div className="list-item compact-item">
                  <strong>Field pressure</strong>
                  <div className="muted">{eventPressureNote}</div>
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="section-head">
                <h2>Coaching read</h2>
                <span className="muted">A quick read before opening the deeper result tables</span>
              </div>
              <div className="coach-grid">
                <div className="coach-card">
                  <strong>Leader</strong>
                  <span>{leaderEntry?.entryName || "n/a"}</span>
                  <small>{leaderEntry ? `${leaderEntry.diveCount} dives · best dive ${formatScore(leaderEntry.bestDive)}` : "No ranked entry"}</small>
                </div>
                <div className="coach-card">
                  <strong>Event depth</strong>
                  <span>{eventScoped.entries.length} entries</span>
                  <small>{eventScoped.diveCodeBreakdown.length} tracked dive codes in this event</small>
                </div>
                <div className="coach-card">
                  <strong>Leading club signal</strong>
                  <span>{leadingClub || "n/a"}</span>
                  <small>{eventScoped.eventClubs.length} clubs represented in the selected event</small>
                </div>
                <div className="coach-card coach-card-warning">
                  <strong>Worth a second look</strong>
                  <span>{eventScoped.diveCodeBreakdown[0]?.diveCode || "No dive-code alert"}</span>
                  <small>
                    {eventScoped.diveCodeBreakdown[0]
                      ? `${eventScoped.diveCodeBreakdown[0].count} repeated uses make this code worth reviewing in context`
                      : "No repeated code pattern detected"}
                  </small>
                </div>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="section-head">
              <h2>Field pulse</h2>
              <span className="muted">Light signals that explain how competitive and varied this event feels before you open the full review</span>
            </div>
            <div className="trend-grid">
              <div className="trend-card">
                <strong>Margin at the top</strong>
                <span>{leaderMargin !== null ? `${formatScore(leaderMargin)} points` : "n/a"}</span>
                <small>{eventPressureNote}</small>
              </div>
              <div className="trend-card">
                <strong>Club spread</strong>
                <span>{eventScoped.eventClubs.length} clubs</span>
                <small>{leadingClub ? `${leadingClub} currently leads the field signal` : "No club signal recorded"}</small>
              </div>
              <div className="trend-card trend-card-wide">
                <strong>Code concentration</strong>
                <span>
                  {repeatedCode
                    ? `${repeatedCode.diveCode} appears ${repeatedCode.count} times${repeatedCodeShare !== null ? ` (${repeatedCodeShare}% of logged dives)` : ""}`
                    : "No repeated dive-code pattern recorded"}
                </span>
                <small>
                  {repeatedCode
                    ? `Average score ${formatScore(repeatedCode.averageScore)} on the most-used code in this event`
                    : "Open detailed analysis if you want the full dive-code mix"}
                </small>
              </div>
            </div>
          </section>

          <section className="panel context-panel">
            <div className="section-head">
              <h2>Review next</h2>
              <span className="muted">Use these guided entry points instead of starting from the full table stack</span>
            </div>
            <div className="context-links">
              {leaderEntry ? (
                <a
                  className="context-link-card"
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    setWorkspaceMode("detailed");
                    openEntryInEvent(leaderEntry.id);
                  }}
                >
                  <strong>Review leader</strong>
                  <span>{leaderEntry.entryName}</span>
                </a>
              ) : null}
              <a
                className="context-link-card"
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  setWorkspaceMode("detailed");
                  setAnalysisView("overview");
                  writeQueryParam("view", "overview");
                }}
              >
                <strong>Open event summary</strong>
                <span>{eventScoped.currentEvent}</span>
              </a>
              {leaderEntry ? (
                <a
                  className="context-link-card"
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    setWorkspaceMode("detailed");
                    setAnalysisView("ledger");
                    writeQueryParam("view", "ledger");
                  }}
                >
                  <strong>Open all dives</strong>
                  <span>Review the full event dive log</span>
                </a>
              ) : null}
              {leadingClub ? (
                <a
                  className="context-link-card"
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    setWorkspaceMode("detailed");
                    openClubFocus(leadingClub);
                  }}
                >
                  <strong>Open club view</strong>
                  <span>{leadingClub}</span>
                </a>
              ) : null}
            </div>
          </section>

          <section className="profile-grid">
            <div className="panel">
              <h2>Who to review first</h2>
              <div className="stack compact-stack">
                {eventScoped.entries.slice(0, 4).map((entry) => (
                  <a
                    className="list-item compact-item"
                    href="#"
                    key={entry.id}
                    onClick={(event) => {
                      event.preventDefault();
                      setWorkspaceMode("detailed");
                      openEntryInEvent(entry.id);
                    }}
                  >
                    <div className="between-row">
                      <div className="competition-history-main">
                        <span className={`rank-mark rank-${entry.rank || "other"}`}>
                          <span className="rank-mark-glyph" aria-hidden="true">
                            {rankGlyph(entry.rank)}
                          </span>
                          <span>{rankLabel(entry.rank)}</span>
                        </span>
                        <strong>{entry.entryName}</strong>
                      </div>
                      <span>{formatScore(entry.finalTotal)}</span>
                    </div>
                    <div className="muted" style={{ marginTop: 6 }}>
                      {entry.diveCount} dives · best dive {formatScore(entry.bestDive)}
                    </div>
                  </a>
                ))}
              </div>
            </div>

            <div className="panel">
              <h2>Event navigator</h2>
              <div className="focus-entry-list">
                {detail.eventSummaries.slice(0, 8).map((event) => (
                  <button
                    className="focus-entry-item"
                    data-active={event.eventName === eventScoped.currentEvent}
                    key={event.eventName}
                    onClick={() => openEvent(event.eventName)}
                    type="button"
                  >
                    <strong>{event.eventName}</strong>
                    <span>
                      {event.athleteCount} {event.eventType === "synchro" ? "entries" : "athletes"} · {event.diveCount} dives
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="panel">
            <h2>Competition review</h2>
            {workspaceCrumbs.length > 0 ? (
              <div className="workspace-context" aria-label="Competition context trail">
                {workspaceCrumbs.map((crumb, index) => (
                  <span className="workspace-context-item" key={crumb.key}>
                    {crumb.onClick && !crumb.current ? (
                      <button className="workspace-context-link" onClick={crumb.onClick} type="button">
                        {crumb.label}
                      </button>
                    ) : (
                      <span className="workspace-context-current">{crumb.label}</span>
                    )}
                    {index < workspaceCrumbs.length - 1 ? (
                      <span aria-hidden="true" className="workspace-context-separator">
                        /
                      </span>
                    ) : null}
                  </span>
                ))}
              </div>
            ) : null}
            {workspaceMode === "detailed" ? (
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
                  <div className="rail-label">Competition details</div>
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
                    {eventScoped.eventClubs.length > 0 ? (
                      <div className="list-item compact-item">
                        <strong>Clubs in event</strong>
                        <div className="cluster">
                          {eventScoped.eventClubs.map((club) => (
                            <button
                              className="chip button-chip"
                              data-active={normalizeClubName(selectedClub) === normalizeClubName(club)}
                              key={club}
                              onClick={() => openClubFocus(club)}
                              type="button"
                            >
                              {club}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
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
                      Event summary
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
                      All dives
                    </button>
                    {selectedClub ? (
                      <button
                        className="toggle-pill"
                        data-active={analysisView === "club"}
                        onClick={() => {
                          setAnalysisView("club");
                          writeQueryParam("view", "club");
                        }}
                        type="button"
                      >
                        Club view
                      </button>
                    ) : null}
                  </div>
                  <div className="muted">
                    {analysisView === "overview"
                      ? "Use the event summary to compare the field before drilling into a specific entry."
                      : analysisView === "athlete"
                        ? eventScoped.isSynchro
                          ? "Keep one pair in focus with both diver names and split judging visible."
                          : "Keep one athlete in focus and inspect their progression without the rest of the report in the way."
                        : analysisView === "club"
                          ? "Keep one club in view across the current event without losing the full competition context."
                          : "Open the full event log only when you need per-dive inspection or auditing."}
                  </div>
                </div>

                <div
                  aria-hidden={analysisView !== "overview"}
                  className="analysis-panel"
                  hidden={analysisView !== "overview"}
                >
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
                      <h2>Dive-code mix</h2>
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
                </div>

                <div
                  aria-hidden={analysisView !== "athlete"}
                  className="analysis-panel"
                  hidden={analysisView !== "athlete"}
                >
                  {eventScoped.selectedEntry ? (
                    <div className="focus-layout">
                    <div className="panel focus-summary-panel">
                      <h2>{eventScoped.isSynchro ? "Selected pair" : "Selected athlete"}</h2>
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
                            <a
                              className="chip"
                              href={athleteProfileHref(member.id, {
                                from: `${competitionContextLabel} / ${eventScoped.isSynchro ? "Pair focus" : "Athlete focus"}`,
                              })}
                              key={member.id}
                            >
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

                    <div
                      className="panel focus-table-panel"
                      data-emphasis={focusTarget === "progression"}
                      id="progression-panel"
                    >
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
                              data-focused={analysisView === "athlete" && String(dive.id) === selectedDiveId}
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
                  ) : (
                    <div className="panel">
                      <h2>{eventScoped.isSynchro ? "Pair focus" : "Athlete focus"}</h2>
                      <p className="muted">Select an entry from the event leaderboard to inspect the progression table.</p>
                    </div>
                  )}
                </div>

                <div
                  aria-hidden={analysisView !== "club"}
                  className="analysis-panel"
                  hidden={analysisView !== "club"}
                >
                  {selectedClub ? (
                    <div className="two-column">
                      <div className="panel">
                        <h2>Club view</h2>
                        <div className="stack compact-stack">
                          <div className="list-item compact-item">
                            <strong>{selectedClub}</strong>
                            <div className="muted">
                              {eventScoped.clubEntries.length} {eventScoped.isSynchro ? "entries" : "athletes"} in{" "}
                              {eventScoped.currentEvent}
                            </div>
                          </div>
                          <div className="cluster">
                            <a className="chip" href={clubProfileHref(selectedClub)}>
                              Open club profile
                            </a>
                            <span className="chip">{eventScoped.clubRoster.length} roster athletes in competition</span>
                          </div>
                          <div className="analysis-subpanel">
                            <div className="rail-label">Club athletes in competition</div>
                            <div className="focus-entry-list">
                              {eventScoped.clubRoster.slice(0, visibleClubRosterCount).map((athlete) => (
                                <a
                                  className="focus-entry-item"
                                  href={athleteProfileHref(athlete.id, {
                                    from: `${competitionContextLabel} / Club focus / ${selectedClub}`,
                                  })}
                                  key={athlete.id}
                                >
                                  <strong>{athlete.name}</strong>
                                  <span>
                                    {rankGlyph(athlete.rank)} {rankLabel(athlete.rank)} · {formatScore(athlete.finalTotal)}
                                  </span>
                                </a>
                              ))}
                            </div>
                            {eventScoped.clubRoster.length > visibleClubRosterCount ? (
                              <div style={{ marginTop: 14 }}>
                                <button
                                  className="button secondary"
                                  onClick={() => setVisibleClubRosterCount((count) => count + 10)}
                                  type="button"
                                >
                                  Show 10 more
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="panel">
                        <h2>Club entries in event</h2>
                        <table className="table">
                          <thead>
                            <tr>
                              <th>{eventScoped.isSynchro ? "Entry" : "Athlete"}</th>
                              <th>Rank</th>
                              <th>Dives</th>
                              <th>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {eventScoped.clubEntries.map((entry) => (
                              <tr key={entry.id} onClick={() => openEntryInEvent(entry.id)}>
                                <td>
                                  <strong>{entry.entryName}</strong>
                                  <div className="muted">{entry.participantNames.join(" / ")}</div>
                                </td>
                                <td>{rankGlyph(entry.rank)} {rankLabel(entry.rank)}</td>
                                <td>{entry.diveCount}</td>
                                <td>{formatScore(entry.finalTotal)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="panel">
                      <h2>Club view</h2>
                      <p className="muted">Open this view from a club profile to keep the competition filtered to one club.</p>
                    </div>
                  )}
                </div>

                <div
                  aria-hidden={analysisView !== "ledger"}
                  className="analysis-panel"
                  hidden={analysisView !== "ledger"}
                >
                  <div className="panel" id="ledger-panel">
                    <h2>All dives</h2>
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
                                            <a
                                              className="ledger-link"
                                              href={athleteProfileHref(athlete.id, {
                                                from: `${competitionContextLabel} / All dives`,
                                              })}
                                            >
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
                              data-focused={analysisView === "ledger" && String(dive.id) === selectedDiveId}
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
                </div>
              </div>
            </div>
            ) : null}
          </section>
        </>
      ) : null}
    </div>
  );
}
