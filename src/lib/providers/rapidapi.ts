import type { KeywordIdea, KeywordIdeaRequest } from "../types";

type RapidApiKeywordItem = {
  text: string;
  volume: number;
  competition_level: string;
  competition_index: number;
  low_bid: number;
  high_bid: number;
  trend: number;
};

export async function fetchRapidApiKeywordIdeas(
  input: KeywordIdeaRequest,
): Promise<KeywordIdea[]> {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) throw new Error("RAPIDAPI_KEY is not configured");

  const location = input.locationIds.includes("2840") ? "US" : "AU";
  const seed = input.seeds[0] || "ecommerce marketing";

  const url = new URL(
    "https://google-keyword-insight1.p.rapidapi.com/keysuggest",
  );
  url.searchParams.set("keyword", seed);
  url.searchParams.set("location", location);
  url.searchParams.set("lang", "en");

  const response = await fetch(url.toString(), {
    headers: {
      "X-RapidAPI-Key": apiKey,
      "X-RapidAPI-Host": "google-keyword-insight1.p.rapidapi.com",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("RapidAPI error:", response.status, errorText);
    throw new Error(`RapidAPI keyword request failed (${response.status})`);
  }

  const data = (await response.json()) as RapidApiKeywordItem[];
  if (!Array.isArray(data)) return [];

  // Filter valid keywords with search volume > 0, deduplicate, and sort by volume descending
  const seen = new Set<string>();
  const results: KeywordIdea[] = [];

  for (const item of data) {
    if (!item.text || typeof item.volume !== "number") continue;
    const cleanText = item.text.trim().toLowerCase();
    if (seen.has(cleanText)) continue;
    seen.add(cleanText);

    const comp =
      item.competition_level === "HIGH"
        ? "HIGH"
        : item.competition_level === "LOW"
          ? "LOW"
          : item.competition_level === "MEDIUM"
            ? "MEDIUM"
            : "UNSPECIFIED";

    results.push({
      text: item.text.trim(),
      monthlySearches: Math.round(item.volume),
      competition: comp,
      competitionIndex: Math.round(item.competition_index || 0),
      lowTopPageBidMicros: Math.round((item.low_bid || 0) * 1_000_000),
      highTopPageBidMicros: Math.round((item.high_bid || 0) * 1_000_000),
      relevance: 80,
      intent: "commercial",
      selected: item.volume >= 50,
      negative: false,
    });
  }

  // Sort by highest search volume
  results.sort((a, b) => b.monthlySearches - a.monthlySearches);
  return results;
}
