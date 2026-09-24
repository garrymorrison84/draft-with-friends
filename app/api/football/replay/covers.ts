const coversNcaafInjuriesUrl =
  "https://www.covers.com/sport/football/ncaaf/injuries";
const coversCacheDurationMs = 24 * 60 * 60 * 1000;

export type CoversNcaafInjury = {
  playerName: string;
  teamName: string;
  teamAbbreviation?: string;
  position?: string;
  status: "Out" | "Doubtful" | "Questionable";
  type?: string;
};

let coversCache:
  | { expiresAt: number; injuries: CoversNcaafInjury[] }
  | undefined;

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function textContent(value: string) {
  return decodeHtml(value.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeStatus(value: string) {
  const match = value.match(/^(Out|Doubtful|Questionable)\b/i);
  if (!match) return undefined;

  const status = `${match[1][0].toUpperCase()}${match[1]
    .slice(1)
    .toLowerCase()}` as CoversNcaafInjury["status"];
  const type = value
    .slice(match[0].length)
    .replace(/^\s*-\s*/, "")
    .trim();
  return { status, type: type || undefined };
}

export function parseCoversNcaafInjuries(html: string) {
  const injuries: CoversNcaafInjury[] = [];
  const sectionPattern =
    /<a\s+id=(['"])(.*?)\1\s*><\/a>\s*<section\b[^>]*>([\s\S]*?)<\/section>/gi;

  for (const sectionMatch of html.matchAll(sectionPattern)) {
    const teamName = textContent(sectionMatch[2]);
    const section = sectionMatch[3];
    if (!teamName || !section) continue;

    const logoMatch = section.match(
      /<img\b[^>]*\bsrc=(['"])[^'"]*\/ncaaf\/([^/'"]+)\.(?:png|svg|webp)\1/i
    );
    const teamAbbreviation = logoMatch?.[2]?.trim();
    const rowPattern =
      /<tr\b[^>]*>\s*<td\b[^>]*>[\s\S]*?<span\b[^>]*class=(['"])[^'"]*\bplayer-link\b[^'"]*\1[^>]*>([\s\S]*?)<\/span>[\s\S]*?<\/td>\s*<td\b[^>]*>([\s\S]*?)<\/td>\s*<td\b[^>]*>\s*<b\b[^>]*>([\s\S]*?)<\/b>/gi;

    for (const rowMatch of section.matchAll(rowPattern)) {
      const playerName = textContent(rowMatch[2]);
      const position = textContent(rowMatch[3]);
      const statusAndType = normalizeStatus(textContent(rowMatch[4]));
      if (!playerName || !statusAndType) continue;

      injuries.push({
        playerName,
        teamName,
        teamAbbreviation,
        position: position || undefined,
        ...statusAndType,
      });
    }
  }

  return injuries;
}

export async function getCoversNcaafInjuries() {
  if (coversCache && coversCache.expiresAt > Date.now()) {
    return coversCache.injuries;
  }

  const response = await fetch(coversNcaafInjuriesUrl, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": "DraftWithFriends/1.0 (+https://draftwithfriends.com)",
    },
    next: { revalidate: coversCacheDurationMs / 1000 },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) {
    throw new Error(`Covers injuries failed with ${response.status}`);
  }

  const injuries = parseCoversNcaafInjuries(await response.text());
  if (!injuries.length) {
    throw new Error("Covers injuries returned no supported injury rows");
  }

  coversCache = {
    expiresAt: Date.now() + coversCacheDurationMs,
    injuries,
  };
  return injuries;
}
