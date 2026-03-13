import { useEffect, useMemo, useState } from "react";
import { parseDiveCode, type DiveGroupId } from "../../../../packages/dive-code";
import { fetchJson } from "./api";
import { competitionFocusHref } from "./links";
import { SortableHeader } from "./SortableHeader";
import { nextSortDirection, parseCompetitionDate, type SortDirection } from "./tableSorting";

type AthleteTechniqueProfile = {
  athlete: {
    id: number;
    name: string;
    diveCount: number;
    mostUsedDiveCode: string | null;
    bestTotal: number | null;
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

function formatScore(value: number | null) {
  if (typeof value !== "number") {
    return "n/a";
  }
  return value.toFixed(2).replace(/\.00$/, "");
}

export function AthleteTechniqueView(props: {
  athleteId: string;
  initialDetail?: AthleteTechniqueProfile | null;
}) {
  const [detail, setDetail] = useState<AthleteTechniqueProfile | null>(props.initialDetail || null);
  const [error, setError] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<DiveGroupId | null>(null);
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
            shortLabel: group.shortLabel,
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
    setSelectedGroup(groupCards[0]?.id || null);
    setCodeQuery("");
    setVisibleRecentCount(5);
  }, [props.athleteId, groupCards.length]);

  const selectedGroupCard = groupCards.find((group) => group.id === selectedGroup) || groupCards[0] || null;

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
          (right.id - left.id),
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

  function cycleCodeSort(key: CodeSortKey) {
    const nextDirection = nextSortDirection(codeSortKey, codeSortDirection, key, {
      textMode: key === "code",
    });
    setCodeSortKey(key);
    setCodeSortDirection(nextDirection);
  }

  if (error) {
    return <div className="notice">{error}</div>;
  }

  if (!detail) {
    return <div className="notice">Loading technique workspace...</div>;
  }

  return (
    <div className="page-grid">
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

      <section className="metrics">
        <div className="metric">
          <span>Groups used</span>
          <strong>{technicalMetrics.groupsUsed}</strong>
        </div>
        <div className="metric">
          <span>Unique codes</span>
          <strong>{technicalMetrics.uniqueCodes}</strong>
        </div>
        <div className="metric">
          <span>Flying dives</span>
          <strong>{technicalMetrics.flyingDives}</strong>
        </div>
        <div className="metric">
          <span>Twisting or armstand</span>
          <strong>{technicalMetrics.twistingOrArmstand}</strong>
        </div>
      </section>

      <section className="panel">
        <div className="section-head">
          <h2>Dive groups</h2>
          <span className="muted">Official dive groups from the World Aquatics code structure</span>
        </div>
        <div className="group-card-grid">
          {groupCards.map((group) => (
            <button
              className="group-card"
              data-active={group.id === selectedGroupCard?.id}
              key={group.id}
              onClick={() => {
                setSelectedGroup(group.id);
                setVisibleRecentCount(5);
              }}
              type="button"
            >
              <div className="group-card-head">
                <div>
                  <strong>{group.label}</strong>
                </div>
                <span>{group.share}%</span>
              </div>
              <div className="group-card-stats">
                <span>{group.count} dives</span>
                <span>{group.uniqueCodes} codes</span>
                <span>avg {formatScore(group.averageScore)}</span>
                <span>best {formatScore(group.bestScore)}</span>
              </div>
              <div className="muted technical-note">{group.description}</div>
            </button>
          ))}
        </div>
      </section>

      {selectedGroupCard ? (
        <>
          <section className="two-column">
            <div className="panel">
              <div className="section-head">
                <h2>{selectedGroupCard.label} code table</h2>
                <span className="muted">
                  Showing {codeRows.length} codes
                </span>
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
                      <SortableHeader
                        active={codeSortKey === "code"}
                        direction={codeSortDirection}
                        label="Code"
                        onClick={() => cycleCodeSort("code")}
                      />
                    </th>
                    <th>
                      <SortableHeader
                        active={codeSortKey === "attempts"}
                        direction={codeSortDirection}
                        label="Attempts"
                        onClick={() => cycleCodeSort("attempts")}
                      />
                    </th>
                    <th>
                      <SortableHeader
                        active={codeSortKey === "average"}
                        direction={codeSortDirection}
                        label="Average"
                        onClick={() => cycleCodeSort("average")}
                      />
                    </th>
                    <th>
                      <SortableHeader
                        active={codeSortKey === "best"}
                        direction={codeSortDirection}
                        label="Best"
                        onClick={() => cycleCodeSort("best")}
                      />
                    </th>
                    <th>
                      <SortableHeader
                        active={codeSortKey === "difficulty"}
                        direction={codeSortDirection}
                        label="Avg DD"
                        onClick={() => cycleCodeSort("difficulty")}
                      />
                    </th>
                    <th>
                      <SortableHeader
                        active={codeSortKey === "latest"}
                        direction={codeSortDirection}
                        label="Latest"
                        onClick={() => cycleCodeSort("latest")}
                      />
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
            </div>

            <div className="panel">
              <h2>{selectedGroupCard.label} profile</h2>
              <div className="stack compact-stack">
                <div className="list-item compact-item">
                  <strong>Official group</strong>
                  <div className="muted">{selectedGroupCard.label}</div>
                </div>
                <div className="list-item compact-item">
                  <strong>Group share</strong>
                  <div className="muted">{selectedGroupCard.share}% of recorded dives</div>
                </div>
                <div className="list-item compact-item">
                  <strong>Average score</strong>
                  <div className="muted">{formatScore(selectedGroupCard.averageScore)}</div>
                </div>
                <div className="list-item compact-item">
                  <strong>Average DD</strong>
                  <div className="muted">{formatScore(selectedGroupCard.averageDifficulty)}</div>
                </div>
                <div className="list-item compact-item">
                  <strong>Technical note</strong>
                  <div className="muted">
                    {selectedGroupCard.flyingCount > 0
                      ? `${selectedGroupCard.flyingCount} flying dives recorded in this family.`
                      : selectedGroupCard.twistCount > 0
                        ? `${selectedGroupCard.twistCount} twisting or directional attempts recorded in this family.`
                        : "No additional flying or twisting marker recorded in this family."}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="section-head">
              <h2>Recent technical log</h2>
              <span className="muted">
                Showing {visibleRecentDives.length} of {recentDives.length}
              </span>
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
                <button
                  className="button secondary"
                  onClick={() => setVisibleRecentCount((count) => count + 5)}
                  type="button"
                >
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
