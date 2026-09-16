import { describe, expect, it } from "vitest";
import {
  buildGoogleAdsHeaders,
  buildKeywordIdeaBody,
  buildPausedCampaignOperations,
} from "@/lib/providers/google-ads";

describe("Google Ads request builders", () => {
  it("sends the manager account as login-customer-id when configured", () => {
    const headers = buildGoogleAdsHeaders("access-token", {
      developerToken: "dev-token",
      loginCustomerId: "123-456-7890",
    });

    expect(headers["developer-token"]).toBe("dev-token");
    expect(headers["login-customer-id"]).toBe("1234567890");
  });

  it("builds a keyword seed request matching the working WordPress planner", () => {
    const body = buildKeywordIdeaBody({
      customerId: "1234567890",
      seeds: ["plumber"],
      url: "https://example.com",
      locationIds: ["2036"],
      languageId: "1000",
    });
    expect(body.keywordSeed).toEqual({
      keywords: ["plumber"],
    });
    expect(body.keywordAndUrlSeed).toBeUndefined();
    expect(body.keywordPlanNetwork).toBe("GOOGLE_SEARCH");
    expect(body.geoTargetConstants).toEqual(["geoTargetConstants/2036"]);
  });

  it("hard-codes the campaign status to PAUSED", () => {
    const operations = buildPausedCampaignOperations({
      customerId: "1234567890",
      campaignName: "Search Demo",
      dailyBudgetMicros: 50_000_000,
      locationIds: ["2036"],
      languageId: "1000",
      finalUrl: "https://example.com",
      groups: [
        {
          name: "Emergency",
          keywords: [{ text: "emergency plumber", matchType: "PHRASE" }],
          negativeKeywords: [],
          creative: {
            headlines: [
              "Emergency Plumber",
              "Available 24 Hours",
              "Fast Local Help",
            ],
            descriptions: [
              "Fast plumbing help across Sydney.",
              "Request an experienced local plumber today.",
            ],
            sitelinks: [],
          },
        },
      ],
    });
    const campaign = operations.find(
      (operation) => "campaignOperation" in operation,
    ) as { campaignOperation: { create: { status: string } } };
    expect(campaign.campaignOperation.create.status).toBe("PAUSED");
  });

  it("attaches generated sitelinks at campaign level", () => {
    const operations = buildPausedCampaignOperations({
      customerId: "1234567890",
      campaignName: "Search Demo",
      dailyBudgetMicros: 50_000_000,
      locationIds: ["2036"],
      languageId: "1000",
      finalUrl: "https://example.com",
      groups: [
        {
          name: "Emergency",
          keywords: [{ text: "emergency plumber", matchType: "PHRASE" }],
          negativeKeywords: [],
          creative: {
            headlines: [
              "Emergency Plumber",
              "Available 24 Hours",
              "Fast Local Help",
            ],
            descriptions: [
              "Fast plumbing help across Sydney.",
              "Request an experienced local plumber today.",
            ],
            sitelinks: [
              {
                text: "Emergency Service",
                description1: "Request urgent assistance",
                description2: "Serving the Sydney area",
                finalUrl: "https://example.com/emergency",
              },
            ],
          },
        },
      ],
    });
    expect(operations.some((operation) => "assetOperation" in operation)).toBe(
      true,
    );
    expect(
      operations.some((operation) => "campaignAssetOperation" in operation),
    ).toBe(true);
  });
});
