function normalizeWhitespace(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeClubName(club: string | null | undefined, athleteName?: string | null) {
  if (!club) {
    return null;
  }

  let value = normalizeWhitespace(String(club));
  const athlete = normalizeWhitespace(String(athleteName || ""));

  if (athlete && value.toLowerCase().startsWith(`${athlete.toLowerCase()} #`)) {
    value = value.slice(athlete.length).trim();
  }

  if (value.startsWith("#")) {
    const code = value.slice(1).split("/")[0]?.trim();
    value = code || "";
  }

  value = value.replace(/\s+#.+$/, "").replace(/\s*\(withdrew\)\s*/gi, "").trim();

  const folded = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s/]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!folded || folded === "?") {
    return null;
  }
  if (folded.startsWith("joop stotijn") || folded.startsWith("joopstotijn") || folded === "jsdsz") {
    return "Joop Stotijn DSZ";
  }
  if (folded === "psv" || folded.startsWith("psv schoonspringen")) {
    return "PSV Schoonspringen";
  }
  if (folded.startsWith("kingfisher") || folded.startsWith("kingfischer")) {
    return "Kingfisher Club Montreuil";
  }
  if (folded.startsWith("heritage 2024 plongeon") || folded.startsWith("h2024 plongeon")) {
    return "Héritage 2024 Plongeon";
  }
  if (folded === "rgsc" || folded.startsWith("rgsc gent") || folded.startsWith("royal ghent swimming club") || folded.startsWith("royal gent swimming club")) {
    return "Royal Ghent Swimming Club";
  }
  if (folded === "icd" || folded.startsWith("indoor cliff diving")) {
    return "Indoor Cliff Diving";
  }
  if (folded.startsWith("awv09") || folded.startsWith("awv 09 hamburg") || folded.startsWith("awv hamburg")) {
    return "AWV 09 Hamburg";
  }
  if (folded.startsWith("geneve natation") || folded === "gn1885" || folded === "gn 1885") {
    return "Genève Natation";
  }
  if (folded === "dolfijn" || folded.startsWith("de dolfijn") || folded.startsWith("de dolfyn")) {
    return "De Dolfijn";
  }
  if (folded.startsWith("tpsk")) {
    return "TPSK Köln";
  }

  return value || null;
}

export function clubSlug(value: string | null | undefined) {
  return normalizeWhitespace(String(value || ""))
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .replace(/[_\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
