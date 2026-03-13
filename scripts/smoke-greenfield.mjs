import path from "node:path";
import playwright from "../apps/web/node_modules/playwright/index.js";

const { chromium } = playwright;

const webBaseUrl = process.env.WEB_BASE_URL || "http://127.0.0.1:4100";
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

try {
  await goto("/upload");
  await page.setInputFiles('input[type="file"]', pdfPath);
  await page.click('button[type="submit"]');

  await waitForText("Intake review");
  await waitForText("Imported event program");

  const importState = await page.evaluate(() => {
    const competitionName =
      document.querySelector(".metrics .metric strong")?.textContent?.trim() || null;
    const openLink = document.querySelector('a.button.secondary[href^="/competitions?id="]')?.getAttribute("href");
    const eventCount = document.querySelectorAll("table tbody tr").length;

    return {
      competitionName,
      openLink,
      eventCount,
    };
  });

  if (!importState.openLink || !importState.competitionName) {
    throw new Error("Import result did not expose a competition workspace link");
  }

  if (importState.eventCount < 1) {
    throw new Error("Import review did not render any event coverage rows");
  }

  await goto(importState.openLink);
  await waitForText(importState.competitionName);

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
      element.textContent?.includes("Technique"),
    );
    return link?.getAttribute("href") || null;
  });

  if (!techniqueHref) {
    throw new Error("Athlete profile did not expose the technique workspace");
  }

  await goto(techniqueHref);
  await waitForText("Dive groups");
  await waitForText("Recent technical log");

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
