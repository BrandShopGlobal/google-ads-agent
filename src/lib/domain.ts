import { z } from "zod";
import type { Creative, KeywordIdea } from "./types";

export const researchSchema = z.object({
  customerId: z.string().min(1),
  company: z.string().trim().min(2).max(120),
  description: z.string().trim().min(10).max(3000),
  url: z.string().url().startsWith("https://"),
  seeds: z.array(z.string().trim().min(2).max(80)).min(1).max(20),
  locationIds: z.array(z.string().regex(/^\d+$/)).min(1).max(20),
  languageId: z.string().regex(/^\d+$/),
  minimumVolume: z.number().int().min(0).max(1_000_000),
});

const keywordSchema = z.object({
  text: z.string().min(1).max(120),
  monthlySearches: z.number().int().min(0),
  competition: z.enum(["LOW", "MEDIUM", "HIGH", "UNSPECIFIED"]),
  competitionIndex: z.number().min(0).max(100),
  lowTopPageBidMicros: z.number().min(0),
  highTopPageBidMicros: z.number().min(0),
  relevance: z.number().min(0).max(100),
  intent: z.enum([
    "commercial",
    "informational",
    "job",
    "competitor",
    "irrelevant",
  ]),
  selected: z.boolean(),
  negative: z.boolean(),
});

const creativeSchema = z.object({
  headlines: z.array(z.string().min(1).max(30)).min(3).max(15),
  descriptions: z.array(z.string().min(1).max(90)).min(2).max(4),
  sitelinks: z
    .array(
      z.object({
        text: z.string().min(1).max(25),
        description1: z.string().max(35),
        description2: z.string().max(35),
        finalUrl: z.string().url(),
      }),
    )
    .max(4),
});

export const creativeRequestSchema = z.object({
  company: z.string().min(2).max(120),
  description: z.string().min(10).max(3000),
  finalUrl: z.string().url().startsWith("https://"),
  keywords: z.array(z.string().min(1).max(120)).min(1).max(200),
});

export const campaignSchema = z.object({
  customerId: z.string().transform(normalizeCustomerId),
  campaignName: z.string().trim().min(3).max(128),
  dailyBudgetMicros: z.number().int().min(1_000_000),
  locationIds: z.array(z.string().regex(/^\d+$/)).min(1),
  languageId: z.string().regex(/^\d+$/),
  finalUrl: z.string().url().startsWith("https://"),
  groups: z
    .array(
      z.object({
        name: z.string().min(1).max(255),
        keywords: z
          .array(
            z.object({
              text: z.string().min(1).max(80),
              matchType: z.enum(["EXACT", "PHRASE"]),
            }),
          )
          .min(1),
        negativeKeywords: z.array(z.string().min(1).max(80)),
        creative: creativeSchema,
      }),
    )
    .min(1)
    .max(20),
});

export function normalizeCustomerId(value: string): string {
  const normalized = value.replace(/-/g, "").trim();
  if (!/^\d{10}$/.test(normalized))
    throw new Error("Google Ads customer ID must contain exactly 10 digits");
  return normalized;
}

export function filterKeywords(
  keywords: KeywordIdea[],
  minimumVolume: number,
  minimumRelevance = 60,
): KeywordIdea[] {
  return keywords.filter(
    (item) =>
      item.selected &&
      !item.negative &&
      item.monthlySearches >= minimumVolume &&
      item.relevance >= minimumRelevance,
  );
}

export function validateCreativeLimits(
  creative: Pick<Creative, "headlines" | "descriptions" | "sitelinks">,
): string[] {
  const errors: string[] = [];
  creative.headlines.forEach((value, i) => {
    if (value.length > 30)
      errors.push(`Headline ${i + 1} exceeds 30 characters`);
  });
  creative.descriptions.forEach((value, i) => {
    if (value.length > 90)
      errors.push(`Description ${i + 1} exceeds 90 characters`);
  });
  creative.sitelinks.forEach((value, i) => {
    if (value.text.length > 25)
      errors.push(`Sitelink ${i + 1} text exceeds 25 characters`);
    if (value.description1.length > 35 || value.description2.length > 35)
      errors.push(`Sitelink ${i + 1} description exceeds 35 characters`);
  });
  return errors;
}

export function assertDeployConfirmation(value: string): void {
  if (value !== "CREATE PAUSED CAMPAIGN")
    throw new Error("Type CREATE PAUSED CAMPAIGN to confirm deployment");
}

export function parseKeyword(value: unknown): KeywordIdea {
  return keywordSchema.parse(value);
}
export function parseCreative(value: unknown): Creative {
  return creativeSchema.parse(value);
}
