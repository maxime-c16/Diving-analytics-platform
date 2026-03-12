import { useEffect, useMemo, useState } from "react";
import { fetchJson } from "./api";
import { athleteProfileHref, clubProfileHref } from "./links";

type Athlete = {
  id: number;
  name: string;
  birthYear: string | null;
  club: string | null;
  clubs?: string[];
  competitionCount: number;
  diveCount: number;
  averageDiveScore: number | null;
  bestTotal: number | null;
};

function formatScore(value: number | null) {
  if (typeof value !== "number") {
    return "n/a";
  }
  return value.toFixed(2).replace(/\.00$/, "");
}

function matchClub(athlete: Athlete, club: string) {
  if (!club) {
    return true;
  }
  return [athlete.club, ...(athlete.clubs || [])].filter(Boolean).includes(club);
}

export function AthleteDirectoryView() {
  const [list, setList] = useState<Athlete[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [club, setClub] = useState("");
  const [sortMode, setSortMode] = useState("best");
  const [visibleCount, setVisibleCount] = useState(24);

  useEffect(() => {
    fetchJson<Athlete[]>("/athletes")
      .then(setList)
      .catch((err) => setError(err.message));
  }, []);

  const clubs = useMemo(
    () =>
      Array.from(
        new Set(
          list.flatMap((athlete) => [athlete.club, ...(athlete.clubs || [])].filter(Boolean) as string[]),
        ),
      ).sort((left, right) => left.localeCompare(right)),
    [list],
  );

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const next = list.filter((athlete) => {
      const matchesQuery =
        !normalizedQuery ||
        athlete.name.toLowerCase().includes(normalizedQuery) ||
        String(athlete.birthYear || "").includes(normalizedQuery) ||
        [athlete.club, ...(athlete.clubs || [])]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedQuery));

      return matchesQuery && matchClub(athlete, club);
    });

    next.sort((left, right) => {
      if (sortMode === "name") {
        return left.name.localeCompare(right.name);
      }
      if (sortMode === "activity") {
        if (right.competitionCount !== left.competitionCount) {
          return right.competitionCount - left.competitionCount;
        }
        return right.diveCount - left.diveCount;
      }
      if (sortMode === "dives") {
        return right.diveCount - left.diveCount;
      }
      return (right.bestTotal || 0) - (left.bestTotal || 0);
    });

    return next;
  }, [club, list, query, sortMode]);

  const visible = filtered.slice(0, visibleCount);
  const spotlight = filtered.slice(0, 6);
  const averageCompetitions =
    list.length > 0
      ? (list.reduce((sum, athlete) => sum + athlete.competitionCount, 0) / list.length).toFixed(1)
      : "0";
  const deepestRosterClub =
    clubs
      .map((name) => ({
        name,
        count: list.filter((athlete) => matchClub(athlete, name)).length,
      }))
      .sort((left, right) => right.count - left.count)[0] || null;

  useEffect(() => {
    setVisibleCount(24);
  }, [club, query, sortMode]);

  return (
    <div className="page-grid">
      {error ? <div className="notice">{error}</div> : null}

      <section className="panel directory-hero">
        <div>
          <h2>Athlete directory</h2>
          <p className="directory-note">
            Filter the roster by performance, activity, and club, then move directly into each diver's
            full performance profile.
          </p>
        </div>
        <div className="directory-hero-stats">
          <div>
            <span>Athletes</span>
            <strong>{list.length}</strong>
          </div>
          <div>
            <span>Clubs</span>
            <strong>{clubs.length}</strong>
          </div>
          <div>
            <span>Avg competitions</span>
            <strong>{averageCompetitions}</strong>
          </div>
          <div>
            <span>Deepest club</span>
            <strong>{deepestRosterClub ? `${deepestRosterClub.name} (${deepestRosterClub.count})` : "n/a"}</strong>
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
              placeholder="Name, birth year, club"
              type="search"
              value={query}
            />
          </label>
          <label className="directory-field">
            <span>Club</span>
            <select className="input" onChange={(event) => setClub(event.target.value)} value={club}>
              <option value="">All clubs</option>
              {clubs.map((clubName) => (
                <option key={clubName} value={clubName}>
                  {clubName}
                </option>
              ))}
            </select>
          </label>
          <label className="directory-field">
            <span>Sort</span>
            <select className="input" onChange={(event) => setSortMode(event.target.value)} value={sortMode}>
              <option value="best">Best total</option>
              <option value="activity">Competition activity</option>
              <option value="dives">Dive volume</option>
              <option value="name">Name</option>
            </select>
          </label>
          <div className="directory-toolbar-meta">
            <strong>{filtered.length}</strong>
            <span>profiles in view</span>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="section-head">
          <h2>Spotlight</h2>
          <span className="muted">Current filter applied</span>
        </div>
        <div className="directory-card-grid">
          {spotlight.map((athlete) => (
            <a className="directory-card" href={athleteProfileHref(athlete.id)} key={athlete.id}>
              <div className="directory-card-head">
                <strong>{athlete.name}</strong>
                <span>{formatScore(athlete.bestTotal)}</span>
              </div>
              <div className="muted">{athlete.birthYear || "Birth year not recorded"}</div>
              <div className="muted">{athlete.club || "Club not recorded"}</div>
              <div className="directory-card-meta">
                <span>{athlete.competitionCount} meets</span>
                <span>{athlete.diveCount} dives</span>
              </div>
            </a>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="section-head">
          <h2>Directory results</h2>
          <span className="muted">
            Showing {visible.length} of {filtered.length}
          </span>
        </div>
        <table className="table table-clickable">
          <thead>
            <tr>
              <th>Athlete</th>
              <th>Club</th>
              <th>Competitions</th>
              <th>Dives</th>
              <th>Average dive</th>
              <th>Best total</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((athlete) => (
              <tr key={athlete.id} onClick={() => (window.location.href = athleteProfileHref(athlete.id))}>
                <td>
                  <strong>{athlete.name}</strong>
                  <div className="muted">{athlete.birthYear || "Birth year not recorded"}</div>
                </td>
                <td>
                  {athlete.club ? (
                    <a href={clubProfileHref(athlete.club)}>
                      <strong>{athlete.club}</strong>
                    </a>
                  ) : (
                    <strong>Club not recorded</strong>
                  )}
                  {athlete.clubs && athlete.clubs.length > 1 ? (
                    <div className="muted">{athlete.clubs.length} clubs on record</div>
                  ) : null}
                </td>
                <td>{athlete.competitionCount}</td>
                <td>{athlete.diveCount}</td>
                <td>{formatScore(athlete.averageDiveScore)}</td>
                <td>{formatScore(athlete.bestTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length < filtered.length ? (
          <div className="directory-actions">
            <button className="button secondary" onClick={() => setVisibleCount((count) => count + 24)} type="button">
              Show 24 more
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
