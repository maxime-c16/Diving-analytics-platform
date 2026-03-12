import { useEffect, useMemo, useState } from "react";
import { fetchJson } from "./api";
import { clubProfileHref } from "./links";
import { SortableHeader } from "./SortableHeader";
import { nextSortDirection, parseCompetitionDate, type SortDirection } from "./tableSorting";

type Club = {
  slug: string;
  name: string;
  athleteCount: number;
  competitionCount: number;
  diveCount: number;
  bestTotal: number | null;
  latestCompetitionDate: string | null;
  latestCompetitionName: string | null;
  podiumCount: number;
};

type ClubSortKey = "club" | "roster" | "competitions" | "podiums" | "bestTotal" | "latestCompetition";

type ClubDirectoryViewProps = {
  initialList?: Club[];
};

function formatScore(value: number | null) {
  if (typeof value !== "number") {
    return "n/a";
  }
  return value.toFixed(2).replace(/\.00$/, "");
}

export function ClubDirectoryView(props: ClubDirectoryViewProps) {
  const [list, setList] = useState<Club[]>(props.initialList || []);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<ClubSortKey>("latestCompetition");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [visibleCount, setVisibleCount] = useState(18);

  useEffect(() => {
    fetchJson<Club[]>("/clubs")
      .then(setList)
      .catch((err) => setError(err.message));
  }, []);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const next = list.filter(
      (club) =>
        !normalizedQuery ||
        club.name.toLowerCase().includes(normalizedQuery) ||
        String(club.latestCompetitionName || "").toLowerCase().includes(normalizedQuery),
    );

    if (sortDirection) {
      next.sort((left, right) => {
        if (sortKey === "club") {
          return left.name.localeCompare(right.name);
        }
        if (sortKey === "roster") {
          return left.athleteCount - right.athleteCount || left.name.localeCompare(right.name);
        }
        if (sortKey === "competitions") {
          return left.competitionCount - right.competitionCount || left.name.localeCompare(right.name);
        }
        if (sortKey === "podiums") {
          return left.podiumCount - right.podiumCount || left.name.localeCompare(right.name);
        }
        if (sortKey === "bestTotal") {
          return (left.bestTotal || 0) - (right.bestTotal || 0) || left.name.localeCompare(right.name);
        }
        return parseCompetitionDate(left.latestCompetitionDate) - parseCompetitionDate(right.latestCompetitionDate) || left.name.localeCompare(right.name);
      });

      if (sortDirection === "desc") {
        next.reverse();
      }
    }

    return next;
  }, [list, query, sortDirection, sortKey]);

  useEffect(() => {
    setVisibleCount(18);
  }, [query, sortDirection, sortKey]);

  const spotlight = filtered.slice(0, 6);
  const visible = filtered.slice(0, visibleCount);

  function cycleSort(key: ClubSortKey) {
    const nextDirection = nextSortDirection(sortKey, sortDirection, key, {
      textMode: key === "club",
    });
    setSortKey(key);
    setSortDirection(nextDirection);
  }

  return (
    <div className="page-grid">
      {error ? <div className="notice">{error}</div> : null}

      <section className="panel directory-hero">
        <div>
          <h2>Club directory</h2>
          <p className="directory-note">
            Review roster depth, recent competition presence, podium activity, and direct links into athlete
            and competition workspaces.
          </p>
        </div>
        <div className="directory-hero-stats">
          <div>
            <span>Clubs</span>
            <strong>{list.length}</strong>
          </div>
          <div>
            <span>Most active</span>
            <strong>{filtered[0]?.name || "n/a"}</strong>
          </div>
          <div>
            <span>Largest roster</span>
            <strong>{Math.max(...list.map((club) => club.athleteCount), 0)}</strong>
          </div>
          <div>
            <span>Recent competition</span>
            <strong>{filtered[0]?.latestCompetitionDate || "n/a"}</strong>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="directory-toolbar">
          <label className="directory-field">
            <span>Search</span>
            <input
              className="input"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Club or latest competition"
              type="search"
              value={query}
            />
          </label>
          <div className="directory-toolbar-meta">
            <strong>{filtered.length}</strong>
            <span>clubs in view</span>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="section-head">
          <h2>Club spotlight</h2>
          <span className="muted">Current filter applied</span>
        </div>
        <div className="directory-card-grid">
          {spotlight.map((club) => (
            <a className="directory-card" href={clubProfileHref(club.name)} key={club.slug}>
              <div className="directory-card-head">
                <strong>{club.name}</strong>
                <span>{club.athleteCount} athletes</span>
              </div>
              <div className="muted">{club.latestCompetitionName || "No competition history available"}</div>
              
              <div className="directory-card-meta">
                <span>{club.competitionCount} meets</span>
                <span>{club.podiumCount} podiums</span>
                <span>{formatScore(club.bestTotal)}</span>
              </div>
            </a>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="section-head">
          <h2>Club results</h2>
          <span className="muted">
            Showing {visible.length} of {filtered.length}
          </span>
        </div>
        <table className="table table-clickable">
          <thead>
            <tr>
              <th>
                <SortableHeader active={sortKey === "club"} direction={sortDirection} label="Club" onClick={() => cycleSort("club")} />
              </th>
              <th>
                <SortableHeader active={sortKey === "roster"} direction={sortDirection} label="Roster" onClick={() => cycleSort("roster")} />
              </th>
              <th>
                <SortableHeader active={sortKey === "competitions"} direction={sortDirection} label="Competitions" onClick={() => cycleSort("competitions")} />
              </th>
              <th>
                <SortableHeader active={sortKey === "podiums"} direction={sortDirection} label="Podiums" onClick={() => cycleSort("podiums")} />
              </th>
              <th>
                <SortableHeader active={sortKey === "bestTotal"} direction={sortDirection} label="Best total" onClick={() => cycleSort("bestTotal")} />
              </th>
              <th>
                <SortableHeader active={sortKey === "latestCompetition"} direction={sortDirection} label="Latest competition" onClick={() => cycleSort("latestCompetition")} />
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((club) => (
              <tr key={club.slug} onClick={() => (window.location.href = clubProfileHref(club.name))}>
                <td>
                  <strong>{club.name}</strong>
                  <div className="muted">{club.diveCount} dives logged</div>
                </td>
                <td>{club.athleteCount}</td>
                <td>{club.competitionCount}</td>
                <td>{club.podiumCount}</td>
                <td>{formatScore(club.bestTotal)}</td>
                <td>
                  <strong>{club.latestCompetitionName || "n/a"}</strong>
                  <div className="muted">{club.latestCompetitionDate || "Date not recorded"}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length < filtered.length ? (
          <div className="directory-actions">
            <button className="button secondary" onClick={() => setVisibleCount((count) => count + 18)} type="button">
              Show 18 more
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
