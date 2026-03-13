import path from "node:path";
import { readFile } from "node:fs/promises";
import playwright from "../apps/web/node_modules/playwright/index.js";

const { chromium } = playwright;

const webBaseUrl = process.env.WEB_BASE_URL || "http://127.0.0.1:4100";
const apiBaseUrl = process.env.API_BASE_URL || "http://127.0.0.1:4101";
const pdfPath =
  process.env.SMOKE_PDF ||
  path.resolve("20251123 Championnats IDF hiver 3m-HV - Résultats détaillés.pdf");

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errors = [];
const requests = [];

page.on("console", (msg) => {
  if (msg.type() === "error") {
    errors.push(`console:${msg.text()}`);
  }
});

page.on("pageerror", (error) => {
  errors.push(`pageerror:${error.message}`);
});

page.on("response", (response) => {
  if (response.url().includes(":4101/")) {
    requests.push(`${response.status()} ${response.url()}`);
  }
});

async function goto(url) {
  await page.goto(`${webBaseUrl}${url}`, { waitUntil: "networkidle" });
}

async function waitForText(text, timeout = 20000) {
  await page.waitForSelector(`text=${text}`, { timeout });
}

async function importFixtureCompetition() {
  const form = new FormData();
  const buffer = await readFile(pdfPath);
  form.set("file", new Blob([buffer], { type: "application/pdf" }), path.basename(pdfPath));

  const response = await fetch(`${apiBaseUrl}/ingestions/pdf`, {
    method: "POST",
    body: form,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      `Fixture import failed (${response.status}): ${payload.error || JSON.stringify(payload)}`,
    );
  }

  if (!payload.competitionId || !payload.extraction?.competitionName) {
    throw new Error("Fixture import did not return a valid competition payload");
  }

  return payload;
}

try {
  const importResult = await importFixtureCompetition();
  const importState = {
    competitionName: importResult.extraction.competitionName,
    openLink: `/competitions?id=${importResult.competitionId}`,
  };

  await goto("/upload");
  await waitForText("Ingest an official result sheet");

  await goto(importState.openLink);
  await waitForText(importState.competitionName);
  await page.click('button:has-text("Detailed analysis")');
  await waitForText("Competition workspace");

  const firstAthleteHref = await page.evaluate(() => {
    const athleteLink = document.querySelector('a[href^="/athletes/"]');
    return athleteLink?.getAttribute("href") || null;
  });

  if (!firstAthleteHref) {
    throw new Error("Competition workspace did not expose an athlete link");
  }

  await goto(firstAthleteHref);
  await waitForText("Quick paths");

  const techniqueHref = await page.evaluate(() => {
    const link = [...document.querySelectorAll('a.context-link-card')].find((element) =>
      element.textContent?.includes("Dive technique"),
    );
    return link?.getAttribute("href") || null;
  });

  if (!techniqueHref) {
    throw new Error("Athlete profile did not expose the technique workspace");
  }

  await goto(techniqueHref);
  await waitForText("Technique brief");
  await waitForText("Recent dives by group");
  await page.click('button:has-text("Detailed analysis")');
  await waitForText("code table");

  const techniqueState = await page.evaluate(() => ({
    breadcrumb: document.querySelector(".breadcrumb-trail")?.textContent?.replace(/\s+/g, " ").trim() || "",
    groupCount: document.querySelectorAll(".group-card").length,
    firstCodeRow: document.querySelector("table.table-clickable tbody tr td strong")?.textContent?.trim() || null,
  }));

  if (techniqueState.groupCount < 1 || !techniqueState.firstCodeRow) {
    throw new Error("Technique workspace did not render dive-group analytics");
  }

  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }

  console.log("Smoke test passed");
  console.log(
    JSON.stringify(
      {
        webBaseUrl,
        apiBaseUrl,
        competitionName: importState.competitionName,
        importLink: importState.openLink,
        firstAthleteHref,
        techniqueHref,
        techniqueState,
        requests,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
