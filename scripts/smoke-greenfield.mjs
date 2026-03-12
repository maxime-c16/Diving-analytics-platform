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

async function assertText(url, text) {
  await page.goto(`${webBaseUrl}${url}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(`text=${text}`, { timeout: 15000 });
}

try {
  await assertText("/", "PSV Master Diving Cup 2026");
  await assertText("/competitions?id=1", "2039");
  await assertText("/athletes/151", "Fanny BOUVET");

  await page.goto(`${webBaseUrl}/upload`, { waitUntil: "domcontentloaded" });
  await page.setInputFiles('input[type="file"]', pdfPath);
  await page.click('button[type="submit"]');
  await page.waitForSelector("text=Imported event program", { timeout: 15000 });

  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }

  console.log("Smoke test passed");
  console.log(JSON.stringify({ webBaseUrl, requests }, null, 2));
} finally {
  await browser.close();
}
