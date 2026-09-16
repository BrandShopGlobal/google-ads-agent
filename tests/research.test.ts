import { describe, expect, it } from "vitest";
import { withFallbackTimeout } from "@/lib/research";

describe("withFallbackTimeout", () => {
  it("returns fallback when a provider call is too slow", async () => {
    const result = await withFallbackTimeout(
      new Promise<string>((resolve) => setTimeout(() => resolve("late"), 50)),
      1,
      "fallback",
    );

    expect(result).toBe("fallback");
  });
});
