import { describe, expect, it } from "vitest";
import { demoAdsProvider, demoAiProvider } from "@/lib/providers/demo";

describe("demo providers", () => {
  it("returns accessible advertising accounts", async () => {
    const accounts = await demoAdsProvider.listAccounts();
    expect(accounts.length).toBeGreaterThan(1);
    expect(accounts[0].id).toMatch(/^\d{10}$/);
  });

  it("produces keyword ideas with metrics", async () => {
    const ideas = await demoAdsProvider.keywordIdeas({
      customerId: "1234567890",
      seeds: ["emergency plumber"],
      url: "https://example.com",
      locationIds: ["2036"],
      languageId: "1000",
    });
    expect(ideas.some((item) => item.monthlySearches >= 100)).toBe(true);
  });

  it("generates creatives within Google limits", async () => {
    const creative = await demoAiProvider.generateCreative({
      company: "Sydney Flow Plumbing",
      description: "24/7 plumbing in Sydney",
      finalUrl: "https://example.com",
      keywords: ["emergency plumber sydney"],
    });
    expect(creative.headlines.every((value) => value.length <= 30)).toBe(true);
    expect(creative.descriptions.every((value) => value.length <= 90)).toBe(
      true,
    );
  });

  it("simulates a paused campaign", async () => {
    const result = await demoAdsProvider.createPausedCampaign({
      customerId: "1234567890",
      campaignName: "Demo Search Campaign",
      dailyBudgetMicros: 50_000_000,
      locationIds: ["2036"],
      languageId: "1000",
      finalUrl: "https://example.com",
      groups: [],
    });
    expect(result.status).toBe("PAUSED");
  });
});
