export type DiveGroupId = 1 | 2 | 3 | 4 | 5 | 6;

type GroupMeta = {
  id: DiveGroupId;
  shortLabel: string;
  label: string;
  description: string;
};

const GROUPS: Record<DiveGroupId, GroupMeta> = {
  1: { id: 1, shortLabel: "1XX", label: "Forward", description: "Forward approach and rotation" },
  2: { id: 2, shortLabel: "2XX", label: "Back", description: "Back take-off and backward rotation" },
  3: { id: 3, shortLabel: "3XX", label: "Reverse", description: "Forward take-off with reverse rotation" },
  4: { id: 4, shortLabel: "4XX", label: "Inward", description: "Back take-off with inward rotation" },
  5: { id: 5, shortLabel: "5XXX", label: "Twisting", description: "Twisting dives with a direction component" },
  6: { id: 6, shortLabel: "6XXX", label: "Armstand", description: "Armstand dives with a direction component" },
};

const DIRECTION_LABELS: Record<string, string> = {
  "1": "Forward",
  "2": "Back",
  "3": "Reverse",
  "4": "Inward",
};

const POSITION_LABELS: Record<string, string> = {
  A: "Straight",
  B: "Pike",
  C: "Tuck",
  D: "Free",
};

export type ParsedDiveCode = {
  rawCode: string;
  normalizedCode: string;
  valid: boolean;
  group: GroupMeta | null;
  directionLabel: string | null;
  directionCode: string | null;
  flying: boolean;
  position: string | null;
  positionCode: string | null;
  halfSomersaults: number | null;
  somersaults: number | null;
  halfTwists: number | null;
  twists: number | null;
  structure: string;
};

function formatHalfUnits(value: number | null) {
  if (typeof value !== "number") {
    return null;
  }
  return value % 2 === 0 ? String(value / 2) : `${value / 2}`;
}

function escapeForRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseSomersaultTwistTail(tail: string) {
  if (tail.length === 2) {
    return {
      halfSomersaults: Number(tail[0]),
      halfTwists: Number(tail[1]),
    };
  }

  if (tail.length === 3) {
    const firstTwo = Number(tail.slice(0, 2));
    const lastOne = Number(tail.slice(2));
    const firstOne = Number(tail[0]);
    const lastTwo = Number(tail.slice(1));

    if (firstTwo >= 10 && lastOne >= 1) {
      return {
        halfSomersaults: firstTwo,
        halfTwists: lastOne,
      };
    }

    return {
      halfSomersaults: firstOne,
      halfTwists: lastTwo,
    };
  }

  if (tail.length === 4) {
    return {
      halfSomersaults: Number(tail.slice(0, 2)),
      halfTwists: Number(tail.slice(2)),
    };
  }

  return {
    halfSomersaults: null,
    halfTwists: null,
  };
}

export function parseDiveCode(code: string): ParsedDiveCode {
  const normalizedCode = code.trim().toUpperCase();
  const match = normalizedCode.match(/^(\d+)([A-D])$/);

  if (!match) {
    return {
      rawCode: code,
      normalizedCode,
      valid: false,
      group: null,
      directionLabel: null,
      directionCode: null,
      flying: false,
      position: null,
      positionCode: null,
      halfSomersaults: null,
      somersaults: null,
      halfTwists: null,
      twists: null,
      structure: "Structure not recognized",
    };
  }

  const digits = match[1];
  const positionCode = match[2];
  const groupId = Number(digits[0]) as DiveGroupId;
  const group = GROUPS[groupId];
  const position = POSITION_LABELS[positionCode] || null;

  if (!group) {
    return {
      rawCode: code,
      normalizedCode,
      valid: false,
      group: null,
      directionLabel: null,
      directionCode: null,
      flying: false,
      position,
      positionCode,
      halfSomersaults: null,
      somersaults: null,
      halfTwists: null,
      twists: null,
      structure: "Unsupported group",
    };
  }

  if (groupId >= 1 && groupId <= 4) {
    const flying = digits[1] === "1";
    const halfSomersaults = Number(digits.slice(2));
    const somersaults = halfSomersaults / 2;
    const parts = [
      group.label,
      flying ? "Flying" : null,
      halfSomersaults ? `${formatHalfUnits(halfSomersaults)} somersaults` : null,
      position,
    ].filter(Boolean);

    return {
      rawCode: code,
      normalizedCode,
      valid: true,
      group,
      directionLabel: group.label,
      directionCode: String(groupId),
      flying,
      position,
      positionCode,
      halfSomersaults,
      somersaults,
      halfTwists: null,
      twists: null,
      structure: parts.join(" · "),
    };
  }

  const directionCode = digits[1];
  const directionLabel = DIRECTION_LABELS[directionCode] || null;
  const tail = digits.slice(2);
  const { halfSomersaults, halfTwists } = parseSomersaultTwistTail(tail);
  const somersaults = typeof halfSomersaults === "number" ? halfSomersaults / 2 : null;
  const twists = typeof halfTwists === "number" ? halfTwists / 2 : null;

  const parts = [
    group.label,
    directionLabel ? `${directionLabel} direction` : null,
    halfSomersaults ? `${formatHalfUnits(halfSomersaults)} somersaults` : null,
    halfTwists ? `${formatHalfUnits(halfTwists)} twists` : null,
    position,
  ].filter(Boolean);

  return {
    rawCode: code,
    normalizedCode,
    valid: true,
    group,
    directionLabel,
    directionCode,
    flying: false,
    position,
    positionCode,
    halfSomersaults,
    somersaults,
    halfTwists,
    twists,
    structure: parts.join(" · "),
  };
}

export function diveGroupSortKey(code: string) {
  const parsed = parseDiveCode(code);
  if (!parsed.group) {
    return "9-unknown";
  }
  return `${parsed.group.id}-${parsed.normalizedCode}`;
}

export function stripFamilyWords(value: string, familyLabel: string) {
  return value
    .replace(new RegExp(escapeForRegex(familyLabel), "i"), "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
