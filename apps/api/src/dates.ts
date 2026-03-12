const MONTH_MAP: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
  janvier: 0,
  fevrier: 1,
  "février": 1,
  mars: 2,
  avril: 3,
  mai: 4,
  juin: 5,
  juillet: 6,
  aout: 7,
  "août": 7,
  septembre: 8,
  octobre: 9,
  novembre: 10,
  decembre: 11,
  "décembre": 11,
  januari: 0,
  februari: 1,
  maart: 2,
  april_nl: 3,
  mei: 4,
  juni_nl: 5,
  juli: 6,
  augustus: 7,
  september_nl: 8,
  oktober: 9,
  november_nl: 10,
  december_nl: 11,
};

const WEEKDAY_PATTERN =
  /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag)\b/g;

function normalizeMonthToken(token: string) {
  if (token === "april") {
    return "april_nl";
  }
  if (token === "juni") {
    return "juni_nl";
  }
  if (token === "september") {
    return "september_nl";
  }
  if (token === "november") {
    return "november_nl";
  }
  if (token === "december") {
    return "december_nl";
  }
  return token;
}

function parseLocalizedDateSegment(segment: string) {
  const cleaned = segment.replace(WEEKDAY_PATTERN, "").replace(/\s+/g, " ").trim();
  const match = cleaned.match(/(\d{1,2}) ([a-zéûôîàè]+) (\d{4})/i);
  if (!match) {
    const englishMatch = cleaned.match(/([a-z]+) (\d{1,2}) (\d{4})/i);
    if (!englishMatch) {
      return null;
    }

    const month = MONTH_MAP[englishMatch[1].toLowerCase()];
    const day = Number(englishMatch[2]);
    const year = Number(englishMatch[3]);
    if (typeof month !== "number" || !Number.isInteger(day) || !Number.isInteger(year)) {
      return null;
    }

    const englishDate = new Date(Date.UTC(year, month, day));
    return Number.isNaN(englishDate.getTime()) ? null : englishDate;
  }

  const day = Number(match[1]);
  const monthToken = normalizeMonthToken(match[2].toLowerCase());
  const year = Number(match[3]);
  const month = MONTH_MAP[monthToken] ?? MONTH_MAP[match[2].toLowerCase()];
  if (!Number.isInteger(day) || !Number.isInteger(year) || typeof month !== "number") {
    return null;
  }

  const date = new Date(Date.UTC(year, month, day));
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function parseDateSegments(value: string | null | undefined) {
  if (!value) {
    return [];
  }

  const normalized = String(value)
    .toLowerCase()
    .replace(/\s*~\s*/g, " | ")
    .replace(/\s+to\s+/g, " | ")
    .replace(/,/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const segments = normalized.split("|").map((segment) => segment.trim());
  const parsed = segments
    .map((segment) => parseLocalizedDateSegment(segment))
    .filter((date): date is Date => Boolean(date));

  if (parsed.length > 0) {
    return parsed;
  }

  const fallback = Date.parse(String(value));
  return Number.isNaN(fallback) ? [] : [new Date(fallback)];
}

export function normalizeCompetitionDate(value: string | null | undefined) {
  const dates = parseDateSegments(value);
  if (dates.length === 0) {
    return value || null;
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

  if (dates.length === 1) {
    return formatter.format(dates[0]);
  }

  const sorted = [...dates].sort((left, right) => left.getTime() - right.getTime());
  return `${formatter.format(sorted[0])} to ${formatter.format(sorted[sorted.length - 1])}`;
}

export function toTimestamp(value: string | null | undefined) {
  const dates = parseDateSegments(value);
  if (dates.length === 0) {
    return 0;
  }
  return Math.max(...dates.map((date) => date.getTime()));
}
