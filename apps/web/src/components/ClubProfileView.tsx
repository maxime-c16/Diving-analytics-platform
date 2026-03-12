import { useEffect, useState } from "react";
import { fetchJson } from "./api";
import { athleteProfileHref, competitionFocusHref } from "./links";

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
  } | null;
  roster: Array<{
    athleteId: number;
    athleteName: string;
    birthYear: string | null;
    competitionCount: number;
    diveCount: number;
    bestTotal: number | null;
    lastCompetitionDate: string | null;
    lastCompetitionName: string | null;
  }>;
  eventTypeStats: Array<{
    eventFamily: string;
    label: string;
    eventType: "individual" | "synchro";
    appearanceCount: number;
    athleteCount: number;
    bestTotal: number | null;
    lastCompetitionDate: string | null;
    lastCompetitionId: number | null;
    lastCompetitionName: string | null;
    lastEventName: string | null;
    lastEntryId: number | null;
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

function formatScore(value: number | null) {
  if (typeof value !== "number") {
    return "n/a";
  }
  return value.toFixed(2).replace(/\.00$/, "");
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

export function ClubProfileView(props: { clubSlug: string }) {
  const [detail, setDetail] = useState<ClubDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<ClubDetail>(`/clubs/${props.clubSlug}`)
      .then(setDetail)
      .catch((err) => setError(err.message));
  }, [props.clubSlug]);

  if (error) {
    return <div className="notice">{error}</div>;
  }

  if (!detail) {
    return <div className="notice">Loading club profile...</div>;
  }

  const latestCompetitionHref = detail.latestCompetition
    ? competitionFocusHref({
        competitionId: detail.latestCompetition.competitionId,
        eventName: detail.latestCompetition.featuredEventName,
        entryId: detail.latestCompetition.featuredEntryId,
        view: "athlete",
      })
    : null;

  return (
    <div className="page-grid">
      <section className="profile-hero panel">
        <div>
          <h2>{detail.club.name}</h2>
          <div className="profile-meta-row">
            <span>{detail.club.athleteCount} licensed athletes</span>
            <span>{detail.club.competitionCount} competitions</span>
            <span>{detail.club.diveCount} dives logged</span>
            <span>{detail.club.latestCompetitionDate || "Date not recorded"}</span>
          </div>
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

      <section className="profile-grid">
        <div className="panel">
          <h2>Latest competition</h2>
          {detail.latestCompetition ? (
            <a className="profile-card-link" href={latestCompetitionHref || "#"}>
              <div className="stack compact-stack">
                <div className="list-item compact-item">
                  <strong>{detail.latestCompetition.competitionName}</strong>
                  <div className="muted">
                    {detail.latestCompetition.competitionDate || "Date not recorded"} ·{" "}
                    {detail.latestCompetition.featuredEventName || "Event not recorded"}
                  </div>
                </div>
                <div className="cluster">
                  <span className={`rank-mark rank-${detail.latestCompetition.featuredRank || "other"}`}>
                    <span className="rank-mark-glyph" aria-hidden="true">
                      {rankGlyph(detail.latestCompetition.featuredRank)}
                    </span>
                    <span>{rankLabel(detail.latestCompetition.featuredRank)}</span>
                  </span>
                  <span className="chip">{detail.latestCompetition.athleteCount} athletes</span>
                  <span className="chip">{detail.latestCompetition.eventCount} events</span>
                  <span className="chip">best {formatScore(detail.latestCompetition.bestTotal)}</span>
                </div>
              </div>
            </a>
          ) : (
            <div className="notice">No competition history available.</div>
          )}
        </div>

        <div className="panel">
          <h2>Top results</h2>
          <div className="stack compact-stack">
            {detail.topResults.map((result, index) => (
              <a
                className="list-item compact-item"
                href={competitionFocusHref({
                  competitionId: result.competitionId,
                  eventName: result.eventName,
                  entryId: result.entryId,
                  view: "athlete",
                })}
                key={`${result.competitionId}-${result.entryId}-${index}`}
              >
                <div className="between-row">
                  <div className="competition-history-main">
                    <span className={`rank-mark rank-${result.rank || "other"}`}>
                      <span className="rank-mark-glyph" aria-hidden="true">
                        {rankGlyph(result.rank)}
                      </span>
                    <span>{rankLabel(result.rank)}</span>
                  </span>
                  <strong>{result.eventName || "Event not recorded"}</strong>
                </div>
                  <span>{formatScore(result.finalTotal)}</span>
                </div>
                <div className="muted" style={{ marginTop: 6 }}>
                  {result.competitionName} · {result.competitionDate || "Date not recorded"}
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="section-head">
          <h2>Licensed athletes</h2>
          <span className="muted">Direct links to full athlete profiles</span>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Athlete</th>
              <th>Competitions</th>
              <th>Dives</th>
              <th>Best total</th>
              <th>Latest seen</th>
            </tr>
          </thead>
          <tbody>
            {detail.roster.map((athlete) => (
              <tr key={athlete.athleteId}>
                <td>
                  <a href={athleteProfileHref(athlete.athleteId)}>
                    <strong>{athlete.athleteName}</strong>
                  </a>
                  <div className="muted">{athlete.birthYear || "Birth year not recorded"}</div>
                </td>
                <td>{athlete.competitionCount}</td>
                <td>{athlete.diveCount}</td>
                <td>{formatScore(athlete.bestTotal)}</td>
                <td>
                  <strong>{athlete.lastCompetitionName || "n/a"}</strong>
                  <div className="muted">{athlete.lastCompetitionDate || "Date not recorded"}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

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
                  <td>{formatScore(stat.bestTotal)}</td>
                  <td>
                    {stat.lastCompetitionId ? (
                      <a
                        href={competitionFocusHref({
                          competitionId: stat.lastCompetitionId,
                          eventName: stat.lastEventName,
                          entryId: stat.lastEntryId,
                          view: "athlete",
                        })}
                      >
                        {stat.lastCompetitionName}
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
            <span className="muted">Meet-level deep links</span>
          </div>
          <div className="stack">
            {detail.competitionHistory.map((row) => (
              <a
                className="list-item competition-history-item"
                href={competitionFocusHref({
                  competitionId: row.competitionId,
                  eventName: row.featuredEventName,
                  entryId: row.featuredEntryId,
                  view: "athlete",
                })}
                key={`${row.competitionId}-${row.featuredEntryId}`}
              >
                <div className="between-row">
                  <div className="competition-history-main">
                    <span className={`rank-mark rank-${row.featuredRank || "other"}`}>
                      <span className="rank-mark-glyph" aria-hidden="true">
                        {rankGlyph(row.featuredRank)}
                      </span>
                      <span>{rankLabel(row.featuredRank)}</span>
                    </span>
                    <strong>{row.competitionName}</strong>
                  </div>
                  <span>{formatScore(row.bestTotal)}</span>
                </div>
                <div className="muted" style={{ marginTop: 6 }}>
                  {row.competitionDate || "Date not recorded"} · {row.athleteCount} athletes · {row.eventCount} events ·{" "}
                  {row.diveCount} dives
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="section-head">
          <h2>Recent dives</h2>
          <span className="muted">Deep links to exact ledger rows</span>
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
            {detail.recentDives.map((dive) => (
              <tr
                key={dive.diveId}
                onClick={() =>
                  (window.location.href = competitionFocusHref({
                    competitionId: dive.competitionId,
                    eventName: dive.eventName,
                    entryId: dive.entryId,
                    diveId: dive.diveId,
                  }))
                }
              >
                <td>
                  <strong>{dive.competitionName}</strong>
                  <div className="muted">{dive.competitionDate || "Date not recorded"}</div>
                </td>
                <td>
                  <strong>{dive.athleteName}</strong>
                </td>
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
      </section>
    </div>
  );
}
