import { rmSync } from "node:fs";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  calculateScore,
  calculateStatistics,
  getClubDetail,
  getAthleteDetail,
  getCompetitionDetail,
  getDashboard,
  listClubs,
  listAthletes,
  listCompetitions,
} from "./analytics";
import { normalizeCompetitionDate } from "./dates";
import { importCompetition } from "./db";

const port = Number(process.env.PORT || 4101);
const extractorPath = resolve(import.meta.dir, "../../../worker/extract_pdf.py");

function json(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  return new Response(JSON.stringify(data), { ...init, headers });
}

async function extractPdf(file: File) {
  const tempDir = await mkdtemp(join(tmpdir(), "diving-ocr-"));
  const filePath = join(tempDir, file.name);
  await writeFile(filePath, Buffer.from(await file.arrayBuffer()));

  try {
    const process = Bun.spawnSync(["python3", extractorPath, filePath], {
      stdout: "pipe",
      stderr: "pipe",
    });

    if (process.exitCode !== 0 && process.stdout.toString().trim().length === 0) {
      throw new Error(process.stderr.toString() || "PDF extraction failed");
    }

    return JSON.parse(process.stdout.toString());
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

async function handlePdfIngestion(request: Request) {
  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return json({ error: "Missing PDF file" }, { status: 400 });
  }

  const extraction = await extractPdf(file);
  if (!extraction.success) {
    return json(extraction, { status: 422 });
  }

  const competitionId = importCompetition(file.name, extraction);
  const detail = getCompetitionDetail(competitionId);

  return json({
    message: "Result sheet ingested",
    competitionId,
    extraction: {
      competitionName: extraction.competition_name,
      date: normalizeCompetitionDate(extraction.date),
      location: extraction.location,
      summary: {
        totalDives: extraction.summary.total_dives,
        totalAthletes: extraction.summary.total_athletes,
        totalEvents: extraction.summary.total_events,
        events: extraction.summary.events,
      },
      method: extraction.method,
    },
    competition: detail?.competition,
  });
}

const server = Bun.serve({
  port,
  async fetch(request) {
    const url = new URL(request.url);
    const pathname = url.pathname.replace(/\/$/, "") || "/";

    if (request.method === "OPTIONS") {
      return json({ ok: true });
    }

    try {
      if (pathname === "/health") {
        return json({
          status: "ok",
          service: "diving-analytics-api",
          extractorPath,
        });
      }

      if (pathname === "/dashboard" && request.method === "GET") {
        return json(getDashboard());
      }

      if (pathname === "/competitions" && request.method === "GET") {
        return json(listCompetitions());
      }

      if (pathname.startsWith("/competitions/") && request.method === "GET") {
        const id = Number(pathname.split("/")[2]);
        const detail = getCompetitionDetail(id);
        if (!detail) {
          return json({ error: "Competition not found" }, { status: 404 });
        }
        return json(detail);
      }

      if (pathname === "/athletes" && request.method === "GET") {
        return json(listAthletes());
      }

      if (pathname === "/clubs" && request.method === "GET") {
        return json(listClubs());
      }

      if (pathname.startsWith("/athletes/") && request.method === "GET") {
        const id = Number(pathname.split("/")[2]);
        const detail = getAthleteDetail(id);
        if (!detail) {
          return json({ error: "Athlete not found" }, { status: 404 });
        }
        return json(detail);
      }

      if (pathname.startsWith("/clubs/") && request.method === "GET") {
        const slug = decodeURIComponent(pathname.split("/")[2] || "");
        const detail = getClubDetail(slug);
        if (!detail) {
          return json({ error: "Club not found" }, { status: 404 });
        }
        return json(detail);
      }

      if (pathname === "/analytics/score" && request.method === "POST") {
        const payload = (await request.json()) as {
          eventType?: "individual" | "synchro";
          scores?: number[];
          executionScores?: number[];
          synchronizationScores?: number[];
          coeff?: number;
          difficulty?: number;
        };
        if (
          (payload.eventType || "individual") === "synchro"
            ? !payload.executionScores || !payload.synchronizationScores || (!payload.coeff && !payload.difficulty)
            : !payload.scores || (!payload.coeff && !payload.difficulty)
        ) {
          return json(
            {
              error:
                "individual requires scores + difficulty, synchro requires executionScores + synchronizationScores + difficulty",
            },
            { status: 400 },
          );
        }
        return json(calculateScore(payload));
      }

      if (pathname === "/analytics/statistics" && request.method === "POST") {
        const payload = (await request.json()) as { scores?: number[] };
        if (!payload.scores || payload.scores.length === 0) {
          return json({ error: "scores are required" }, { status: 400 });
        }
        return json(calculateStatistics(payload.scores));
      }

      if (pathname === "/ingestions/pdf" && request.method === "POST") {
        return await handlePdfIngestion(request);
      }

      return json({ error: "Not found" }, { status: 404 });
    } catch (error) {
      return json(
        {
          error: error instanceof Error ? error.message : "Unexpected error",
        },
        { status: 500 },
      );
    }
  },
});

console.log(`API ready on http://localhost:${server.port}`);
