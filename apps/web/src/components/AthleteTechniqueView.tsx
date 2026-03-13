import { useEffect, useMemo, useState } from "react";
import { parseDiveCode, type DiveGroupId } from "../../../../packages/dive-code";
import { fetchJson } from "./api";
import { athleteProfileHref, competitionFocusHref } from "./links";
import { SortableHeader } from "./SortableHeader";
import { nextSortDirection, parseCompetitionDate, type SortDirection } from "./tableSorting";

type GroupSignal = {
  label: string;
  count: number;
  averageScore: number | null;
  averageDifficulty: number | null;
  bestScore: number | null;
  scoreDeviation: number | null;
};

type AthleteTechniqueProfile = {
  athlete: {
    id: number;
    name: string;
    diveCount: number;
    mostUsedDiveCode: string | null;
    bestTotal: number | null;
  };
  athleteBrief?: {
    latestResult: {
      label: string;
      competitionId: number;
      entryId: number | null;
      eventName: string | null;
    } | null;
  };
  techniqueSummary?: {
    mostReliableGroup: GroupSignal | null;
    highestScoringGroup: GroupSignal | null;
    highestDifficultyGroup: GroupSignal | null;
    lowSampleGroups: string[];
    groupsNotUsedRecently: string[];
    groups: GroupSignal[];
  };
  dives: Array<{
    id: number;
    entryId: number | null;
    eventName: string | null;
    eventType: "individual" | "synchro";
    entryName: string | null;
    diveCode: string;
    description: string | null;
    difficulty: number | null;
    finalScore: number | null;
    cumulativeScore: number | null;
    competitionId: number;
    competitionName: string;
    competitionDate: string | null;
  }>;
};

type CodeSortKey = "code" | "attempts" | "average" | "best" | "difficulty" | "latest";
type ViewMode = "summary" | "detailed";

function formatScore(value: number | null) {
  if (typeof value !== "number") {
    return "n/a";
  }
  return value.toFixed(2).replace(/\.00$/, "");
}

function readSearchState(): { group: string; mode: ViewMode; from: string | null } {
  if (typeof window === "undefined") {
    return { group: "", mode: "summary" as ViewMode, from: null as string | null };
  }
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode") === "detailed" ? "detailed" : "summary";
  return {
    group: params.get("group") || "",
    mode,
    from: params.get("from") || null,
  };
}

function writeSearchState(input: { groupId?: DiveGroupId | null; mode?: ViewMode | null; from?: string | null }) {
  if (typeof window === "undefined") {
    return;
  }
  const url = new URL(window.location.href);
  if (input.groupId) {
    url.searchParams.set("group", String(input.groupId));
  } else {
    url.searchParams.delete("group");
  }
  if (input.mode) {
    url.searchParams.set("mode", input.mode);
  } else {
    url.searchParams.delete("mode");
  }
  if (input.from) {
    url.searchParams.set("from", input.from);
  }
  window.history.replaceState({}, "", url.toString());
}

export function AthleteTechniqueView(props: {
  athleteId: string;
  initialDetail?: AthleteTechniqueProfile | null;
}) {
  const [detail, setDetail] = useState<AthleteTechniqueProfile | null>(props.initialDetail || null);
  const [error, setError] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<DiveGroupId | null>(null);
  const [sourceContext, setSourceContext] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("summary");
  const [codeQuery, setCodeQuery] = useState("");
  const [codeSortKey, setCodeSortKey] = useState<CodeSortKey>("attempts");
  const [codeSortDirection, setCodeSortDirection] = useState<SortDirection>("desc");
  const [visibleRecentCount, setVisibleRecentCount] = useState(5);

  useEffect(() => {
    fetchJson<AthleteTechniqueProfile>(`/athletes/${props.athleteId}`)
      .then(setDetail)
      .catch((err) => setError(err.message));
  }, [props.athleteId]);

  const parsedDives = useMemo(() => {
    if (!detail) {
      return [];
    }
    return detail.dives
      .map((dive) => ({
        ...dive,
        parsed: parseDiveCode(dive.diveCode),
      }))
      .filter((dive) => dive.parsed.valid && dive.parsed.group);
  }, [detail]);

  const groupCards = useMemo(() => {
    const total = parsedDives.length || 1;
    return Array.from(
      parsedDives.reduce((map, dive) => {
        const group = dive.parsed.group!;
        const current =
          map.get(group.id) ||
          {
            id: group.id,
            label: group.label,
            description: group.description,
            count: 0,
            uniqueCodes: new Set<string>(),
            bestScore: null as number | null,
            averageScoreSum: 0,
            averageScoreCount: 0,
            averageDifficultySum: 0,
            averageDifficultyCount: 0,
            flyingCount: 0,
            twistCount: 0,
          };

        current.count += 1;
        current.uniqueCodes.add(dive.parsed.normalizedCode);
        if (typeof dive.finalScore === "number") {
          current.bestScore = Math.max(current.bestScore || 0, dive.finalScore);
          current.averageScoreSum += dive.finalScore;
          current.averageScoreCount += 1;
        }
        if (typeof dive.difficulty === "number") {
          current.averageDifficultySum += dive.difficulty;
          current.averageDifficultyCount += 1;
        }
        if (dive.parsed.flying) {
          current.flyingCount += 1;
        }
        if (typeof dive.parsed.halfTwists === "number" && dive.parsed.halfTwists > 0) {
          current.twistCount += 1;
        }
        map.set(group.id, current);
        return map;
      }, new Map<DiveGroupId, any>()),
    )
      .map(([, value]) => ({
        ...value,
        share: Math.round((value.count / total) * 100),
        uniqueCodes: value.uniqueCodes.size,
        averageScore:
          value.averageScoreCount > 0
            ? Number((value.averageScoreSum / value.averageScoreCount).toFixed(2))
            : null,
        averageDifficulty:
          value.averageDifficultyCount > 0
            ? Number((value.averageDifficultySum / value.averageDifficultyCount).toFixed(2))
            : null,
      }))
      .sort((left, right) => left.id - right.id);
  }, [parsedDives]);

  useEffect(() => {
    const state = readSearchState();
    const requestedGroup = Number(state.group);
    const validRequestedGroup =
      requestedGroup && groupCards.some((group) => group.id === requestedGroup)
        ? (requestedGroup as DiveGroupId)
        : null;
    setSelectedGroup(validRequestedGroup || groupCards[0]?.id || null);
    setViewMode(state.mode);
    setSourceContext(state.from);
    setCodeQuery("");
    setVisibleRecentCount(5);
  }, [props.athleteId, groupCards]);

  const selectedGroupCard = groupCards.find((group) => group.id === selectedGroup) || groupCards[0] || null;
  const athleteContextLabel = detail ? `Dive technique / ${detail.athlete.name}` : "Dive technique";

  const codeRows = useMemo(() => {
    if (!selectedGroupCard) {
      return [];
    }

    const rows = Array.from(
      parsedDives
        .filter((dive) => dive.parsed.group?.id === selectedGroupCard.id)
        .reduce((map, dive) => {
          const current =
            map.get(dive.parsed.normalizedCode) ||
            {
              code: dive.parsed.normalizedCode,
              structure: dive.parsed.structure,
              position: dive.parsed.position,
              attempts: 0,
              averageScoreSum: 0,
              averageScoreCount: 0,
              bestScore: null as number | null,
              averageDifficultySum: 0,
              averageDifficultyCount: 0,
              latestCompetitionDate: null as string | null,
              latestCompetitionName: null as string | null,
              bestDiveId: null as number | null,
              bestCompetitionId: null as number | null,
              bestEventName: null as string | null,
              bestEntryId: null as number | null,
            };

          current.attempts += 1;
          if (typeof dive.finalScore === "number") {
            current.averageScoreSum += dive.finalScore;
            current.averageScoreCount += 1;
            if (dive.finalScore >= (current.bestScore || 0)) {
              current.bestScore = dive.finalScore;
              current.bestDiveId = dive.id;
              current.bestCompetitionId = dive.competitionId;
              current.bestEventName = dive.eventName;
              current.bestEntryId = dive.entryId;
            }
          }
          if (typeof dive.difficulty === "number") {
            current.averageDifficultySum += dive.difficulty;
            current.averageDifficultyCount += 1;
          }
          if (parseCompetitionDate(dive.competitionDate) >= parseCompetitionDate(current.latestCompetitionDate)) {
            current.latestCompetitionDate = dive.competitionDate;
            current.latestCompetitionName = dive.competitionName;
          }

          map.set(dive.parsed.normalizedCode, current);
          return map;
        }, new Map<string, any>()),
    ).map(([, value]) => ({
      ...value,
      averageScore:
        value.averageScoreCount > 0
          ? Number((value.averageScoreSum / value.averageScoreCount).toFixed(2))
          : null,
      averageDifficulty:
        value.averageDifficultyCount > 0
          ? Number((value.averageDifficultySum / value.averageDifficultyCount).toFixed(2))
          : null,
    }));

    const normalizedQuery = codeQuery.trim().toLowerCase();
    const filtered = rows.filter(
      (row) =>
        !normalizedQuery ||
        row.code.toLowerCase().includes(normalizedQuery) ||
        String(row.structure || "").toLowerCase().includes(normalizedQuery),
    );

    if (!codeSortDirection) {
      return filtered;
    }

    filtered.sort((left, right) => {
      if (codeSortKey === "code") {
        return left.code.localeCompare(right.code);
      }
      if (codeSortKey === "average") {
        return (left.averageScore || 0) - (right.averageScore || 0);
      }
      if (codeSortKey === "best") {
        return (left.bestScore || 0) - (right.bestScore || 0);
      }
      if (codeSortKey === "difficulty") {
        return (left.averageDifficulty || 0) - (right.averageDifficulty || 0);
      }
      if (codeSortKey === "latest") {
        return parseCompetitionDate(left.latestCompetitionDate) - parseCompetitionDate(right.latestCompetitionDate);
      }
      return left.attempts - right.attempts;
    });

    if (codeSortDirection === "desc") {
      filtered.reverse();
    }

    return filtered;
  }, [codeQuery, codeSortDirection, codeSortKey, parsedDives, selectedGroupCard]);

  const recentDives = useMemo(() => {
    if (!selectedGroupCard) {
      return [];
    }
    return [...parsedDives]
      .filter((dive) => dive.parsed.group?.id === selectedGroupCard.id)
      .sort(
        (left, right) =>
          parseCompetitionDate(right.competitionDate) - parseCompetitionDate(left.competitionDate) ||
          right.id - left.id,
      );
  }, [parsedDives, selectedGroupCard]);

  const visibleRecentDives = recentDives.slice(0, visibleRecentCount);

  const technicalMetrics = useMemo(() => {
    const uniqueCodes = new Set(parsedDives.map((dive) => dive.parsed.normalizedCode));
    const flyingDives = parsedDives.filter((dive) => dive.parsed.flying).length;
    const twistingOrArmstand = parsedDives.filter(
      (dive) => dive.parsed.group?.id === 5 || dive.parsed.group?.id === 6,
    ).length;
    const maxDifficulty = parsedDives.reduce(
      (max, dive) => Math.max(max, typeof dive.difficulty === "number" ? dive.difficulty : 0),
      0,
    );

    return {
      groupsUsed: groupCards.length,
      uniqueCodes: uniqueCodes.size,
      flyingDives,
      twistingOrArmstand,
      maxDifficulty: maxDifficulty || null,
    };
  }, [groupCards.length, parsedDives]);

  const latestResultHref =
    detail?.athleteBrief?.latestResult
      ? competitionFocusHref({
          competitionId: detail.athleteBrief.latestResult.competitionId,
          eventName: detail.athleteBrief.latestResult.eventName,
          entryId: detail.athleteBrief.latestResult.entryId,
          from: `${athleteContextLabel} / Review latest result`,
        })
      : null;

  const latestTwistingDive = recentDives.find((dive) => dive.parsed.group?.id === 5);

  function cycleCodeSort(key: CodeSortKey) {
    const nextDirection = nextSortDirection(codeSortKey, codeSortDirection, key, {
      textMode: key === "code",
    });
    setCodeSortKey(key);
    setCodeSortDirection(nextDirection);
  }

  function selectGroup(groupId: DiveGroupId) {
    setSelectedGroup(groupId);
    setVisibleRecentCount(5);
    writeSearchState({ groupId, mode: viewMode, from: sourceContext });
  }

  function changeMode(mode: ViewMode) {
    setViewMode(mode);
    writeSearchState({ groupId: selectedGroup, mode, from: sourceContext });
  }

  if (error) {
    return <div className="notice">{error}</div>;
  }

  if (!detail) {
    return <div className="notice">Loading dive technique...</div>;
  }

  return (
    <div className="page-grid">
      {sourceContext ? <div className="workspace-origin-strip">Opened from: {sourceContext}</div> : null}

      <section className="profile-hero panel">
        <div>
          <h2>{detail.athlete.name}</h2>
          <div className="profile-meta-row">
            <span>{detail.athlete.diveCount} dives reviewed</span>
            <span>{technicalMetrics.groupsUsed} groups used</span>
            <span>{technicalMetrics.uniqueCodes} unique codes</span>
            <span>{detail.athlete.mostUsedDiveCode || "Most-used code not recorded"}</span>
          </div>
        </div>
      </section>

      <section className="panel mode-panel">
        <div className="section-head">
          <h2>Dive technique mode</h2>
          <span className="muted">Start with coaching takeaways, then expand into the full code table</span>
        </div>
        <div className="toolbar">
          <button className="button secondary" data-active={viewMode === "summary"} onClick={() => changeMode("summary")} type="button">
            Summary
          </button>
          <button className="button secondary" data-active={viewMode === "detailed"} onClick={() => changeMode("detailed")} type="button">
            Detailed analysis
          </button>
        </div>
      </section>

      <section className="metrics">
        <div className="metric">
          <span>Groups used</span>
          <strong>{technicalMetrics.groupsUsed}</strong>
          <small>{technicalMetrics.uniqueCodes} unique dive codes</small>
        </div>
        <div className="metric">
          <span>Most reliable group</span>
          <strong>{detail.techniqueSummary?.mostReliableGroup?.label || "n/a"}</strong>
          <small>
            {detail.techniqueSummary?.mostReliableGroup?.scoreDeviation
              ? `variance ${formatScore(detail.techniqueSummary.mostReliableGroup.scoreDeviation)}`
              : "Need more repeated attempts"}
          </small>
        </div>
        <div className="metric">
          <span>Highest scoring group</span>
          <strong>{detail.techniqueSummary?.highestScoringGroup?.label || "n/a"}</strong>
          <small>{formatScore(detail.techniqueSummary?.highestScoringGroup?.bestScore || null)}</small>
        </div>
        <div className="metric">
          <span>Highest difficulty group</span>
          <strong>{detail.techniqueSummary?.highestDifficultyGroup?.label || "n/a"}</strong>
          <small>avg DD {formatScore(detail.techniqueSummary?.highestDifficultyGroup?.averageDifficulty || null)}</small>
        </div>
      </section>

      <section className="two-column">
        <div className="panel">
          <div className="section-head">
            <h2>Technique brief</h2>
            <span className="muted">Coaching questions first, code detail second</span>
          </div>
          <div className="coach-grid">
            <div className="coach-card">
              <strong>Most reliable group</strong>
              <span>{detail.techniqueSummary?.mostReliableGroup?.label || "n/a"}</span>
              <small>
                {detail.techniqueSummary?.mostReliableGroup?.scoreDeviation
                  ? `Lowest variance across repeated dives`
                  : "Not enough repeated attempts"}
              </small>
            </div>
            <div className="coach-card">
              <strong>Highest scoring group</strong>
              <span>{detail.techniqueSummary?.highestScoringGroup?.label || "n/a"}</span>
              <small>best score {formatScore(detail.techniqueSummary?.highestScoringGroup?.bestScore || null)}</small>
            </div>
            <div className="coach-card">
              <strong>Highest difficulty group</strong>
              <span>{detail.techniqueSummary?.highestDifficultyGroup?.label || "n/a"}</span>
              <small>avg DD {formatScore(detail.techniqueSummary?.highestDifficultyGroup?.averageDifficulty || null)}</small>
            </div>
            <div className="coach-card coach-card-warning">
              <strong>Low sample groups</strong>
              <span>
                {detail.techniqueSummary?.lowSampleGroups.length
                  ? detail.techniqueSummary.lowSampleGroups.slice(0, 2).join(" · ")
                  : "None"}
              </span>
              <small>
                {detail.techniqueSummary?.lowSampleGroups.length
                  ? "More attempts needed before trusting the trend"
                  : "All active groups have enough history"}
              </small>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="section-head">
            <h2>Signals to watch</h2>
            <span className="muted">Gaps, pressure points, and next technical review paths</span>
          </div>
          <div className="stack compact-stack">
            <div className="list-item compact-item">
              <strong>Groups not used recently</strong>
              <div className="muted">
                {detail.techniqueSummary?.groupsNotUsedRecently.length
                  ? detail.techniqueSummary.groupsNotUsedRecently.join(" · ")
                  : "All active groups were present in the latest competition"}
              </div>
            </div>
            <div className="list-item compact-item">
              <strong>Flying dives</strong>
              <div className="muted">{technicalMetrics.flyingDives} flying attempts recorded</div>
            </div>
            <div className="list-item compact-item">
              <strong>Twisting or armstand exposure</strong>
              <div className="muted">{technicalMetrics.twistingOrArmstand} attempts across complex directional groups</div>
            </div>
            <div className="list-item compact-item">
              <strong>Highest difficulty seen</strong>
              <div className="muted">DD {formatScore(technicalMetrics.maxDifficulty)}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="panel context-panel">
        <div className="section-head">
          <h2>Quick paths</h2>
          <span className="muted">Move back into live performance context without rebuilding the path</span>
        </div>
        <div className="context-links">
          <a className="context-link-card" href={athleteProfileHref(props.athleteId, { from: `${athleteContextLabel} / Athlete profile` })}>
            <strong>Athlete profile</strong>
            <span>Return to the athlete overview and performance brief</span>
          </a>
          {latestResultHref ? (
            <a className="context-link-card" href={latestResultHref}>
              <strong>Review latest result</strong>
              <span>{detail.athleteBrief?.latestResult?.label}</span>
            </a>
          ) : null}
          {latestTwistingDive ? (
            <a
              className="context-link-card"
              href={competitionFocusHref({
                competitionId: latestTwistingDive.competitionId,
                eventName: latestTwistingDive.eventName,
                entryId: latestTwistingDive.entryId,
                diveId: latestTwistingDive.id,
                view: "ledger",
                hash: "ledger-panel",
                from: `${athleteContextLabel} / Review twisting dives`,
              })}
            >
              <strong>Review twisting dives</strong>
              <span>{latestTwistingDive.diveCode} · {latestTwistingDive.competitionName}</span>
            </a>
          ) : null}
        </div>
      </section>

      <section className="panel">
        <div className="section-head">
          <h2>Dive groups</h2>
          <span className="muted">Pick one group to inspect its repeated code patterns and competition attempts</span>
        </div>
        <div className="group-card-grid">
          {groupCards.map((group) => (
            <button
              className="group-card"
              data-active={group.id === selectedGroupCard?.id}
              key={group.id}
              onClick={() => selectGroup(group.id)}
              type="button"
            >
              <div className="group-card-head">
                <div>
                  <strong>{group.label}</strong>
                  <div className="muted">{group.description}</div>
                </div>
                <span>{group.share}%</span>
              </div>
              <div className="group-card-stats">
                <span>{group.count} dives</span>
                <span>{group.uniqueCodes} codes</span>
                <span>avg {formatScore(group.averageScore)}</span>
                <span>best {formatScore(group.bestScore)}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {selectedGroupCard ? (
        <>
          <section className="two-column">
            <div className="panel">
              <div className="section-head">
                <h2>{selectedGroupCard.label} profile</h2>
                <span className="muted">{selectedGroupCard.count} recorded dives</span>
              </div>
              <div className="stack compact-stack">
                <div className="list-item compact-item">
                  <strong>Share of current profile</strong>
                  <div className="muted">{selectedGroupCard.share}% of recorded dives</div>
                </div>
                <div className="list-item compact-item">
                  <strong>Average score</strong>
                  <div className="muted">{formatScore(selectedGroupCard.averageScore)}</div>
                </div>
                <div className="list-item compact-item">
                  <strong>Average difficulty</strong>
                  <div className="muted">{formatScore(selectedGroupCard.averageDifficulty)}</div>
                </div>
                <div className="list-item compact-item">
                  <strong>Technical note</strong>
                  <div className="muted">
                    {selectedGroupCard.flyingCount > 0
                      ? `${selectedGroupCard.flyingCount} flying attempts recorded in this group.`
                      : selectedGroupCard.twistCount > 0
                        ? `${selectedGroupCard.twistCount} twisting or directional attempts recorded in this group.`
                        : "No extra flying or directional markers in the current sample."}
                  </div>
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="section-head">
                <h2>{selectedGroupCard.label} strongest codes</h2>
                <span className="muted">Top repeated codes before the full table</span>
              </div>
              <div className="stack compact-stack">
                {codeRows.slice(0, 4).map((row) => (
                  <div className="list-item compact-item" key={row.code}>
                    <div className="between-row">
                      <strong>{row.code}</strong>
                      <span>{formatScore(row.bestScore)}</span>
                    </div>
                    <div className="muted">
                      {row.attempts} attempts · avg {formatScore(row.averageScore)} · DD {formatScore(row.averageDifficulty)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {viewMode === "detailed" ? (
            <section className="panel">
              <div className="section-head">
                <h2>{selectedGroupCard.label} code table</h2>
                <span className="muted">Showing {codeRows.length} codes</span>
              </div>
              <div className="section-toolbar">
                <label className="directory-field section-search-field">
                  <span>Search code</span>
                  <input
                    className="input"
                    onChange={(event) => setCodeQuery(event.target.value)}
                    placeholder="Code or structure"
                    type="search"
                    value={codeQuery}
                  />
                </label>
              </div>
              <table className="table table-clickable">
                <thead>
                  <tr>
                    <th>
                      <SortableHeader active={codeSortKey === "code"} direction={codeSortDirection} label="Code" onClick={() => cycleCodeSort("code")} />
                    </th>
                    <th>
                      <SortableHeader active={codeSortKey === "attempts"} direction={codeSortDirection} label="Attempts" onClick={() => cycleCodeSort("attempts")} />
                    </th>
                    <th>
                      <SortableHeader active={codeSortKey === "average"} direction={codeSortDirection} label="Average" onClick={() => cycleCodeSort("average")} />
                    </th>
                    <th>
                      <SortableHeader active={codeSortKey === "best"} direction={codeSortDirection} label="Best" onClick={() => cycleCodeSort("best")} />
                    </th>
                    <th>
                      <SortableHeader active={codeSortKey === "difficulty"} direction={codeSortDirection} label="Avg DD" onClick={() => cycleCodeSort("difficulty")} />
                    </th>
                    <th>
                      <SortableHeader active={codeSortKey === "latest"} direction={codeSortDirection} label="Latest" onClick={() => cycleCodeSort("latest")} />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {codeRows.map((row) => (
                    <tr
                      key={row.code}
                      onClick={() => {
                        if (!row.bestCompetitionId) {
                          return;
                        }
                        window.location.href = competitionFocusHref({
                          competitionId: row.bestCompetitionId,
                          eventName: row.bestEventName,
                          entryId: row.bestEntryId,
                          diveId: row.bestDiveId,
                          view: "ledger",
                          hash: "ledger-panel",
                          from: `${athleteContextLabel} / ${selectedGroupCard.label} code table`,
                        });
                      }}
                    >
                      <td>
                        <strong>{row.code}</strong>
                        <div className="muted table-subnote">{row.structure}</div>
                      </td>
                      <td>{row.attempts}</td>
                      <td>{formatScore(row.averageScore)}</td>
                      <td>{formatScore(row.bestScore)}</td>
                      <td>{formatScore(row.averageDifficulty)}</td>
                      <td>
                        <strong>{row.latestCompetitionName || "n/a"}</strong>
                        <div className="muted table-subnote">{row.latestCompetitionDate || "Date not recorded"}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : null}

          <section className="panel">
            <div className="section-head">
              <h2>Recent dives by group</h2>
              <span className="muted">Showing {visibleRecentDives.length} of {recentDives.length}</span>
            </div>
            <table className="table table-clickable">
              <thead>
                <tr>
                  <th>Competition</th>
                  <th>Event</th>
                  <th>Code</th>
                  <th>Structure</th>
                  <th>Score</th>
                  <th>Cumulative</th>
                </tr>
              </thead>
              <tbody>
                {visibleRecentDives.map((dive) => (
                  <tr
                    key={dive.id}
                    onClick={() =>
                      (window.location.href = competitionFocusHref({
                        competitionId: dive.competitionId,
                        eventName: dive.eventName,
                        entryId: dive.entryId,
                        diveId: dive.id,
                        view: "ledger",
                        hash: "ledger-panel",
                        from: `${athleteContextLabel} / ${selectedGroupCard.label} recent dives`,
                      }))
                    }
                  >
                    <td>
                      <strong>{dive.competitionName}</strong>
                      <div className="muted table-subnote">{dive.competitionDate || "Date not recorded"}</div>
                    </td>
                    <td>
                      <strong>{dive.eventName || "Event not recorded"}</strong>
                      <div className="muted table-subnote">{dive.entryName || dive.eventType}</div>
                    </td>
                    <td>{dive.diveCode}</td>
                    <td>{dive.parsed.structure}</td>
                    <td>{formatScore(dive.finalScore)}</td>
                    <td>{formatScore(dive.cumulativeScore)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {visibleRecentDives.length < recentDives.length ? (
              <div style={{ marginTop: 14 }}>
                <button className="button secondary" onClick={() => setVisibleRecentCount((count) => count + 5)} type="button">
                  Show 5 more
                </button>
              </div>
            ) : null}
          </section>
        </>
      ) : (
        <div className="notice">No structured dive codes were found for this athlete.</div>
      )}
    </div>
  );
}
