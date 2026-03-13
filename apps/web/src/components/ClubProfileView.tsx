import { useEffect, useMemo, useState } from "react";
import { fetchJson } from "./api";
import { athleteProfileHref, competitionFocusHref } from "./links";
import { SortableHeader } from "./SortableHeader";
import { nextSortDirection, parseCompetitionDate, type SortDirection } from "./tableSorting";

type ClubDetail = {
  club: {
    slug: string;
    name: string;
    athleteCount: number;
    competitionCount: number;
    diveCount: number;
    bestTotal: number | null;
    podiumCount: number;
    latestCompetitionDate: string | null;
  };
  latestCompetition: {
    competitionId: number;
    competitionName: string;
    competitionDate: string | null;
    athleteCount: number;
    eventCount: number;
    diveCount: number;
    bestTotal: number | null;
    featuredEventName: string | null;
    featuredEntryId: number | null;
    featuredEntryName: string | null;
    featuredRank: number | null;
    competitionRank: number | null;
  } | null;
  roster: Array<{
    athleteId: number;
    athleteName: string;
    birthYear: string | null;
    competitionCount: number;
    diveCount: number;
    bestTotal: number | null;
    latestCompetitionDate: string | null;
    latestCompetitionName: string | null;
  }>;
  eventTypeStats: Array<{
    eventFamily: string;
    label: string;
    eventType: "individual" | "synchro";
    appearanceCount: number;
    athleteCount: number;
    bestTotal: number | null;
    bestCompetitionId: number | null;
    bestCompetitionName: string | null;
    bestEventName: string | null;
    bestEntryId: number | null;
    latestCompetitionDate: string | null;
    latestCompetitionId: number | null;
    latestCompetitionName: string | null;
    latestEventName: string | null;
    latestEntryId: number | null;
  }>;
  topResults: Array<{
    competitionId: number;
    competitionName: string;
    competitionDate: string | null;
    eventName: string | null;
    eventType: "individual" | "synchro";
    entryId: number | null;
    entryName: string | null;
    rank: number | null;
    finalTotal: number | null;
  }>;
  competitionHistory: Array<{
    competitionId: number;
    competitionName: string;
    competitionDate: string | null;
    athleteCount: number;
    eventCount: number;
    diveCount: number;
    bestTotal: number | null;
    featuredEventName: string | null;
    featuredEntryId: number | null;
    featuredEntryName: string | null;
    featuredRank: number | null;
    competitionRank: number | null;
  }>;
  recentDives: Array<{
    diveId: number;
    entryId: number | null;
    diveCode: string;
    finalScore: number | null;
    cumulativeScore: number | null;
    eventName: string | null;
    eventType: "individual" | "synchro";
    athleteName: string;
    entryName: string | null;
    competitionId: number;
    competitionName: string;
    competitionDate: string | null;
  }>;
};

type RosterSortKey = "athlete" | "competitions" | "dives" | "bestTotal" | "latestSeen";
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

export function ClubProfileView(props: { clubSlug: string; initialDetail?: ClubDetail | null }) {
  const [detail, setDetail] = useState<ClubDetail | null>(props.initialDetail || null);
  const [error, setError] = useState<string | null>(null);
  const [sourceContext, setSourceContext] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("summary");
  const [rosterSortKey, setRosterSortKey] = useState<RosterSortKey>("bestTotal");
  const [rosterSortDirection, setRosterSortDirection] = useState<SortDirection>("desc");
  const [rosterQuery, setRosterQuery] = useState("");
  const [visibleRosterCount, setVisibleRosterCount] = useState(5);
  const [visibleCompetitionHistoryCount, setVisibleCompetitionHistoryCount] = useState(8);
  const [visibleRecentDiveCount, setVisibleRecentDiveCount] = useState(5);

  useEffect(() => {
    fetchJson<ClubDetail>(`/clubs/${props.clubSlug}`)
      .then(setDetail)
      .catch((err) => setError(err.message));
  }, [props.clubSlug]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      setSourceContext(params.get("from") || null);
    }
    setRosterQuery("");
    setVisibleRosterCount(5);
    setVisibleCompetitionHistoryCount(8);
    setVisibleRecentDiveCount(5);
    setViewMode("summary");
  }, [props.clubSlug]);

  const filteredRoster = detail
    ? detail.roster.filter((athlete) => {
        const normalizedQuery = rosterQuery.trim().toLowerCase();
        if (!normalizedQuery) return true;
        return (
          athlete.athleteName.toLowerCase().includes(normalizedQuery) ||
          String(athlete.latestCompetitionName || "").toLowerCase().includes(normalizedQuery) ||
          String(athlete.birthYear || "").toLowerCase().includes(normalizedQuery)
        );
      })
    : [];

  const sortedRoster = detail
    ? (() => {
        const next = [...filteredRoster];
        if (!rosterSortDirection) return next;
        next.sort((left, right) => {
          if (rosterSortKey === "athlete") return left.athleteName.localeCompare(right.athleteName);
          if (rosterSortKey === "competitions") return left.competitionCount - right.competitionCount;
          if (rosterSortKey === "dives") return left.diveCount - right.diveCount;
          if (rosterSortKey === "latestSeen") {
            return parseCompetitionDate(left.latestCompetitionDate) - parseCompetitionDate(right.latestCompetitionDate);
          }
          return (left.bestTotal || 0) - (right.bestTotal || 0);
        });
        if (rosterSortDirection === "desc") next.reverse();
        return next;
      })()
    : [];

  const visibleRoster = sortedRoster.slice(0, visibleRosterCount);
  const visibleCompetitionHistory = detail ? detail.competitionHistory.slice(0, visibleCompetitionHistoryCount) : [];
  const visibleRecentDives = detail ? detail.recentDives.slice(0, visibleRecentDiveCount) : [];

  const strongestFamily = detail?.eventTypeStats[0] || null;
  const mostActiveAthlete = useMemo(
    () =>
      detail
        ? [...detail.roster].sort(
            (left, right) =>
              right.diveCount - left.diveCount || right.competitionCount - left.competitionCount,
          )[0] || null
        : null,
    [detail],
  );
  const highestCeilingAthlete = useMemo(
    () => (detail ? [...detail.roster].sort((left, right) => (right.bestTotal || 0) - (left.bestTotal || 0))[0] || null : null),
    [detail],
  );
  const underusedFamily = useMemo(
    () =>
      detail
        ? [...detail.eventTypeStats].sort(
            (left, right) => left.athleteCount - right.athleteCount || left.appearanceCount - right.appearanceCount,
          )[0] || null
        : null,
    [detail],
  );

  if (error) {
    return <div className="notice">{error}</div>;
  }

  if (!detail) {
    return <div className="notice">Loading club profile...</div>;
  }

  const clubContextLabel = `Club profile / ${detail.club.name}`;
  const recentCompetitions = detail.competitionHistory.slice(0, 3);
  const competitionTrend = detail.competitionHistory
    .slice(0, 4)
    .reverse()
    .map((competition) => `${competition.competitionName} ${formatScore(competition.bestTotal)}`);

  const latestCompetitionHref = detail.latestCompetition
    ? competitionFocusHref({
        competitionId: detail.latestCompetition.competitionId,
        eventName: detail.latestCompetition.featuredEventName,
        view: "club",
        clubName: detail.club.name,
        from: `${clubContextLabel} / Latest competition`,
      })
    : null;

  const latestDive = detail.recentDives[0] || null;
  const latestDiveHref = latestDive
    ? competitionFocusHref({
        competitionId: latestDive.competitionId,
        eventName: latestDive.eventName,
        entryId: latestDive.entryId,
        diveId: latestDive.diveId,
        view: "ledger",
        clubName: detail.club.name,
        hash: "ledger-panel",
        from: `${clubContextLabel} / Latest dive`,
      })
    : null;

  function cycleRosterSort(key: RosterSortKey) {
    const nextDirection = nextSortDirection(rosterSortKey, rosterSortDirection, key, {
      textMode: key === "athlete",
    });
    setRosterSortKey(key);
    setRosterSortDirection(nextDirection);
  }

  return (
    <div className="page-grid">
      {sourceContext ? <div className="workspace-origin-strip">Opened from: {sourceContext}</div> : null}

      <section className="profile-hero panel">
        <div>
          <h2>{detail.club.name}</h2>
          <div className="profile-meta-row">
            <span>{detail.club.athleteCount} roster athletes</span>
            <span>{detail.club.competitionCount} competitions</span>
            <span>{detail.club.diveCount} dives logged</span>
            <span>{detail.club.latestCompetitionDate || "Date not recorded"}</span>
          </div>
        </div>
      </section>

      <section className="panel mode-panel">
        <div className="section-head">
          <h2>Club profile mode</h2>
          <span className="muted">Start with the team brief, then expand into the full roster and competition archive</span>
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
          <span>Roster size</span>
          <strong>{detail.club.athleteCount}</strong>
        </div>
        <div className="metric">
          <span>Podiums</span>
          <strong>{detail.club.podiumCount}</strong>
        </div>
        <div className="metric">
          <span>Best total</span>
          <strong>{formatScore(detail.club.bestTotal)}</strong>
        </div>
        <div className="metric">
          <span>Event families</span>
          <strong>{detail.eventTypeStats.length}</strong>
        </div>
      </section>

      <section className="two-column">
        <div className="panel">
          <div className="section-head">
            <h2>Club brief</h2>
            <span className="muted">What this club is doing well and what deserves attention next</span>
          </div>
          <div className="stack compact-stack">
            <div className="list-item compact-item">
              <strong>Latest competition</strong>
              <div className="muted">
                {detail.latestCompetition
                  ? `${detail.latestCompetition.competitionName} · ${rankLabel(detail.latestCompetition.competitionRank)}`
                  : "No competition history recorded"}
              </div>
            </div>
            <div className="list-item compact-item">
              <strong>Strongest event type</strong>
              <div className="muted">
                {strongestFamily
                  ? `${strongestFamily.label} · best total ${formatScore(strongestFamily.bestTotal)}`
                  : "No event-family signal recorded"}
              </div>
            </div>
            <div className="list-item compact-item">
              <strong>Most active athlete</strong>
              <div className="muted">
                {mostActiveAthlete
                  ? `${mostActiveAthlete.athleteName} · ${mostActiveAthlete.diveCount} dives across ${mostActiveAthlete.competitionCount} competitions`
                  : "No athlete activity recorded"}
              </div>
            </div>
            <div className="list-item compact-item">
              <strong>Focus for next block</strong>
              <div className="muted">
                {underusedFamily
                  ? `${underusedFamily.label} has the lightest current coverage in the club dataset.`
                  : "No roster development signal available yet"}
              </div>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="section-head">
            <h2>Coach interpretation</h2>
            <span className="muted">A fast reading of the current club footprint</span>
          </div>
          <div className="coach-grid">
            <div className="coach-card">
              <strong>Highest ceiling athlete</strong>
              <span>{highestCeilingAthlete?.athleteName || "n/a"}</span>
              <small>best total {formatScore(highestCeilingAthlete?.bestTotal || null)}</small>
            </div>
            <div className="coach-card">
              <strong>Deepest event type</strong>
              <span>{strongestFamily?.label || "n/a"}</span>
              <small>{strongestFamily?.athleteCount || 0} athletes with recorded starts</small>
            </div>
            <div className="coach-card">
              <strong>Competition rhythm</strong>
              <span>{detail.club.competitionCount} competitions</span>
              <small>{competitionTrend.join(" · ") || "Only one competition recorded"}</small>
            </div>
            <div className="coach-card coach-card-warning">
              <strong>Needs more exposure</strong>
              <span>{underusedFamily?.label || "None"}</span>
              <small>
                {underusedFamily
                  ? `${underusedFamily.athleteCount} athletes and ${underusedFamily.appearanceCount} starts in this event type`
                  : "The current event mix is balanced"}
              </small>
            </div>
          </div>
        </div>
      </section>

      <section className="panel context-panel">
        <div className="section-head">
          <h2>Next actions</h2>
          <span className="muted">Open the live competition context without rebuilding the path yourself</span>
        </div>
        <div className="context-links">
          {latestCompetitionHref ? (
            <a className="context-link-card" href={latestCompetitionHref}>
              <strong>Review latest competition</strong>
              <span>{detail.latestCompetition?.competitionName}</span>
            </a>
          ) : null}
          {detail.topResults[0] ? (
            <a
              className="context-link-card"
              href={competitionFocusHref({
                competitionId: detail.topResults[0].competitionId,
                eventName: detail.topResults[0].eventName,
                entryId: detail.topResults[0].entryId,
                view: "athlete",
                clubName: detail.club.name,
                from: `${clubContextLabel} / Top result`,
              })}
            >
              <strong>Open top result</strong>
              <span>{detail.topResults[0].eventName || detail.topResults[0].competitionName}</span>
            </a>
          ) : null}
          {mostActiveAthlete ? (
            <a className="context-link-card" href={athleteProfileHref(mostActiveAthlete.athleteId, { from: `${clubContextLabel} / Most active athlete` })}>
              <strong>Review most active athlete</strong>
              <span>{mostActiveAthlete.athleteName}</span>
            </a>
          ) : null}
          {latestDiveHref ? (
            <a className="context-link-card" href={latestDiveHref}>
              <strong>Open latest dive</strong>
              <span>{latestDive?.diveCode} · {latestDive?.competitionName}</span>
            </a>
          ) : null}
        </div>
      </section>

      <section className="profile-grid">
        <div className="panel">
          <h2>Recent competitions</h2>
          {recentCompetitions.length > 0 ? (
            <div className="stack compact-stack">
              {recentCompetitions.map((competition) => (
                <a
                  className="profile-card-link"
                  href={competitionFocusHref({
                    competitionId: competition.competitionId,
                    eventName: competition.featuredEventName,
                    view: "club",
                    clubName: detail.club.name,
                    from: `${clubContextLabel} / Recent competitions`,
                  })}
                  key={competition.competitionId}
                >
                  <div className="stack compact-stack">
                    <div className="list-item compact-item">
                      <strong>{competition.competitionName}</strong>
                      <div className="muted">
                        {competition.competitionDate || "Date not recorded"} · {competition.featuredEventName || "Event not recorded"}
                      </div>
                    </div>
                    <div className="cluster">
                      <span className={`rank-mark rank-${competition.competitionRank || "other"}`}>
                        <span className="rank-mark-glyph" aria-hidden="true">
                          {rankGlyph(competition.competitionRank)}
                        </span>
                        <span>{rankLabel(competition.competitionRank)}</span>
                      </span>
                      <span className="chip">{competition.athleteCount} athletes</span>
                      <span className="chip">{competition.eventCount} events</span>
                      <span className="chip">best {formatScore(competition.bestTotal)}</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="notice">No competition history available.</div>
          )}
        </div>

        <div className="panel">
          <h2>Roster spotlight</h2>
          <div className="stack compact-stack">
            {detail.roster.slice(0, 4).map((athlete) => (
              <a
                className="list-item compact-item"
                href={athleteProfileHref(athlete.athleteId, { from: `${clubContextLabel} / Roster spotlight` })}
                key={athlete.athleteId}
              >
                <div className="between-row">
                  <strong>{athlete.athleteName}</strong>
                  <span>{formatScore(athlete.bestTotal)}</span>
                </div>
                <div className="muted" style={{ marginTop: 6 }}>
                  {athlete.diveCount} dives · {athlete.competitionCount} competitions · {athlete.latestCompetitionName || "Competition not recorded"}
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {viewMode === "detailed" ? (
        <section className="panel" id="club-roster-panel">
          <div className="section-head">
            <h2>Athlete roster</h2>
            <span className="muted">Showing {visibleRoster.length} of {sortedRoster.length}</span>
          </div>
          <div className="section-toolbar">
            <label className="directory-field section-search-field">
              <span>Search athlete</span>
              <input
                className="input"
                onChange={(event) => {
                  setRosterQuery(event.target.value);
                  setVisibleRosterCount(5);
                }}
                placeholder="Athlete, birth year, latest competition"
                type="search"
                value={rosterQuery}
              />
            </label>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th><SortableHeader active={rosterSortKey === "athlete"} direction={rosterSortDirection} label="Athlete" onClick={() => cycleRosterSort("athlete")} /></th>
                <th><SortableHeader active={rosterSortKey === "competitions"} direction={rosterSortDirection} label="Competitions" onClick={() => cycleRosterSort("competitions")} /></th>
                <th><SortableHeader active={rosterSortKey === "dives"} direction={rosterSortDirection} label="Dives" onClick={() => cycleRosterSort("dives")} /></th>
                <th><SortableHeader active={rosterSortKey === "bestTotal"} direction={rosterSortDirection} label="Best total" onClick={() => cycleRosterSort("bestTotal")} /></th>
                <th><SortableHeader active={rosterSortKey === "latestSeen"} direction={rosterSortDirection} label="Latest seen" onClick={() => cycleRosterSort("latestSeen")} /></th>
              </tr>
            </thead>
            <tbody>
              {visibleRoster.map((athlete) => (
                <tr key={athlete.athleteId}>
                  <td>
                    <a href={athleteProfileHref(athlete.athleteId, { from: `${clubContextLabel} / Athlete roster` })}>
                      <strong>{athlete.athleteName}</strong>
                    </a>
                    <div className="muted">{athlete.birthYear || "Birth year not recorded"}</div>
                  </td>
                  <td>{athlete.competitionCount}</td>
                  <td>{athlete.diveCount}</td>
                  <td>{formatScore(athlete.bestTotal)}</td>
                  <td>
                    <strong>{athlete.latestCompetitionName || "n/a"}</strong>
                    <div className="muted">{athlete.latestCompetitionDate || "Date not recorded"}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {visibleRoster.length < sortedRoster.length ? (
            <div style={{ marginTop: 14 }}>
              <button className="button secondary" onClick={() => setVisibleRosterCount((count) => count + 5)} type="button">
                Show 5 more
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="two-column">
        <div className="panel">
          <h2>Event coverage</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Family</th>
                <th>Athletes</th>
                <th>Entries</th>
                <th>Best total</th>
                <th>Latest</th>
              </tr>
            </thead>
            <tbody>
              {detail.eventTypeStats.map((stat) => (
                <tr key={stat.eventFamily}>
                  <td>
                    <strong>{stat.label}</strong>
                    <div className="muted">{stat.eventType === "synchro" ? "Synchro" : "Individual"}</div>
                  </td>
                  <td>{stat.athleteCount}</td>
                  <td>{stat.appearanceCount}</td>
                  <td>
                    {stat.bestCompetitionId ? (
                      <a
                        href={competitionFocusHref({
                          competitionId: stat.bestCompetitionId,
                          eventName: stat.bestEventName,
                          entryId: stat.bestEntryId,
                          view: "athlete",
                          clubName: detail.club.name,
                          focus: "progression",
                          hash: "progression-panel",
                          from: `${clubContextLabel} / Event coverage`,
                        })}
                      >
                        {formatScore(stat.bestTotal)}
                      </a>
                    ) : (
                      formatScore(stat.bestTotal)
                    )}
                  </td>
                  <td>
                    {stat.latestCompetitionId ? (
                      <a
                        href={competitionFocusHref({
                          competitionId: stat.latestCompetitionId,
                          eventName: stat.latestEventName,
                          view: "club",
                          clubName: detail.club.name,
                          from: `${clubContextLabel} / Event coverage`,
                        })}
                      >
                        {stat.latestCompetitionName}
                      </a>
                    ) : (
                      "n/a"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <div className="section-head">
            <h2>Competition history</h2>
            <span className="muted">Showing {visibleCompetitionHistory.length} of {detail.competitionHistory.length}</span>
          </div>
          <div className="stack">
            {visibleCompetitionHistory.map((row) => (
              <a
                className="list-item competition-history-item"
                href={competitionFocusHref({
                  competitionId: row.competitionId,
                  eventName: row.featuredEventName,
                  view: "club",
                  clubName: detail.club.name,
                  from: `${clubContextLabel} / Competition history`,
                })}
                key={`${row.competitionId}-${row.featuredEntryId}`}
              >
                <div className="between-row">
                  <div className="competition-history-main">
                    <span className={`rank-mark rank-${row.competitionRank || "other"}`}>
                      <span className="rank-mark-glyph" aria-hidden="true">
                        {rankGlyph(row.competitionRank)}
                      </span>
                      <span>{rankLabel(row.competitionRank)}</span>
                    </span>
                    <strong>{row.competitionName}</strong>
                  </div>
                  <span>{formatScore(row.bestTotal)}</span>
                </div>
                <div className="muted" style={{ marginTop: 6 }}>
                  {row.competitionDate || "Date not recorded"} · {row.athleteCount} athletes · {row.eventCount} events · {row.diveCount} dives
                </div>
              </a>
            ))}
          </div>
          {visibleCompetitionHistory.length < detail.competitionHistory.length ? (
            <div style={{ marginTop: 14 }}>
              <button className="button secondary" onClick={() => setVisibleCompetitionHistoryCount((count) => count + 8)} type="button">
                Show 8 more
              </button>
            </div>
          ) : null}
        </div>
      </section>

      {viewMode === "detailed" ? (
        <section className="panel">
          <div className="section-head">
            <h2>Recent dives</h2>
            <span className="muted">Showing {visibleRecentDives.length} of {detail.recentDives.length}</span>
          </div>
          <table className="table table-clickable">
            <thead>
              <tr>
                <th>Competition</th>
                <th>Athlete</th>
                <th>Event</th>
                <th>Dive</th>
                <th>Score</th>
                <th>Cumulative</th>
              </tr>
            </thead>
            <tbody>
              {visibleRecentDives.map((dive) => (
                <tr
                  key={dive.diveId}
                  onClick={() =>
                    (window.location.href = competitionFocusHref({
                      competitionId: dive.competitionId,
                      eventName: dive.eventName,
                      entryId: dive.entryId,
                      diveId: dive.diveId,
                      view: "ledger",
                      clubName: detail.club.name,
                      hash: "ledger-panel",
                      from: `${clubContextLabel} / Recent dives`,
                    }))
                  }
                >
                  <td>
                    <strong>{dive.competitionName}</strong>
                    <div className="muted">{dive.competitionDate || "Date not recorded"}</div>
                  </td>
                  <td><strong>{dive.athleteName}</strong></td>
                  <td>
                    <strong>{dive.eventName || "Unknown"}</strong>
                    <div className="muted">{dive.entryName || dive.eventType}</div>
                  </td>
                  <td>{dive.diveCode}</td>
                  <td>{formatScore(dive.finalScore)}</td>
                  <td>{formatScore(dive.cumulativeScore)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {visibleRecentDives.length < detail.recentDives.length ? (
            <div style={{ marginTop: 14 }}>
              <button className="button secondary" onClick={() => setVisibleRecentDiveCount((count) => count + 5)} type="button">
                Show 5 more
              </button>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
