import { describe, expect, it } from "vitest";
import { assertSafePublicUrl } from "@/lib/security";

describe("website URL security", () => {
  it("accepts a public HTTPS URL", () => {
    expect(() =>
      assertSafePublicUrl("https://brandshop.com.au/services"),
    ).not.toThrow();
  });

  it.each([
    "http://localhost:3000",
    "http://127.0.0.1",
    "http://10.0.0.2",
    "ftp://example.com",
  ])("rejects private or unsupported URL %s", (url) => {
    expect(() => assertSafePublicUrl(url)).toThrow();
  });
});
