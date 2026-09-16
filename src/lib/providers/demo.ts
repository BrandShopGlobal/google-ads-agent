import type { AdsProvider, AiProvider, Creative, KeywordIdea } from "../types";

const metrics = [
  ["emergency plumber sydney", 1300, "HIGH", 91],
  ["24 hour plumber sydney", 720, "HIGH", 96],
  ["blocked drain plumber", 590, "MEDIUM", 94],
  ["hot water repair sydney", 320, "MEDIUM", 88],
  ["local plumbing services", 170, "MEDIUM", 82],
  ["plumbing jobs sydney", 1600, "HIGH", 14],
  ["diy blocked drain", 880, "LOW", 22],
  ["affordable plumber sydney", 70, "MEDIUM", 86],
] as const;

function ideas(): KeywordIdea[] {
  return metrics.map(
    ([text, monthlySearches, competition, relevance], index) => ({
      text,
      monthlySearches,
      competition,
      competitionIndex:
        competition === "HIGH" ? 82 : competition === "MEDIUM" ? 54 : 21,
      lowTopPageBidMicros: 2_100_000 + index * 130_000,
      highTopPageBidMicros: 6_400_000 + index * 250_000,
      relevance,
      intent:
        relevance < 20
          ? "job"
          : relevance < 40
            ? "informational"
            : "commercial",
      selected: relevance >= 60,
      negative: relevance < 40,
    }),
  );
}

const creative: Creative = {
  headlines: [
    "Emergency Plumber Sydney",
    "Available 24 Hours",
    "Fast Local Plumbing",
    "Book a Sydney Plumber",
    "Licensed Plumbing Team",
    "Same-Day Plumbing Help",
    "Blocked Drain Specialists",
    "Request Service Today",
  ],
  descriptions: [
    "Need an emergency plumber? Get fast, reliable plumbing assistance across Sydney.",
    "Available 24/7 for blocked drains, leaks and urgent hot-water repairs.",
  ],
  sitelinks: [
    {
      text: "Emergency Plumbing",
      description1: "Fast help when needed",
      description2: "Available across Sydney",
      finalUrl: "https://example.com/emergency",
    },
    {
      text: "Blocked Drains",
      description1: "Clear stubborn blockages",
      description2: "Request a service today",
      finalUrl: "https://example.com/drains",
    },
  ],
};

export const demoAdsProvider: AdsProvider = {
  async listAccounts() {
    return [
      {
        id: "1234567890",
        name: "Sydney Flow Plumbing",
        currencyCode: "AUD",
        timeZone: "Australia/Sydney",
      },
      {
        id: "9876543210",
        name: "Brand Shop Demo Account",
        currencyCode: "AUD",
        timeZone: "Australia/Melbourne",
      },
    ];
  },
  async keywordIdeas() {
    return ideas();
  },
  async createPausedCampaign(input) {
    return {
      resourceName: `customers/${input.customerId}/campaigns/demo-${Date.now()}`,
      status: "PAUSED",
    };
  },
};

export const demoAiProvider: AiProvider = {
  async expandKeywords({ seeds }) {
    return Array.from(new Set([...seeds, ...ideas().map((item) => item.text)]));
  },
  async scoreKeywords({ keywords }) {
    return keywords;
  },
  async generateCreative({ finalUrl }) {
    return {
      ...creative,
      sitelinks: creative.sitelinks.map((item) => ({ ...item, finalUrl })),
    };
  },
};
