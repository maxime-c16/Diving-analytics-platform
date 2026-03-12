export type SortDirection = "asc" | "desc" | null;

export function parseCompetitionDate(value: string | null) {
  if (!value) {
    return 0;
  }

  const rangeParts = value.split(" to ").map((part) => part.trim());
  const target = rangeParts[rangeParts.length - 1];
  const timestamp = Date.parse(target);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function nextSortDirection(
  currentKey: string,
  currentDirection: SortDirection,
  nextKey: string,
  options?: { firstDirection?: SortDirection; textMode?: boolean },
) {
  const firstDirection = options?.firstDirection || "desc";
  const textMode = options?.textMode || false;

  if (currentKey !== nextKey) {
    return textMode ? "asc" : firstDirection;
  }

  if (textMode) {
    if (currentDirection === "asc") {
      return "desc";
    }
    if (currentDirection === "desc") {
      return null;
    }
    return "asc";
  }

  if (currentDirection === "desc") {
    return "asc";
  }
  if (currentDirection === "asc") {
    return null;
  }
  return firstDirection;
}

export function sortIndicator(direction: SortDirection) {
  if (direction === "asc") {
    return "↑";
  }
  if (direction === "desc") {
    return "↓";
  }
  return "·";
}
