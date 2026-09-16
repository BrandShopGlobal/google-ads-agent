import { describe, expect, it } from "vitest";
import { readApiResponse } from "@/lib/api-client";

describe("readApiResponse", () => {
  it("turns non-JSON server pages into a useful error", async () => {
    const response = new Response("<!DOCTYPE html><title>Timeout</title>", {
      status: 504,
      headers: { "content-type": "text/html" },
    });

    await expect(readApiResponse(response)).rejects.toThrow(
      "Server returned an HTML error page",
    );
  });

  it("returns JSON API payloads", async () => {
    const response = Response.json({ ok: true });

    await expect(readApiResponse(response)).resolves.toEqual({ ok: true });
  });
});
