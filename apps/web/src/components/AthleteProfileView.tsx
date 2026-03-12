import { useEffect, useState } from "react";
import { fetchJson } from "./api";
import { athleteProfileHref, clubProfileHref, competitionFocusHref } from "./links";

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

export function AthleteProfileView(props: { athleteId: string; initialDetail?: AthleteProfile | null }) {
  const [detail, setDetail] = useState<AthleteProfile | null>(props.initialDetail || null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<AthleteProfile>(`/athletes/${props.athleteId}`)
      .then(setDetail)
      .catch((err) => setError(err.message));
  }, [props.athleteId]);

  if (error) {
    return <div className="notice">{error}</div>;
  }

  if (!detail) {
    return <div className="notice">Loading athlete profile...</div>;
  }

  const bestDiveCards = detail.bestDiveByEventType.filter((item) => item.bestDiveCode);
  const latestCompetitionHref = detail.latestCompetition
    ? competitionFocusHref({
        competitionId: detail.latestCompetition.competitionId,
        eventName: detail.latestCompetition.eventName,
        entryId: detail.latestCompetition.entryId,
      })
    : null;
  const bestDiveHref = bestDiveCards[0]
    ? competitionFocusHref({
        competitionId: bestDiveCards[0].competitionId || "",
        eventName: bestDiveCards[0].eventName,
        entryId: bestDiveCards[0].entryId,
        diveId: bestDiveCards[0].diveId,
      })
    : null;

  return (
    <div className="page-grid">
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

      <section className="metrics">
        <div className="metric">
          <span>Latest club</span>
          <strong>
            {detail.athlete.latestClub ? (
              <a href={clubProfileHref(detail.athlete.latestClub)}>{detail.athlete.latestClub}</a>
            ) : (
              "Unknown"
            )}
          </strong>
        </div>
        <div className="metric">
          <span>Best total</span>
          <strong>{formatScore(detail.athlete.bestTotal)}</strong>
        </div>
        <div className="metric">
          <span>Average dive</span>
          <strong>{formatScore(detail.athlete.averageDiveScore)}</strong>
        </div>
        <div className="metric">
          <span>Recent form</span>
          <strong>{formatScore(detail.athlete.recentFormAverage)}</strong>
        </div>
      </section>

      <section className="panel context-panel">
        <div className="section-head">
          <h2>Quick paths</h2>
          <span className="muted">Return to the live competition context</span>
        </div>
        <div className="context-links">
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

      <section className="profile-grid">
        <div className="panel">
          <h2>Profile snapshot</h2>
          <div className="stack compact-stack">
            <div className="list-item compact-item">
              <strong>Latest competition</strong>
              <div className="muted">
                {detail.latestCompetition
                  ? `${detail.latestCompetition.competitionName} · ${detail.latestCompetition.eventName || "Event not recorded"}`
                  : "No competition history available"}
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

        <div className="panel">
          <h2>Latest competition</h2>
          {detail.latestCompetition ? (
            <a className="profile-card-link" href={latestCompetitionHref || "#"}>
              <div className="stack compact-stack">
                <div className="list-item compact-item">
                  <strong>{detail.latestCompetition.competitionName}</strong>
                  <div className="muted">
                    {detail.latestCompetition.competitionDate || "Date not recorded"} ·{" "}
                    {detail.latestCompetition.eventName || "Event not recorded"}
                  </div>
                </div>
                <div className="cluster">
                  <span className={`rank-mark rank-${detail.latestCompetition.rank || "other"}`}>
                    <span className="rank-mark-glyph" aria-hidden="true">
                      {rankGlyph(detail.latestCompetition.rank)}
                    </span>
                    <span>{rankLabel(detail.latestCompetition.rank)}</span>
                  </span>
                  <span className="chip">total {formatScore(detail.latestCompetition.finalTotal)}</span>
                  {detail.latestCompetition.partnerLinks.map((partner) => (
                    <a className="chip" href={athleteProfileHref(partner.id)} key={partner.id}>
                      {partner.name}
                    </a>
                  ))}
                </div>
              </div>
            </a>
          ) : (
            <div className="notice">No competition history available.</div>
          )}
        </div>
      </section>

      <section className="panel">
        <h2>Event strengths</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Event family</th>
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

      {detail.partnerStats.length > 0 ? (
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
                      <a href={athleteProfileHref(partner.partnerId)}>
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

      <section className="two-column">
        <div className="panel">
          <div className="section-head">
            <h2>Competition history</h2>
            <div className="rank-legend" aria-label="Rank glyph legend">
              <span className="rank-mark rank-1">
                <span className="rank-mark-glyph" aria-hidden="true">
                  {rankGlyph(1)}
                </span>
                <span>1st</span>
              </span>
              <span className="rank-mark rank-2">
                <span className="rank-mark-glyph" aria-hidden="true">
                  {rankGlyph(2)}
                </span>
                <span>2nd</span>
              </span>
              <span className="rank-mark rank-3">
                <span className="rank-mark-glyph" aria-hidden="true">
                  {rankGlyph(3)}
                </span>
                <span>3rd</span>
              </span>
              <span className="rank-mark rank-other">
                <span className="rank-mark-glyph" aria-hidden="true">
                  {rankGlyph(4)}
                </span>
                <span>Other</span>
              </span>
            </div>
          </div>
          <div className="stack">
            {detail.competitionHistory.map((row) => (
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
                {row.partnerNames.length > 0 ? (
                  <div className="cluster" style={{ marginTop: 8 }}>
                    {row.partnerLinks.map((partner) => (
                      <a className="chip" href={athleteProfileHref(partner.id)} key={partner.id}>
                        {partner.name}
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <h2>Best dives by family</h2>
          <div className="stack">
            {bestDiveCards.map((row) => (
              <div className="list-item" key={row.eventFamily}>
                <div className="between-row">
                  <strong>{row.label}</strong>
                  <span>{formatScore(row.bestDiveScore)}</span>
                </div>
                <div className="muted" style={{ marginTop: 6 }}>
                  {row.bestDiveCode} · {row.eventName || "Event not recorded"}
                </div>
                {row.competitionId ? (
                  <a
                    className="chip"
                    href={competitionFocusHref({
                      competitionId: row.competitionId,
                      eventName: row.eventName,
                      entryId: row.entryId,
                      diveId: row.diveId,
                    })}
                  >
                    Open best result
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="panel">
        <h2>Full dive log</h2>
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
            {detail.dives.map((dive) => (
              <tr
                className="table-row-link"
                key={dive.id}
                onClick={() =>
                  (window.location.href = competitionFocusHref({
                    competitionId: dive.competitionId,
                    eventName: dive.eventName,
                    entryId: dive.entryId,
                    diveId: dive.id,
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
      </section>
    </div>
  );
}
