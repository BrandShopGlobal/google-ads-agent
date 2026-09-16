import { describe, expect, it } from "vitest";
import { extractResponseJson } from "@/lib/providers/openai";

describe("OpenAI response parsing", () => {
  it("extracts JSON from a Responses API output block", () => {
    const value = extractResponseJson({
      output: [
        {
          content: [{ type: "output_text", text: '{"keywords":["plumber"]}' }],
        },
      ],
    });
    expect(value).toEqual({ keywords: ["plumber"] });
  });

  it("rejects a response without output text", () => {
    expect(() => extractResponseJson({ output: [] })).toThrow(
      "structured output",
    );
  });
});
