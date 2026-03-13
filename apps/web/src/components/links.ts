function withQuery(pathname: string, params: URLSearchParams) {
  const query = params.toString();
  return `${pathname}${query ? `?${query}` : ""}`;
}

export function athleteProfileHref(
  id: number | string,
  options?: {
    from?: string | null;
  },
) {
  const params = new URLSearchParams();
  if (options?.from) {
    params.set("from", options.from);
  }
  return withQuery(`/athletes/${id}`, params);
}

export function athleteTechniqueHref(
  id: number | string,
  options?: {
    groupId?: number | string | null;
    mode?: string | null;
    from?: string | null;
  },
) {
  const params = new URLSearchParams();
  if (options?.groupId) {
    params.set("group", String(options.groupId));
  }
  if (options?.mode) {
    params.set("mode", options.mode);
  }
  if (options?.from) {
    params.set("from", options.from);
  }
  return withQuery(`/athletes/${id}/technique`, params);
}

function clubSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .replace(/[_\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function clubProfileHref(clubName: string) {
  return `/clubs/${clubSlug(clubName)}`;
}

export function competitionFocusHref(input: {
  competitionId: number | string;
  eventName?: string | null;
  entryId?: number | string | null;
  diveId?: number | string | null;
  view?: string | null;
  clubName?: string | null;
  focus?: string | null;
  from?: string | null;
  hash?: string | null;
}) {
  const params = new URLSearchParams();
  params.set("id", String(input.competitionId));
  if (input.eventName) {
    params.set("event", input.eventName);
  }
  if (input.entryId) {
    params.set("entry", String(input.entryId));
  }
  if (input.diveId) {
    params.set("dive", String(input.diveId));
  }
  if (input.view) {
    params.set("view", input.view);
  }
  if (input.clubName) {
    params.set("club", input.clubName);
  }
  if (input.focus) {
    params.set("focus", input.focus);
  }
  if (input.from) {
    params.set("from", input.from);
  }
  const hash = input.hash ? `#${input.hash}` : "";
  return `/competitions?${params.toString()}${hash}`;
}
