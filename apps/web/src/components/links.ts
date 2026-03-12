export function athleteProfileHref(id: number | string) {
  return `/athletes/${id}`;
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
  return `/competitions?${params.toString()}`;
}
