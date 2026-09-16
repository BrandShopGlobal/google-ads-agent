import { describe, expect, it } from "vitest";
import {
  assertDeployConfirmation,
  filterKeywords,
  normalizeCustomerId,
  validateCreativeLimits,
} from "@/lib/domain";

describe("keyword filtering", () => {
  it("keeps relevant selected keywords at or above the threshold", () => {
    const result = filterKeywords(
      [
        {
          text: "emergency plumber",
          monthlySearches: 120,
          relevance: 91,
          selected: true,
          negative: false,
        },
        {
          text: "plumbing jobs",
          monthlySearches: 900,
          relevance: 12,
          selected: true,
          negative: false,
        },
        {
          text: "local plumber",
          monthlySearches: 40,
          relevance: 95,
          selected: true,
          negative: false,
        },
      ],
      100,
      60,
    );
    expect(result.map((item) => item.text)).toEqual(["emergency plumber"]);
  });
});

describe("customer IDs", () => {
  it("normalizes a dashed ten digit ID", () => {
    expect(normalizeCustomerId("123-456-7890")).toBe("1234567890");
  });

  it("rejects invalid customer IDs", () => {
    expect(() => normalizeCustomerId("1234")).toThrow("10 digits");
  });
});

describe("creative validation", () => {
  it("reports Google Ads character-limit violations", () => {
    expect(
      validateCreativeLimits({
        headlines: [
          "A headline that is definitely longer than thirty characters",
        ],
        descriptions: ["Valid description"],
        sitelinks: [],
      }),
    ).toContain("Headline 1 exceeds 30 characters");
  });
});

describe("deployment guard", () => {
  it("requires the exact confirmation phrase", () => {
    expect(() => assertDeployConfirmation("CREATE")).toThrow(
      "CREATE PAUSED CAMPAIGN",
    );
    expect(() =>
      assertDeployConfirmation("CREATE PAUSED CAMPAIGN"),
    ).not.toThrow();
  });
});
