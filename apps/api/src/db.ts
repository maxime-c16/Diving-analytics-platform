import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { normalizeCompetitionDate } from "./dates";
import { normalizeClubName } from "./strings";

const databasePath = resolve(
  process.cwd(),
  process.env.DATABASE_PATH || "./data/diving-analytics.db",
);

mkdirSync(dirname(databasePath), { recursive: true });

export const db = new Database(databasePath, { create: true });

db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

db.exec(`
CREATE TABLE IF NOT EXISTS competitions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  location TEXT,
  date TEXT,
  source_file TEXT NOT NULL UNIQUE,
  source_method TEXT,
  total_dives INTEGER DEFAULT 0,
  total_athletes INTEGER DEFAULT 0,
  total_events INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS athletes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  birth_year TEXT,
  club TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(name, birth_year, club)
);

CREATE TABLE IF NOT EXISTS entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  competition_id INTEGER NOT NULL,
  entry_key TEXT NOT NULL,
  entry_name TEXT NOT NULL,
  primary_name TEXT NOT NULL,
  rank INTEGER,
  event_name TEXT,
  event_type TEXT NOT NULL DEFAULT 'individual',
  participant_names TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(competition_id, entry_key),
  FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS entry_members (
  entry_id INTEGER NOT NULL,
  athlete_id INTEGER NOT NULL,
  position INTEGER NOT NULL,
  PRIMARY KEY (entry_id, athlete_id),
  FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE,
  FOREIGN KEY (athlete_id) REFERENCES athletes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS dives (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  competition_id INTEGER NOT NULL,
  athlete_id INTEGER,
  entry_id INTEGER,
  athlete_name TEXT NOT NULL,
  entry_name TEXT,
  participant_names TEXT,
  rank INTEGER,
  event_name TEXT,
  event_type TEXT NOT NULL DEFAULT 'individual',
  dive_code TEXT NOT NULL,
  description TEXT,
  height TEXT,
  difficulty REAL,
  judge_scores TEXT,
  execution_scores TEXT,
  synchronization_scores TEXT,
  total REAL,
  final_score REAL,
  cumulative_score REAL,
  penalty INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE,
  FOREIGN KEY (athlete_id) REFERENCES athletes(id) ON DELETE CASCADE,
  FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE
);
`);

function ensureColumn(tableName: string, columnName: string, definition: string) {
  const columns = db.query(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  if (!columns.some((column) => column.name === columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

ensureColumn("dives", "entry_id", "INTEGER");
ensureColumn("dives", "entry_name", "TEXT");
ensureColumn("dives", "participant_names", "TEXT");
ensureColumn("dives", "event_type", "TEXT NOT NULL DEFAULT 'individual'");
ensureColumn("dives", "execution_scores", "TEXT");
ensureColumn("dives", "synchronization_scores", "TEXT");

db.exec(`
CREATE INDEX IF NOT EXISTS idx_dives_competition_id ON dives(competition_id);
CREATE INDEX IF NOT EXISTS idx_dives_athlete_id ON dives(athlete_id);
CREATE INDEX IF NOT EXISTS idx_dives_entry_id ON dives(entry_id);
CREATE INDEX IF NOT EXISTS idx_dives_event_name ON dives(event_name);
CREATE INDEX IF NOT EXISTS idx_dives_dive_code ON dives(dive_code);
CREATE INDEX IF NOT EXISTS idx_entries_competition_id ON entries(competition_id);
CREATE INDEX IF NOT EXISTS idx_entries_event_name ON entries(event_name);
`);

const insertCompetitionStmt = db.query(`
  INSERT INTO competitions (
    name, location, date, source_file, source_method, total_dives, total_athletes, total_events
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const replaceCompetitionStmt = db.query(`
  UPDATE competitions
  SET name = ?, location = ?, date = ?, source_method = ?, total_dives = ?, total_athletes = ?, total_events = ?
  WHERE id = ?
`);

const findCompetitionBySourceStmt = db.query(`
  SELECT id FROM competitions WHERE source_file = ?
`);

const deleteCompetitionDivesStmt = db.query(`
  DELETE FROM dives WHERE competition_id = ?
`);

const deleteCompetitionEntriesStmt = db.query(`
  DELETE FROM entries WHERE competition_id = ?
`);

const findAthleteStmt = db.query(`
  SELECT id FROM athletes
  WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) AND IFNULL(birth_year, '') = IFNULL(?, '') AND IFNULL(club, '') = IFNULL(?, '')
`);

const insertAthleteStmt = db.query(`
  INSERT INTO athletes (name, birth_year, club) VALUES (?, ?, ?)
`);

const insertEntryStmt = db.query(`
  INSERT INTO entries (
    competition_id, entry_key, entry_name, primary_name, rank, event_name, event_type, participant_names
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertEntryMemberStmt = db.query(`
  INSERT INTO entry_members (entry_id, athlete_id, position) VALUES (?, ?, ?)
`);

const insertDiveStmt = db.query(`
  INSERT INTO dives (
    competition_id,
    athlete_id,
    entry_id,
    athlete_name,
    entry_name,
    participant_names,
    rank,
    event_name,
    event_type,
    dive_code,
    description,
    height,
    difficulty,
    judge_scores,
    execution_scores,
    synchronization_scores,
    total,
    final_score,
    cumulative_score,
    penalty
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

export type ExtractionAthlete = {
  name: string;
  birth_year?: string | null;
  club?: string | null;
  events?: string[];
};

export type ExtractionEntryParticipant = {
  name: string;
  birth_year?: string | null;
  club?: string | null;
};

export type ExtractionEntry = {
  key: string;
  entry_name: string;
  primary_name: string;
  rank?: number | null;
  event_name?: string | null;
  event_type?: "individual" | "synchro";
  participants: ExtractionEntryParticipant[];
};

export type ExtractionDive = {
  athlete_name: string;
  entry_key?: string;
  entry_name?: string | null;
  participant_names?: string[];
  rank?: number | null;
  event_name?: string | null;
  event_type?: "individual" | "synchro";
  dive_code: string;
  description?: string | null;
  height?: string | null;
  difficulty?: number | null;
  judge_scores?: number[];
  execution_scores?: number[];
  synchronization_scores?: number[];
  total?: number | null;
  final_score?: number | null;
  cumulative_score?: number | null;
  penalty?: number | null;
};

export type ExtractionPayload = {
  competition_name: string;
  location?: string | null;
  date?: string | null;
  method?: string;
  summary: {
    total_dives: number;
    total_athletes: number;
    total_events: number;
  };
  athletes: ExtractionAthlete[];
  entries?: ExtractionEntry[];
  dives: ExtractionDive[];
};

function athleteIdentityKey(athlete: { name: string; birth_year?: string | null; club?: string | null }) {
  return [
    String(athlete.name).trim().toLowerCase(),
    athlete.birth_year || "",
    normalizeClubName(athlete.club, athlete.name) || "",
  ].join("::");
}

export function importCompetition(sourceFile: string, extraction: ExtractionPayload) {
  const normalizedDate = normalizeCompetitionDate(extraction.date || null);
  const existing = findCompetitionBySourceStmt.get(sourceFile) as { id: number } | null;
  let competitionId: number;

  if (existing) {
    competitionId = existing.id;
    deleteCompetitionDivesStmt.run(competitionId);
    deleteCompetitionEntriesStmt.run(competitionId);
    replaceCompetitionStmt.run(
      extraction.competition_name,
      extraction.location || null,
      normalizedDate,
      extraction.method || "pdf-text",
      extraction.summary.total_dives,
      extraction.summary.total_athletes,
      extraction.summary.total_events,
      competitionId,
    );
  } else {
    const result = insertCompetitionStmt.run(
      extraction.competition_name,
      extraction.location || null,
      normalizedDate,
      sourceFile,
      extraction.method || "pdf-text",
      extraction.summary.total_dives,
      extraction.summary.total_athletes,
      extraction.summary.total_events,
    );
    competitionId = Number(result.lastInsertRowid);
  }

  const athleteIds = new Map<string, number>();
  const entryIds = new Map<string, number>();
  const insertedAthletes = new Set<number>();
  const insertedEvents = new Set<string>();
  let insertedDives = 0;

  const performImport = db.transaction(() => {
    for (const athlete of extraction.athletes) {
      const identity = athleteIdentityKey(athlete);
      const existingAthlete = findAthleteStmt.get(
        athlete.name,
        athlete.birth_year || null,
        normalizeClubName(athlete.club, athlete.name),
      ) as { id: number } | null;

      if (existingAthlete) {
        athleteIds.set(identity, existingAthlete.id);
        continue;
      }

      const result = insertAthleteStmt.run(
        athlete.name,
        athlete.birth_year || null,
        normalizeClubName(athlete.club, athlete.name),
      );
      athleteIds.set(identity, Number(result.lastInsertRowid));
    }

    const entries = extraction.entries || [];
    for (const entry of entries) {
      const participantNames = entry.participants.map((participant) => participant.name);
      const result = insertEntryStmt.run(
        competitionId,
        entry.key,
        entry.entry_name,
        entry.primary_name,
        entry.rank || null,
        entry.event_name || null,
        entry.event_type || "individual",
        JSON.stringify(participantNames),
      );
      const entryId = Number(result.lastInsertRowid);
      entryIds.set(entry.key, entryId);

      entry.participants.forEach((participant, index) => {
        const athleteId = athleteIds.get(athleteIdentityKey(participant));
        if (athleteId) {
          insertEntryMemberStmt.run(entryId, athleteId, index + 1);
          insertedAthletes.add(athleteId);
        }
      });

      if (entry.event_name) {
        insertedEvents.add(entry.event_name);
      }
    }

    for (const dive of extraction.dives) {
      const entryId = dive.entry_key ? entryIds.get(dive.entry_key) || null : null;
      const participantNames = dive.participant_names || [];
      let primaryAthleteId: number | null = null;

      if (participantNames.length > 0 && extraction.entries) {
        const entry = extraction.entries.find((candidate) => candidate.key === dive.entry_key);
        const primaryParticipant = entry?.participants[0];
        if (primaryParticipant) {
          primaryAthleteId = athleteIds.get(athleteIdentityKey(primaryParticipant)) || null;
        }
      }

      if (!primaryAthleteId) {
        const matchingAthlete = extraction.athletes.find(
          (athlete) =>
            String(athlete.name).trim().toLowerCase() === String(dive.athlete_name).trim().toLowerCase(),
        );
        if (matchingAthlete) {
          primaryAthleteId = athleteIds.get(athleteIdentityKey(matchingAthlete)) || null;
        }
      }

      insertDiveStmt.run(
        competitionId,
        primaryAthleteId,
        entryId,
        dive.athlete_name,
        dive.entry_name || dive.athlete_name,
        JSON.stringify(participantNames),
        dive.rank || null,
        dive.event_name || null,
        dive.event_type || "individual",
        dive.dive_code,
        dive.description || null,
        dive.height || null,
        dive.difficulty || null,
        JSON.stringify(dive.judge_scores || []),
        JSON.stringify(dive.execution_scores || []),
        JSON.stringify(dive.synchronization_scores || []),
        dive.total || null,
        dive.final_score || null,
        dive.cumulative_score || null,
        dive.penalty || null,
      );

      insertedDives += 1;
      if (primaryAthleteId) {
        insertedAthletes.add(primaryAthleteId);
      }
      if (dive.event_name) {
        insertedEvents.add(dive.event_name);
      }
    }

    replaceCompetitionStmt.run(
      extraction.competition_name,
      extraction.location || null,
      normalizedDate,
      extraction.method || "pdf-text",
      insertedDives,
      insertedAthletes.size,
      insertedEvents.size,
      competitionId,
    );
  });

  performImport();

  return competitionId;
}
