import { applyDivingRules } from "../../../packages/diving-rules";
import { parseDiveCode } from "../../../packages/dive-code";
import { db } from "./db";
import { normalizeCompetitionDate, toTimestamp } from "./dates";
import { clubSlug, normalizeClubName } from "./strings";

type ScoreRow = { final_score: number | null };

function parseJsonArray(value: unknown) {
  try {
    return JSON.parse(String(value || "[]"));
  } catch {
    return [];
  }
}

function normalizeEventFamily(eventName: string | null, eventType: "individual" | "synchro") {
  const lower = String(eventName || "").toLowerCase();

  if (eventType === "synchro") {
    if (lower.includes("platform")) {
      return { key: "synchro_platform", label: "Synchro Platform" };
    }
    if (lower.includes("3m")) {
      return { key: "synchro_3m", label: "Synchro 3m" };
    }
    if (lower.includes("1m")) {
      return { key: "synchro_1m", label: "Synchro 1m" };
    }
    return { key: "synchro_other", label: "Synchro Other" };
  }

  if (lower.includes("platform") || lower.includes("tower") || lower.includes("hv")) {
    return { key: "platform", label: "Platform" };
  }
  if (lower.includes("3m")) {
    return { key: "3m", label: "3m" };
  }
  if (lower.includes("1m")) {
    return { key: "1m", label: "1m" };
  }
  return { key: "other", label: "Other" };
}

function normalizePersonName(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function athleteIdentityKey(name: string | null | undefined, birthYear: string | null | undefined) {
  return `${normalizePersonName(name)}::${String(birthYear || "").trim()}`;
}

function buildAthleteIdByName() {
  const rows = db
    .query(`
      SELECT
        MIN(id) AS id,
        name
      FROM athletes
      GROUP BY LOWER(TRIM(name))
    `)
    .all() as Array<{ id: number; name: string }>;

  return new Map(rows.map((row) => [normalizePersonName(row.name), row.id]));
}

function buildAthleteIdByIdentity() {
  const rows = db
    .query(`
      SELECT
        MIN(id) AS id,
        name,
        birth_year AS birthYear
      FROM athletes
      GROUP BY LOWER(TRIM(name)), IFNULL(birth_year, '')
    `)
    .all() as Array<{ id: number; name: string; birthYear: string | null }>;

  return new Map(rows.map((row) => [athleteIdentityKey(row.name, row.birthYear), row.id]));
}

function buildCanonicalAthleteName(name: string | null | undefined, fallback: string | null | undefined) {
  const candidates = [String(name || "").trim(), String(fallback || "").trim()].filter(Boolean);
  return candidates.sort((left, right) => left.length - right.length || left.localeCompare(right))[0] || null;
}

function roundMetric(value: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }
  return Number(value.toFixed(2));
}

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }
  return roundMetric(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function standardDeviation(values: number[]) {
  if (values.length < 2) {
    return null;
  }
  const avg = average(values);
  if (avg === null) {
    return null;
  }
  const variance =
    values.reduce((sum, value) => sum + Math.pow(value - avg, 2), 0) / values.length;
  return roundMetric(Math.sqrt(variance));
}

export function listCompetitions() {
  return db
    .query(`
      SELECT
        c.id,
        c.name,
        c.location,
        c.date,
        c.source_file AS sourceFile,
        c.source_method AS sourceMethod,
        c.total_dives AS totalDives,
        c.total_athletes AS totalAthletes,
        c.total_events AS totalEvents,
        c.created_at AS createdAt,
        ROUND(AVG(d.final_score), 2) AS averageDiveScore,
        ROUND(MAX(d.cumulative_score), 2) AS winningScore
      FROM competitions c
      LEFT JOIN dives d ON d.competition_id = c.id
      GROUP BY c.id
      ORDER BY COALESCE(c.date, c.created_at) DESC, c.id DESC
    `)
    .all()
    .map((competition: any) => ({
      ...competition,
      date: normalizeCompetitionDate(competition.date),
    }))
    .sort(
      (left: any, right: any) =>
        toTimestamp(right.date) - toTimestamp(left.date) || Number(right.id) - Number(left.id),
    );
}

export function getCompetitionDetail(id: number) {
  const competition = db
    .query(`
      SELECT
        c.id,
        c.name,
        c.location,
        c.date,
        c.source_file AS sourceFile,
        c.source_method AS sourceMethod,
        c.total_dives AS totalDives,
        c.total_athletes AS totalAthletes,
        c.total_events AS totalEvents,
        c.created_at AS createdAt
      FROM competitions c
      WHERE c.id = ?
    `)
    .get(id);

  if (!competition) {
    return null;
  }

  const athleteIdByName = buildAthleteIdByName();

  const athletes = db
    .query(`
      SELECT
        MIN(a.id) AS id,
        MIN(a.name) AS name,
        a.birth_year AS birthYear,
        MIN(a.club) AS club,
        MIN(e.rank) AS rank,
        COUNT(DISTINCT d.id) AS diveCount,
        ROUND(AVG(d.final_score), 2) AS averageDiveScore,
        ROUND(MAX(d.cumulative_score), 2) AS finalTotal,
        GROUP_CONCAT(DISTINCT e.event_name) AS events
      FROM entry_members em
      INNER JOIN entries e ON e.id = em.entry_id
      INNER JOIN athletes a ON a.id = em.athlete_id
      LEFT JOIN dives d ON d.entry_id = e.id
      WHERE e.competition_id = ?
      GROUP BY LOWER(TRIM(a.name)), a.birth_year
      ORDER BY rank ASC, finalTotal DESC, a.name ASC
    `)
    .all(id)
    .map((athlete: any) => ({
      ...athlete,
      id: athleteIdByName.get(normalizePersonName(athlete.name)) || athlete.id,
      club: normalizeClubName(athlete.club, athlete.name),
      events: athlete.events ? String(athlete.events).split(",") : [],
    }));

  const entries = db
    .query(`
      SELECT
        e.id,
        e.entry_name AS entryName,
        e.primary_name AS primaryName,
        e.rank,
        e.event_name AS eventName,
        e.event_type AS eventType,
        e.participant_names AS participantNames,
        COUNT(d.id) AS diveCount,
        ROUND(MAX(d.final_score), 2) AS bestDive,
        ROUND(MAX(d.cumulative_score), 2) AS finalTotal
      FROM entries e
      LEFT JOIN dives d ON d.entry_id = e.id
      WHERE e.competition_id = ?
      GROUP BY e.id, e.entry_name, e.primary_name, e.rank, e.event_name, e.event_type, e.participant_names
      ORDER BY e.event_name, e.rank, e.entry_name
    `)
    .all(id)
    .map((entry: any) => ({
      ...entry,
      participantNames: parseJsonArray(entry.participantNames),
    }));

  const eventSummaries = db
    .query(`
      SELECT
        e.event_name AS eventName,
        e.event_type AS eventType,
        COUNT(d.id) AS diveCount,
        COUNT(DISTINCT e.id) AS athleteCount,
        ROUND(MAX(d.cumulative_score), 2) AS winningScore
      FROM entries e
      LEFT JOIN dives d ON d.entry_id = e.id
      WHERE e.competition_id = ?
      GROUP BY e.event_name, e.event_type
      ORDER BY e.event_name
    `)
    .all(id);

  const dives = db
    .query(`
      SELECT
        d.id,
        d.athlete_id AS athleteId,
        d.entry_id AS entryId,
        d.athlete_name AS athleteName,
        d.entry_name AS entryName,
        d.participant_names AS participantNames,
        d.rank,
        d.event_name AS eventName,
        d.event_type AS eventType,
        d.dive_code AS diveCode,
        d.description,
        d.height,
        d.difficulty,
        d.judge_scores AS judgeScores,
        d.execution_scores AS executionScores,
        d.synchronization_scores AS synchronizationScores,
        d.total,
        d.final_score AS finalScore,
        d.cumulative_score AS cumulativeScore,
        d.penalty
      FROM dives d
      WHERE d.competition_id = ?
      ORDER BY d.event_name, d.rank, d.id
    `)
    .all(id)
    .map((dive: any) => ({
      ...dive,
      athleteId: athleteIdByName.get(normalizePersonName(dive.athleteName)) || dive.athleteId,
      participantNames: parseJsonArray(dive.participantNames),
      judgeScores: parseJsonArray(dive.judgeScores),
      executionScores: parseJsonArray(dive.executionScores),
      synchronizationScores: parseJsonArray(dive.synchronizationScores),
    }));

  return {
    competition: {
      ...competition,
      date: normalizeCompetitionDate((competition as any).date),
    },
    athletes,
    entries,
    eventSummaries,
    dives,
  };
}

export function listAthletes() {
  const athleteIdByIdentity = buildAthleteIdByIdentity();

  return db
    .query(`
      SELECT
        MIN(a.id) AS id,
        MIN(a.name) AS name,
        a.birth_year AS birthYear,
        GROUP_CONCAT(DISTINCT a.club) AS clubs,
        COUNT(DISTINCT e.competition_id) AS competitionCount,
        COUNT(DISTINCT d.id) AS diveCount,
        ROUND(AVG(d.final_score), 2) AS averageDiveScore,
        ROUND(MAX(d.cumulative_score), 2) AS bestTotal
      FROM athletes a
      LEFT JOIN entry_members em ON em.athlete_id = a.id
      LEFT JOIN entries e ON e.id = em.entry_id
      LEFT JOIN dives d ON d.entry_id = e.id
      GROUP BY LOWER(TRIM(a.name)), a.birth_year
      ORDER BY competitionCount DESC, bestTotal DESC, a.name ASC
    `)
    .all()
    .map((athlete: any) => {
      const clubs = athlete.clubs
        ? String(athlete.clubs)
            .split(",")
            .filter(Boolean)
        : [];
      return {
        ...athlete,
        id: athleteIdByIdentity.get(athleteIdentityKey(athlete.name, athlete.birthYear)) || athlete.id,
        club: normalizeClubName(clubs[0] || null, athlete.name),
        clubs: clubs.map((club: string) => normalizeClubName(club, athlete.name)).filter(Boolean),
      };
    });
}

export function listClubs() {
  const athleteIdByIdentity = buildAthleteIdByIdentity();
  const rows = db
    .query(`
      SELECT
        a.id,
        a.name,
        a.birth_year AS birthYear,
        a.club,
        e.id AS entryId,
        e.rank,
        e.event_name AS eventName,
        e.event_type AS eventType,
        c.id AS competitionId,
        c.name AS competitionName,
        c.date AS competitionDate,
        d.id AS diveId,
        d.final_score AS finalScore,
        d.cumulative_score AS cumulativeScore
      FROM athletes a
      LEFT JOIN entry_members em ON em.athlete_id = a.id
      LEFT JOIN entries e ON e.id = em.entry_id
      LEFT JOIN competitions c ON c.id = e.competition_id
      LEFT JOIN dives d ON d.entry_id = e.id
    `)
    .all() as Array<any>;

  const clubs = new Map<
    string,
    {
      slug: string;
      name: string;
      athleteIds: Set<number>;
      competitionIds: Set<number>;
      diveIds: Set<number>;
      bestTotal: number | null;
      latestCompetitionDate: string | null;
      latestCompetitionName: string | null;
      podiumCount: number;
    }
  >();

  for (const row of rows) {
    const normalizedClub = normalizeClubName(row.club, row.name);
    if (!normalizedClub) {
      continue;
    }

    const key = normalizePersonName(normalizedClub);
    const current =
      clubs.get(key) ||
      {
        slug: clubSlug(normalizedClub),
        name: normalizedClub,
        athleteIds: new Set<number>(),
        competitionIds: new Set<number>(),
        diveIds: new Set<number>(),
        bestTotal: null as number | null,
        latestCompetitionDate: null as string | null,
        latestCompetitionName: null as string | null,
        podiumCount: 0,
      };

    current.athleteIds.add(athleteIdByIdentity.get(athleteIdentityKey(row.name, row.birthYear)) || row.id);
    if (row.competitionId) {
      current.competitionIds.add(row.competitionId);
    }
    if (row.diveId) {
      current.diveIds.add(row.diveId);
    }
    if (typeof row.cumulativeScore === "number") {
      current.bestTotal = Math.max(current.bestTotal || 0, row.cumulativeScore);
    }
    if (row.competitionDate && toTimestamp(row.competitionDate) >= toTimestamp(current.latestCompetitionDate)) {
      current.latestCompetitionDate = normalizeCompetitionDate(row.competitionDate);
      current.latestCompetitionName = row.competitionName;
    }
    if (row.entryId && [1, 2, 3].includes(Number(row.rank))) {
      current.podiumCount += 1;
    }

    clubs.set(key, current);
  }

  return Array.from(clubs.values())
    .map((club) => ({
      slug: club.slug,
      name: club.name,
      athleteCount: club.athleteIds.size,
      competitionCount: club.competitionIds.size,
      diveCount: club.diveIds.size,
      bestTotal: club.bestTotal,
      latestCompetitionDate: club.latestCompetitionDate,
      latestCompetitionName: club.latestCompetitionName,
      podiumCount: club.podiumCount,
    }))
    .sort(
      (left, right) =>
        toTimestamp(right.latestCompetitionDate) - toTimestamp(left.latestCompetitionDate) ||
        right.athleteCount - left.athleteCount ||
        left.name.localeCompare(right.name),
    );
}

export function getClubDetail(slug: string) {
  const athleteIdByIdentity = buildAthleteIdByIdentity();
  const athletes = db
    .query(`
      SELECT
        id,
        name,
        birth_year AS birthYear,
        club
      FROM athletes
    `)
    .all() as Array<{ id: number; name: string; birthYear: string | null; club: string | null }>;

  const matchingAthletes = athletes.filter((athlete) => clubSlug(normalizeClubName(athlete.club, athlete.name)) === slug);
  if (matchingAthletes.length === 0) {
    return null;
  }

  const clubName = normalizeClubName(matchingAthletes[0].club, matchingAthletes[0].name) || "Unknown club";
  const athleteIds = matchingAthletes.map((athlete) => athlete.id);
  const placeholders = athleteIds.map(() => "?").join(", ");

  const rosterRows = db
    .query(`
      SELECT
        MIN(a.id) AS athleteId,
        MIN(a.name) AS athleteName,
        a.birth_year AS birthYear,
        COUNT(DISTINCT e.competition_id) AS competitionCount,
        COUNT(DISTINCT d.id) AS diveCount,
        ROUND(MAX(d.cumulative_score), 2) AS bestTotal,
        MAX(c.date) AS latestCompetitionDate,
        MIN(c.name) AS latestCompetitionName
      FROM athletes a
      LEFT JOIN entry_members em ON em.athlete_id = a.id
      LEFT JOIN entries e ON e.id = em.entry_id
      LEFT JOIN competitions c ON c.id = e.competition_id
      LEFT JOIN dives d ON d.entry_id = e.id
      WHERE a.id IN (${placeholders})
      GROUP BY LOWER(TRIM(a.name)), a.birth_year
    `)
    .all(...athleteIds) as Array<any>;

  const entryRows = db
    .query(`
      SELECT
        e.id AS entryId,
        e.rank,
        e.entry_name AS entryName,
        e.event_name AS eventName,
        e.event_type AS eventType,
        e.participant_names AS participantNames,
        c.id AS competitionId,
        c.name AS competitionName,
        c.date AS competitionDate,
        ROUND(MAX(d.cumulative_score), 2) AS finalTotal,
        COUNT(DISTINCT d.id) AS diveCount
      FROM entries e
      INNER JOIN competitions c ON c.id = e.competition_id
      LEFT JOIN dives d ON d.entry_id = e.id
      WHERE EXISTS (
        SELECT 1
        FROM entry_members em
        WHERE em.entry_id = e.id AND em.athlete_id IN (${placeholders})
      )
      GROUP BY e.id, e.rank, e.entry_name, e.event_name, e.event_type, e.participant_names, c.id, c.name, c.date
    `)
    .all(...athleteIds)
    .map((entry: any) => ({
      ...entry,
      competitionDate: normalizeCompetitionDate(entry.competitionDate),
      participantNames: parseJsonArray(entry.participantNames),
    })) as Array<any>;

  const diveRows = db
    .query(`
      SELECT
        d.id AS diveId,
        d.entry_id AS entryId,
        d.dive_code AS diveCode,
        d.final_score AS finalScore,
        d.cumulative_score AS cumulativeScore,
        d.event_name AS eventName,
        d.event_type AS eventType,
        d.athlete_name AS athleteName,
        d.entry_name AS entryName,
        c.id AS competitionId,
        c.name AS competitionName,
        c.date AS competitionDate
      FROM dives d
      INNER JOIN competitions c ON c.id = d.competition_id
      WHERE d.athlete_id IN (${placeholders})
    `)
    .all(...athleteIds)
    .map((dive: any) => ({
      ...dive,
      competitionDate: normalizeCompetitionDate(dive.competitionDate),
    })) as Array<any>;

  const roster = rosterRows
    .map((row) => ({
      athleteId: athleteIdByIdentity.get(athleteIdentityKey(row.athleteName, row.birthYear)) || row.athleteId,
      athleteName: row.athleteName,
      birthYear: row.birthYear,
      competitionCount: row.competitionCount,
      diveCount: row.diveCount,
      bestTotal: row.bestTotal,
      latestCompetitionDate: normalizeCompetitionDate(row.latestCompetitionDate),
      latestCompetitionName: row.latestCompetitionName,
    }))
    .sort((left, right) => (right.bestTotal || 0) - (left.bestTotal || 0) || left.athleteName.localeCompare(right.athleteName));

  const competitionHistory = Array.from(
    entryRows.reduce((map, entry) => {
      const current =
        map.get(entry.competitionId) ||
        {
          competitionId: entry.competitionId,
          competitionName: entry.competitionName,
          competitionDate: entry.competitionDate,
          athleteCount: new Set<number>(),
          eventCount: new Set<string>(),
          diveCount: 0,
          bestTotal: null as number | null,
          featuredEventName: null as string | null,
          featuredEntryId: null as number | null,
          featuredEntryName: null as string | null,
          featuredRank: null as number | null,
        };

      const members = matchingAthletes.filter((athlete) =>
        entry.participantNames.some((name: string) => normalizePersonName(name) === normalizePersonName(athlete.name)),
      );
      members.forEach((member) =>
        current.athleteCount.add(athleteIdByIdentity.get(athleteIdentityKey(member.name, member.birthYear)) || member.id),
      );
      if (entry.eventName) {
        current.eventCount.add(entry.eventName);
      }
      current.diveCount += entry.diveCount || 0;

      if ((entry.finalTotal || 0) >= (current.bestTotal || 0)) {
        current.bestTotal = entry.finalTotal;
        current.featuredEventName = entry.eventName;
        current.featuredEntryId = entry.entryId;
        current.featuredEntryName = entry.entryName;
        current.featuredRank = entry.rank;
      }

      map.set(entry.competitionId, current);
      return map;
    }, new Map<number, any>()),
  )
    .map(([, value]) => ({
      ...value,
      athleteCount: value.athleteCount.size,
      eventCount: value.eventCount.size,
    }))
    .sort((left, right) => toTimestamp(right.competitionDate) - toTimestamp(left.competitionDate));

  const competitionIds = competitionHistory.map((row) => row.competitionId);
  const competitionPlaceholders = competitionIds.map(() => "?").join(", ");
  const clubCompetitionRows =
    competitionIds.length > 0
      ? (db
          .query(`
            SELECT
              a.name,
              a.birth_year AS birthYear,
              a.club,
              c.id AS competitionId,
              e.event_name AS eventName,
              d.id AS diveId,
              d.cumulative_score AS cumulativeScore
            FROM athletes a
            LEFT JOIN entry_members em ON em.athlete_id = a.id
            LEFT JOIN entries e ON e.id = em.entry_id
            LEFT JOIN competitions c ON c.id = e.competition_id
            LEFT JOIN dives d ON d.entry_id = e.id
            WHERE c.id IN (${competitionPlaceholders})
          `)
          .all(...competitionIds) as Array<any>)
      : [];

  const clubRanksByCompetition = new Map<number, Map<string, number>>();

  for (const row of clubCompetitionRows) {
    const normalizedClub = normalizeClubName(row.club, row.name);
    if (!normalizedClub || !row.competitionId) {
      continue;
    }

    const competitionMap =
      clubRanksByCompetition.get(row.competitionId) ||
      new Map<string, { name: string; bestTotal: number; athleteIds: Set<number>; eventNames: Set<string> }>();
    const key = normalizePersonName(normalizedClub);
    const current =
      competitionMap.get(key) || {
        name: normalizedClub,
        bestTotal: 0,
        athleteIds: new Set<number>(),
        eventNames: new Set<string>(),
      };

    current.athleteIds.add(athleteIdByIdentity.get(athleteIdentityKey(row.name, row.birthYear)) || 0);
    if (row.eventName) {
      current.eventNames.add(row.eventName);
    }
    if (typeof row.cumulativeScore === "number") {
      current.bestTotal = Math.max(current.bestTotal, row.cumulativeScore);
    }

    competitionMap.set(key, current);
    clubRanksByCompetition.set(row.competitionId, competitionMap);
  }

  for (const [competitionId, clubs] of clubRanksByCompetition) {
    const ranked = Array.from(clubs.values()).sort(
      (left, right) =>
        right.bestTotal - left.bestTotal ||
        right.athleteIds.size - left.athleteIds.size ||
        right.eventNames.size - left.eventNames.size ||
        left.name.localeCompare(right.name),
    );
    const rankMap = new Map<string, number>();
    ranked.forEach((club, index) => {
      rankMap.set(normalizePersonName(club.name), index + 1);
    });
    clubRanksByCompetition.set(competitionId, rankMap as any);
  }

  const latestCompetition = competitionHistory[0] || null;

  const eventTypeStats = Array.from(
    entryRows.reduce((map, entry) => {
      const family = normalizeEventFamily(entry.eventName, entry.eventType);
      const current =
        map.get(family.key) ||
        {
          eventFamily: family.key,
          label: family.label,
          eventType: entry.eventType,
          appearanceCount: 0,
          athleteCount: new Set<number>(),
          bestTotal: null as number | null,
          bestCompetitionId: null as number | null,
          bestCompetitionName: null as string | null,
          bestEventName: null as string | null,
          bestEntryId: null as number | null,
          latestCompetitionDate: null as string | null,
          latestCompetitionId: null as number | null,
          latestCompetitionName: null as string | null,
          latestEventName: null as string | null,
          latestEntryId: null as number | null,
        };

      current.appearanceCount += 1;
      matchingAthletes.forEach((athlete) => {
        if (entry.participantNames.some((name: string) => normalizePersonName(name) === normalizePersonName(athlete.name))) {
          current.athleteCount.add(
            athleteIdByIdentity.get(athleteIdentityKey(athlete.name, athlete.birthYear)) || athlete.id,
          );
        }
      });
      if (typeof entry.finalTotal === "number") {
        if (entry.finalTotal >= (current.bestTotal || 0)) {
          current.bestTotal = entry.finalTotal;
          current.bestCompetitionId = entry.competitionId;
          current.bestCompetitionName = entry.competitionName;
          current.bestEventName = entry.eventName;
          current.bestEntryId = entry.entryId;
        }
      }
      if (toTimestamp(entry.competitionDate) >= toTimestamp(current.latestCompetitionDate)) {
        current.latestCompetitionDate = entry.competitionDate;
        current.latestCompetitionId = entry.competitionId;
        current.latestCompetitionName = entry.competitionName;
        current.latestEventName = entry.eventName;
        current.latestEntryId = entry.entryId;
      }

      map.set(family.key, current);
      return map;
    }, new Map<string, any>()),
  )
    .map(([, value]) => ({
      ...value,
      athleteCount: value.athleteCount.size,
    }))
    .sort((left, right) => (right.bestTotal || 0) - (left.bestTotal || 0));

  const topResults = [...entryRows]
    .sort((left, right) => (right.finalTotal || 0) - (left.finalTotal || 0))
    .slice(0, 8)
    .map((entry) => ({
      competitionId: entry.competitionId,
      competitionName: entry.competitionName,
      competitionDate: entry.competitionDate,
      eventName: entry.eventName,
      eventType: entry.eventType,
      entryId: entry.entryId,
      entryName: entry.entryName,
      rank: entry.rank,
      finalTotal: entry.finalTotal,
    }));

  const recentDives = [...diveRows]
    .sort((left, right) => toTimestamp(right.competitionDate) - toTimestamp(left.competitionDate) || Number(right.diveId) - Number(left.diveId))
    .slice(0, 24);

  const podiumCount = entryRows.filter((entry) => [1, 2, 3].includes(Number(entry.rank))).length;
  const bestTotal = entryRows.reduce((max, entry) => Math.max(max, Number(entry.finalTotal || 0)), 0) || null;

  return {
    club: {
      slug,
      name: clubName,
      athleteCount: roster.length,
      competitionCount: competitionHistory.length,
      diveCount: diveRows.length,
      bestTotal,
      podiumCount,
      latestCompetitionDate: latestCompetition?.competitionDate || null,
    },
    latestCompetition: latestCompetition
      ? {
          ...latestCompetition,
          competitionRank:
            (clubRanksByCompetition.get(latestCompetition.competitionId) as Map<string, number> | undefined)?.get(
              normalizePersonName(clubName),
            ) || null,
        }
      : null,
    roster,
    eventTypeStats,
    topResults,
    competitionHistory: competitionHistory.map((competition) => ({
      ...competition,
      competitionRank:
        (clubRanksByCompetition.get(competition.competitionId) as Map<string, number> | undefined)?.get(
          normalizePersonName(clubName),
        ) || null,
    })),
    recentDives,
  };
}

export function getAthleteDetail(id: number) {
  const athlete = db
    .query(`
      SELECT
        id,
        name,
        birth_year AS birthYear,
        club,
        created_at AS createdAt
      FROM athletes
      WHERE id = ?
    `)
    .get(id);

  if (!athlete) {
    return null;
  }

  const relatedAthletes = db
    .query(`
      SELECT
        id,
        name,
        birth_year AS birthYear,
        club
      FROM athletes
      WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) AND IFNULL(birth_year, '') = IFNULL(?, '')
      ORDER BY id ASC
    `)
    .all((athlete as any).name, (athlete as any).birthYear || null) as Array<{
      id: number;
      name: string;
      birthYear: string | null;
      club: string | null;
    }>;

  const athleteIds = relatedAthletes.map((row) => row.id);
  const placeholders = athleteIds.map(() => "?").join(", ");
  const athleteIdByName = buildAthleteIdByName();
  const athleteIdByIdentity = buildAthleteIdByIdentity();

  const dives = db
    .query(`
      SELECT DISTINCT
        d.id,
        d.entry_id AS entryId,
        e.rank,
        d.event_name AS eventName,
        d.event_type AS eventType,
        d.entry_name AS entryName,
        d.participant_names AS participantNames,
        d.dive_code AS diveCode,
        d.description,
        d.height,
        d.difficulty,
        d.judge_scores AS judgeScores,
        d.execution_scores AS executionScores,
        d.synchronization_scores AS synchronizationScores,
        d.total,
        d.final_score AS finalScore,
        d.cumulative_score AS cumulativeScore,
        d.penalty,
        c.id AS competitionId,
        c.name AS competitionName,
        c.date AS competitionDate
      FROM entry_members em
      INNER JOIN entries e ON e.id = em.entry_id
      INNER JOIN dives d ON d.entry_id = e.id
      INNER JOIN competitions c ON c.id = e.competition_id
      WHERE em.athlete_id IN (${placeholders})
      ORDER BY COALESCE(c.date, c.created_at) DESC, d.id ASC
    `)
    .all(...athleteIds)
    .map((dive: any) => ({
      ...dive,
      competitionDate: normalizeCompetitionDate(dive.competitionDate),
      participantNames: parseJsonArray(dive.participantNames),
      judgeScores: parseJsonArray(dive.judgeScores),
      executionScores: parseJsonArray(dive.executionScores),
      synchronizationScores: parseJsonArray(dive.synchronizationScores),
    }))
    .sort(
      (left: any, right: any) =>
        toTimestamp(right.competitionDate) - toTimestamp(left.competitionDate) || Number(left.id) - Number(right.id),
    );

  const scores = dives
    .map((dive: any) => dive.finalScore)
    .filter((score: number | null) => typeof score === "number") as number[];

  const averageDiveScore =
    scores.length > 0
      ? Number((scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(2))
      : null;

  const totalsByCompetition = db
    .query(`
      SELECT
        c.id AS competitionId,
        c.name AS competitionName,
        c.date AS competitionDate,
        ROUND(MAX(d.cumulative_score), 2) AS finalTotal,
        COUNT(DISTINCT d.id) AS diveCount
      FROM entry_members em
      INNER JOIN entries e ON e.id = em.entry_id
      INNER JOIN dives d ON d.entry_id = e.id
      INNER JOIN competitions c ON c.id = e.competition_id
      WHERE em.athlete_id IN (${placeholders})
      GROUP BY c.id, c.name, c.date
      ORDER BY COALESCE(c.date, c.created_at) DESC
    `)
    .all(...athleteIds)
    .map((competition: any) => ({
      ...competition,
      competitionDate: normalizeCompetitionDate(competition.competitionDate),
    }))
    .sort(
      (left: any, right: any) =>
        toTimestamp(right.competitionDate) - toTimestamp(left.competitionDate) ||
        Number(right.competitionId) - Number(left.competitionId),
    );

  const clubHistory = relatedAthletes
    .map((row) => ({
      club: normalizeClubName(row.club, row.name),
      athleteId: row.id,
      lastSeenAt:
        dives
          .filter((dive: any) =>
            (dive.participantNames || []).some(
              (candidate: string) => normalizePersonName(candidate) === normalizePersonName(row.name),
            ),
          )
          .map((dive: any) => dive.competitionDate)
          .sort((left: string | null, right: string | null) => toTimestamp(right) - toTimestamp(left))[0] || null,
    }))
    .filter((row, index, list) => row.club && list.findIndex((candidate) => candidate.club === row.club) === index);

  const competitionHistoryMap = new Map<
    string,
    {
      competitionId: number;
      competitionName: string;
      competitionDate: string | null;
      eventName: string | null;
      eventType: "individual" | "synchro";
      entryId: number | null;
      rank: number | null;
      finalTotal: number | null;
      partnerNames: string[];
      partnerLinks: Array<{ id: number; name: string }>;
    }
  >();

  for (const dive of dives as any[]) {
    const key = `${dive.competitionId}:${dive.eventName}:${dive.entryId}`;
    const existing = competitionHistoryMap.get(key);
    const partnerNames = (dive.participantNames || []).filter(
      (name: string) => normalizePersonName(name) !== normalizePersonName((athlete as any).name),
    );
    if (existing) {
      existing.finalTotal =
        typeof dive.cumulativeScore === "number"
          ? Math.max(existing.finalTotal || 0, dive.cumulativeScore)
          : existing.finalTotal;
      continue;
    }
    competitionHistoryMap.set(key, {
      competitionId: dive.competitionId,
      competitionName: dive.competitionName,
      competitionDate: dive.competitionDate,
      eventName: dive.eventName,
      eventType: dive.eventType,
      entryId: dive.entryId,
      rank: dive.rank || null,
      finalTotal: dive.cumulativeScore || null,
      partnerNames,
      partnerLinks: partnerNames
        .map((name: string) => ({
          id: athleteIdByName.get(normalizePersonName(name)) || 0,
          name,
        }))
        .filter((partner) => partner.id > 0),
    });
  }

  const competitionHistory = Array.from(competitionHistoryMap.values()).sort(
    (left, right) => toTimestamp(right.competitionDate) - toTimestamp(left.competitionDate),
  );

  const latestCompetition = competitionHistory[0] || null;

  const eventTypeStats = Array.from(
    (dives as any[]).reduce((map, dive) => {
      const family = normalizeEventFamily(dive.eventName, dive.eventType);
      const current =
        map.get(family.key) ||
        {
          eventFamily: family.key,
          label: family.label,
          eventType: dive.eventType,
          bestTotal: null as number | null,
          bestDive: null as number | null,
          competitionCount: 0,
          latestCompetitionDate: null as string | null,
          latestCompetitionId: null as number | null,
          latestCompetitionName: null as string | null,
          latestEventName: null as string | null,
          latestEntryId: null as number | null,
        };

      current.bestTotal =
        typeof dive.cumulativeScore === "number"
          ? Math.max(current.bestTotal || 0, dive.cumulativeScore)
          : current.bestTotal;
      current.bestDive =
        typeof dive.finalScore === "number"
          ? Math.max(current.bestDive || 0, dive.finalScore)
          : current.bestDive;

      if (toTimestamp(dive.competitionDate) >= toTimestamp(current.latestCompetitionDate)) {
        current.latestCompetitionDate = dive.competitionDate;
        current.latestCompetitionId = dive.competitionId;
        current.latestCompetitionName = dive.competitionName;
        current.latestEventName = dive.eventName;
        current.latestEntryId = dive.entryId;
      }

      map.set(family.key, current);
      return map;
    }, new Map<string, any>()),
  )
    .map(([, value]) => ({
      ...value,
      competitionCount: competitionHistory.filter((row) =>
        normalizeEventFamily(row.eventName, row.eventType).key === value.eventFamily,
      ).length,
    }))
    .sort((left, right) => (right.bestTotal || 0) - (left.bestTotal || 0));

  const bestDiveByEventType = eventTypeStats.map((stat) => {
    const matchingDive = (dives as any[])
      .filter((dive) => normalizeEventFamily(dive.eventName, dive.eventType).key === stat.eventFamily)
      .sort((left, right) => (right.finalScore || 0) - (left.finalScore || 0))[0];
    return {
      eventFamily: stat.eventFamily,
      label: stat.label,
      bestDiveCode: matchingDive?.diveCode || null,
      bestDiveScore: matchingDive?.finalScore || null,
      eventName: matchingDive?.eventName || null,
      competitionId: matchingDive?.competitionId || null,
      competitionName: matchingDive?.competitionName || null,
      entryId: matchingDive?.entryId || null,
      diveId: matchingDive?.id || null,
    };
  });

  const partnerStats = Array.from(
    (dives as any[])
      .filter((dive) => dive.eventType === "synchro")
      .reduce((map, dive) => {
        const normalizedAthleteName = normalizePersonName((athlete as any).name);
        const partner = (dive.participantNames || []).find(
          (name: string) => normalizePersonName(name) !== normalizedAthleteName,
        );
        if (!partner) {
          return map;
        }
        const current =
          map.get(partner) ||
          {
            partnerName: partner,
            partnerId: athleteIdByName.get(normalizePersonName(partner)) || null,
            bestTotal: null as number | null,
            latestCompetitionDate: null as string | null,
            latestCompetitionId: null as number | null,
            latestCompetitionName: null as string | null,
            latestEventName: null as string | null,
            latestEntryId: null as number | null,
            appearances: 0,
          };

        current.bestTotal =
          typeof dive.cumulativeScore === "number"
            ? Math.max(current.bestTotal || 0, dive.cumulativeScore)
            : current.bestTotal;
        current.appearances += 1;
        if (toTimestamp(dive.competitionDate) >= toTimestamp(current.latestCompetitionDate)) {
          current.latestCompetitionDate = dive.competitionDate;
          current.latestCompetitionId = dive.competitionId;
          current.latestCompetitionName = dive.competitionName;
          current.latestEventName = dive.eventName;
          current.latestEntryId = dive.entryId;
        }
        map.set(partner, current);
        return map;
      }, new Map<string, any>()),
  )
    .map(([, value]) => value)
    .sort((left, right) => (right.bestTotal || 0) - (left.bestTotal || 0));

  const recentCompetitionTotals = competitionHistory.slice(0, 3).map((row) => row.finalTotal).filter((value) => typeof value === "number");
  const recentFormAverage =
    recentCompetitionTotals.length > 0
      ? Number(
          (
            recentCompetitionTotals.reduce((sum, value) => sum + Number(value), 0) /
            recentCompetitionTotals.length
          ).toFixed(2),
        )
      : null;

  const mostUsedDiveCode = Array.from(
    (dives as any[]).reduce((map, dive) => {
      map.set(dive.diveCode, (map.get(dive.diveCode) || 0) + 1);
      return map;
    }, new Map<string, number>()),
  ).sort((left, right) => right[1] - left[1])[0];

  const parsedDives = (dives as any[])
    .map((dive) => ({
      ...dive,
      parsed: parseDiveCode(dive.diveCode),
      family: normalizeEventFamily(dive.eventName, dive.eventType),
    }))
    .filter((dive) => dive.parsed.valid && dive.parsed.group);

  const techniqueGroups = Array.from(
    parsedDives.reduce((map, dive) => {
      const group = dive.parsed.group!;
      const current =
        map.get(group.id) ||
        {
          id: group.id,
          label: group.label,
          count: 0,
          scores: [] as number[],
          difficulties: [] as number[],
          competitions: new Set<number>(),
          lastCompetitionDate: null as string | null,
        };

      current.count += 1;
      if (typeof dive.finalScore === "number") {
        current.scores.push(dive.finalScore);
      }
      if (typeof dive.difficulty === "number") {
        current.difficulties.push(dive.difficulty);
      }
      current.competitions.add(dive.competitionId);
      if (toTimestamp(dive.competitionDate) >= toTimestamp(current.lastCompetitionDate)) {
        current.lastCompetitionDate = dive.competitionDate;
      }
      map.set(group.id, current);
      return map;
    }, new Map<number, any>()),
  )
    .map(([, value]) => ({
      ...value,
      averageScore: average(value.scores),
      bestScore: roundMetric(value.scores.length ? Math.max(...value.scores) : null),
      averageDifficulty: average(value.difficulties),
      scoreDeviation: standardDeviation(value.scores),
      competitionCount: value.competitions.size,
    }))
    .sort((left, right) => left.id - right.id);

  const mostReliableGroup =
    [...techniqueGroups]
      .filter((group) => group.count >= 3 && typeof group.scoreDeviation === "number")
      .sort(
        (left, right) =>
          (left.scoreDeviation || Number.MAX_SAFE_INTEGER) - (right.scoreDeviation || Number.MAX_SAFE_INTEGER) ||
          (right.averageScore || 0) - (left.averageScore || 0),
      )[0] || null;

  const highestScoringGroup =
    [...techniqueGroups].sort(
      (left, right) => (right.averageScore || 0) - (left.averageScore || 0) || right.count - left.count,
    )[0] || null;

  const highestDifficultyGroup =
    [...techniqueGroups].sort(
      (left, right) =>
        (right.averageDifficulty || 0) - (left.averageDifficulty || 0) ||
        (right.bestScore || 0) - (left.bestScore || 0),
    )[0] || null;

  const lowSampleGroups = techniqueGroups.filter((group) => group.count < 3).map((group) => group.label);

  const latestCompetitionTimestamp = toTimestamp(latestCompetition?.competitionDate || null);
  const groupsNotUsedRecently = techniqueGroups
    .filter((group) => latestCompetitionTimestamp - toTimestamp(group.lastCompetitionDate) > 0)
    .map((group) => group.label);

  const familyProgress = Array.from(
    (dives as any[]).reduce((map, dive) => {
      const family = normalizeEventFamily(dive.eventName, dive.eventType);
      const current =
        map.get(family.key) ||
        {
          eventFamily: family.key,
          label: family.label,
          competitionDates: new Map<string, number[]>(),
        };
      const dateKey = dive.competitionDate || `competition-${dive.competitionId}`;
      const scores = current.competitionDates.get(dateKey) || [];
      if (typeof dive.finalScore === "number") {
        scores.push(dive.finalScore);
        current.competitionDates.set(dateKey, scores);
      }
      map.set(family.key, current);
      return map;
    }, new Map<string, any>()),
  ).map(([, value]) => {
    const points = Array.from(value.competitionDates.entries())
      .map(([competitionDate, scores]) => ({
        competitionDate,
        averageScore: average(scores),
      }))
      .filter((point) => typeof point.averageScore === "number")
      .sort((left, right) => toTimestamp(left.competitionDate) - toTimestamp(right.competitionDate));
    const improvement =
      points.length >= 2 && points[0].averageScore !== null && points[points.length - 1].averageScore !== null
        ? roundMetric(points[points.length - 1].averageScore - points[0].averageScore)
        : null;
    return {
      eventFamily: value.eventFamily,
      label: value.label,
      points,
      improvement,
    };
  });

  const mostImprovedArea =
    [...familyProgress]
      .filter((family) => typeof family.improvement === "number" && family.improvement > 0.5)
      .sort((left, right) => (right.improvement || 0) - (left.improvement || 0))[0] || null;

  const strongestFamily =
    [...eventTypeStats].sort(
      (left, right) => ((right.bestDive || 0) + (right.bestTotal || 0) / 10) - ((left.bestDive || 0) + (left.bestTotal || 0) / 10),
    )[0] || null;

  const highestCeiling =
    [...eventTypeStats].sort((left, right) => (right.bestTotal || 0) - (left.bestTotal || 0))[0] || null;

  const needsReviewGroup =
    [...techniqueGroups]
      .filter((group) => group.count >= 3)
      .sort(
        (left, right) =>
          (right.scoreDeviation || 0) - (left.scoreDeviation || 0) ||
          (right.averageDifficulty || 0) - (left.averageDifficulty || 0),
      )[0] || null;

  const latestResult =
    latestCompetition && latestCompetition.eventName
      ? {
          label: `${latestCompetition.competitionName} · ${latestCompetition.eventName}`,
          competitionId: latestCompetition.competitionId,
          entryId: latestCompetition.entryId,
          eventName: latestCompetition.eventName,
          competitionDate: latestCompetition.competitionDate,
          finalTotal: latestCompetition.finalTotal,
          rank: latestCompetition.rank,
        }
      : null;

  const trainingFocus = needsReviewGroup
    ? {
        label: `${needsReviewGroup.label} consistency`,
        reason: `Highest score variance across repeated attempts in the current log.`,
      }
    : lowSampleGroups.length > 0
      ? {
          label: `${lowSampleGroups[0]} exposure`,
          reason: `This group has a low sample size and may need more repetition before analysis is reliable.`,
        }
      : highestDifficultyGroup
        ? {
            label: `${highestDifficultyGroup.label} under pressure`,
            reason: `This is the highest-difficulty group in the profile and should stay under active review.`,
          }
        : null;

  const competitionTotalsTrend = totalsByCompetition
    .slice()
    .reverse()
    .map((row: any) => ({
      competitionId: row.competitionId,
      competitionName: row.competitionName,
      competitionDate: row.competitionDate,
      finalTotal: row.finalTotal,
    }));

  const rankTrend = competitionHistory
    .slice()
    .reverse()
    .map((row) => ({
      competitionId: row.competitionId,
      competitionName: row.competitionName,
      competitionDate: row.competitionDate,
      rank: row.rank,
      finalTotal: row.finalTotal,
    }));

  const familyUsageTrend = totalsByCompetition
    .slice()
    .reverse()
    .map((competition: any) => {
      const familyCounts = new Map<string, number>();
      (dives as any[])
        .filter((dive) => dive.competitionId === competition.competitionId)
        .forEach((dive) => {
          const family = normalizeEventFamily(dive.eventName, dive.eventType);
          familyCounts.set(family.label, (familyCounts.get(family.label) || 0) + 1);
        });
      return {
        competitionId: competition.competitionId,
        competitionName: competition.competitionName,
        competitionDate: competition.competitionDate,
        familyCounts: Object.fromEntries(familyCounts),
      };
    });

  return {
    athlete: {
      ...athlete,
      id:
        athleteIdByIdentity.get(athleteIdentityKey((athlete as any).name, (athlete as any).birthYear)) ||
        relatedAthletes[0]?.id ||
        (athlete as any).id,
      competitionCount: totalsByCompetition.length,
      diveCount: dives.length,
      averageDiveScore,
      club: normalizeClubName((athlete as any).club, (athlete as any).name),
      clubs: clubHistory.map((row) => row.club).filter(Boolean),
      latestClub:
        clubHistory.sort((left, right) => toTimestamp(right.lastSeenAt) - toTimestamp(left.lastSeenAt))[0]?.club ||
        normalizeClubName((athlete as any).club, (athlete as any).name) ||
        null,
      bestTotal:
        totalsByCompetition.length > 0
          ? Math.max(...totalsByCompetition.map((row: any) => Number(row.finalTotal || 0)))
          : null,
      latestCompetitionDate: latestCompetition?.competitionDate || null,
      recentFormAverage,
      mostUsedDiveCode: mostUsedDiveCode?.[0] || null,
    },
    athleteBrief: {
      latestResult,
      bestEvent: highestCeiling
        ? {
            label: highestCeiling.label,
            bestTotal: highestCeiling.bestTotal,
            competitionCount: highestCeiling.competitionCount,
          }
        : null,
      mostImprovedArea: mostImprovedArea
        ? {
            label: mostImprovedArea.label,
            change: mostImprovedArea.improvement,
          }
        : null,
      focusForNextTraining: trainingFocus,
    },
    coachingInsights: {
      strongestFamily: strongestFamily
        ? {
            label: strongestFamily.label,
            bestDive: strongestFamily.bestDive,
            bestTotal: strongestFamily.bestTotal,
          }
        : null,
      mostUsedCode: mostUsedDiveCode
        ? {
            code: mostUsedDiveCode[0],
            attempts: mostUsedDiveCode[1],
          }
        : null,
      highestCeiling: highestCeiling
        ? {
            label: highestCeiling.label,
            bestTotal: highestCeiling.bestTotal,
          }
        : null,
      needsReview: needsReviewGroup
        ? {
            label: `${needsReviewGroup.label} consistency`,
            scoreDeviation: needsReviewGroup.scoreDeviation,
            averageScore: needsReviewGroup.averageScore,
          }
        : null,
    },
    progression: {
      competitionTotals: competitionTotalsTrend,
      ranks: rankTrend,
      familyUsage: familyUsageTrend,
    },
    techniqueSummary: {
      mostReliableGroup,
      highestScoringGroup,
      highestDifficultyGroup,
      lowSampleGroups,
      groupsNotUsedRecently,
      groups: techniqueGroups,
    },
    clubHistory,
    latestCompetition,
    eventTypeStats,
    bestDiveByEventType,
    partnerStats,
    competitionHistory,
    dives,
    totalsByCompetition,
  };
}

export function getDashboard() {
  const athleteIdByIdentity = buildAthleteIdByIdentity();
  const overview = db
    .query(`
      SELECT
        (SELECT COUNT(*) FROM competitions) AS competitionCount,
        (SELECT COUNT(*) FROM athletes) AS athleteCount,
        (SELECT COUNT(*) FROM dives) AS diveCount
    `)
    .get();

  const topAthletes = db
    .query(`
      SELECT
        MIN(a.id) AS id,
        MIN(a.name) AS name,
        a.birth_year AS birthYear,
        ROUND(MAX(d.cumulative_score), 2) AS bestTotal,
        COUNT(DISTINCT e.competition_id) AS competitionCount
      FROM athletes a
      INNER JOIN entry_members em ON em.athlete_id = a.id
      INNER JOIN entries e ON e.id = em.entry_id
      INNER JOIN dives d ON d.entry_id = e.id
      GROUP BY LOWER(TRIM(a.name)), a.birth_year
      ORDER BY bestTotal DESC
      LIMIT 8
    `)
    .all()
    .map((athlete: any) => ({
      ...athlete,
      id: athleteIdByIdentity.get(athleteIdentityKey(athlete.name, athlete.birthYear)) || athlete.id,
    }));

  const competitions = listCompetitions().slice(0, 8);

  return {
    overview,
    topAthletes,
    competitions,
  };
}

export function calculateScore(payload: {
  eventType?: "individual" | "synchro";
  scores?: number[];
  executionScores?: number[];
  synchronizationScores?: number[];
  coeff?: number;
  difficulty?: number;
}) {
  const eventType = payload.eventType || "individual";
  const difficulty =
    typeof payload.difficulty === "number"
      ? payload.difficulty
      : typeof payload.coeff === "number"
        ? payload.coeff
        : null;

  return applyDivingRules({
    eventType,
    difficulty,
    judgeScores: payload.scores,
    executionScores: payload.executionScores,
    synchronizationScores: payload.synchronizationScores,
  });
}

export function calculateStatistics(scores: number[]) {
  if (scores.length === 0) {
    return null;
  }

  const sorted = [...scores].sort((a, b) => a - b);
  const mean = sorted.reduce((sum, score) => sum + score, 0) / sorted.length;
  const variance =
    sorted.length > 1
      ? sorted.reduce((sum, score) => sum + (score - mean) ** 2, 0) / (sorted.length - 1)
      : 0;

  return {
    count: sorted.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean: Number(mean.toFixed(2)),
    median:
      sorted.length % 2 === 1
        ? sorted[(sorted.length - 1) / 2]
        : Number(((sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2).toFixed(2)),
    std: Number(Math.sqrt(variance).toFixed(2)),
  };
}
