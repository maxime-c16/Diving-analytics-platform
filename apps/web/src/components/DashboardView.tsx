import { useEffect, useMemo, useState } from "react";
import { fetchJson, getApiBaseUrl } from "./api";
import { athleteProfileHref } from "./links";
import { SortableHeader } from "./SortableHeader";
import { nextSortDirection, parseCompetitionDate, type SortDirection } from "./tableSorting";

type DashboardData = {
  overview: {
    competitionCount: number;
    athleteCount: number;
    diveCount: number;
  };
  topAthletes: Array<{
    id: number;
    name: string;
    bestTotal: number;
    competitionCount: number;
  }>;
  competitions: Array<{
    id: number;
    name: string;
    location: string | null;
    date: string | null;
    totalDives: number;
    totalAthletes: number;
    averageDiveScore: number | null;
    winningScore: number | null;
  }>;
};

type CompetitionSortKey = "competition" | "date" | "dives" | "winningTotal";
type DashboardViewProps = {
  initialData?: DashboardData;
};

function rankGlyph(rank: number) {
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

export function DashboardView(props: DashboardViewProps) {
  const [data, setData] = useState<DashboardData | null>(props.initialData || null);
  const [error, setError] = useState<string | null>(null);
  const [apiBaseUrl, setApiBaseUrl] = useState<string | null>(null);
  const [competitionSortKey, setCompetitionSortKey] = useState<CompetitionSortKey>("date");
  const [competitionSortDirection, setCompetitionSortDirection] = useState<SortDirection>("desc");

  useEffect(() => {
    setApiBaseUrl(getApiBaseUrl());
    fetchJson<DashboardData>("/dashboard")
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  const sortedCompetitions = useMemo(() => {
    if (!data) {
      return [];
    }

    const next = [...data.competitions];
    if (!competitionSortDirection) {
      return next;
    }

    next.sort((left, right) => {
      if (competitionSortKey === "competition") {
        return left.name.localeCompare(right.name);
      }
      if (competitionSortKey === "dives") {
        return left.totalDives - right.totalDives;
      }
      if (competitionSortKey === "winningTotal") {
        return (left.winningScore || 0) - (right.winningScore || 0);
      }
      return parseCompetitionDate(left.date) - parseCompetitionDate(right.date);
    });

    if (competitionSortDirection === "desc") {
      next.reverse();
    }
    return next;
  }, [competitionSortDirection, competitionSortKey, data]);

  if (error) {
    return <div className="notice">{error}</div>;
  }

  if (!data) {
    return <div className="notice">Loading competition summary...</div>;
  }

  function cycleCompetitionSort(key: CompetitionSortKey) {
    const nextDirection = nextSortDirection(competitionSortKey, competitionSortDirection, key, {
      textMode: key === "competition",
    });
    setCompetitionSortKey(key);
    setCompetitionSortDirection(nextDirection);
  }

  return (
    <div className="page-grid">
      <section className="metrics">
        <div className="metric">
          <span>Competitions</span>
          <strong>{data.overview.competitionCount}</strong>
        </div>
        <div className="metric">
          <span>Athletes</span>
          <strong>{data.overview.athleteCount}</strong>
        </div>
        <div className="metric">
          <span>Dives</span>
          <strong>{data.overview.diveCount}</strong>
        </div>
        <div className="metric">
          <span>API</span>
          <strong>{(apiBaseUrl || "active host").replace(/^https?:\/\//, "")}</strong>
        </div>
      </section>

      <section className="two-column">
        <div className="panel">
          <h2>Recent competitions</h2>
          <table className="table">
            <thead>
              <tr>
                <th>
                  <SortableHeader active={competitionSortKey === "competition"} direction={competitionSortDirection} label="Competition" onClick={() => cycleCompetitionSort("competition")} />
                </th>
                <th>
                  <SortableHeader active={competitionSortKey === "date"} direction={competitionSortDirection} label="Date" onClick={() => cycleCompetitionSort("date")} />
                </th>
                <th>
                  <SortableHeader active={competitionSortKey === "dives"} direction={competitionSortDirection} label="Dives" onClick={() => cycleCompetitionSort("dives")} />
                </th>
                <th>
                  <SortableHeader active={competitionSortKey === "winningTotal"} direction={competitionSortDirection} label="Winning total" onClick={() => cycleCompetitionSort("winningTotal")} />
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedCompetitions.map((competition) => (
                <tr key={competition.id}>
                  <td>
                    <a href={`/competitions?id=${competition.id}`}>
                      <strong>{competition.name}</strong>
                    </a>
                    <div className="muted">{competition.location || "Location not recorded"}</div>
                  </td>
                  <td>{competition.date || "Unknown"}</td>
                  <td>{competition.totalDives}</td>
                  <td>{competition.winningScore || "n/a"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <h2>Top athlete totals</h2>
          <div className="stack">
            {data.topAthletes.map((athlete) => (
              <div className="list-item" key={athlete.id}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div className="competition-history-main">
                    <span className={`rank-mark rank-${Math.min(data.topAthletes.indexOf(athlete) + 1, 4)}`}>
                      <span className="rank-mark-glyph" aria-hidden="true">
                        {rankGlyph(data.topAthletes.indexOf(athlete) + 1)}
                      </span>
                      <span>{data.topAthletes.indexOf(athlete) + 1 <= 3 ? `top ${data.topAthletes.indexOf(athlete) + 1}` : "field"}</span>
                    </span>
                    <a href={athleteProfileHref(athlete.id)}>
                      <strong>{athlete.name}</strong>
                    </a>
                  </div>
                  <span>{athlete.bestTotal}</span>
                </div>
                <div className="score-bar" style={{ marginTop: 8 }}>
                  <div className="score-bar-meter">
                    <div
                      className="score-bar-fill"
                      style={{ width: `${Math.min((athlete.bestTotal / 400) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="muted">{athlete.competitionCount} meets</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
