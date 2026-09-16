import { parseCreative, parseKeyword } from "../domain";
import type { AiProvider } from "../types";

export function extractResponseJson(response: unknown): unknown {
  const output =
    (
      response as {
        output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
      }
    )?.output || [];
  const text = output
    .flatMap((item) => item.content || [])
    .find((item) => item.type === "output_text")?.text;
  if (!text) throw new Error("OpenAI did not return structured output");
  return JSON.parse(text);
}

async function structured(
  name: string,
  schema: Record<string, unknown>,
  instructions: string,
  input: unknown,
) {
  if (!process.env.OPENAI_API_KEY)
    throw new Error("OPENAI_API_KEY is not configured");
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5-mini",
      instructions,
      input: JSON.stringify(input),
      text: { format: { type: "json_schema", name, strict: true, schema } },
    }),
  });
  if (!response.ok) {
    console.error("OpenAI API error", response.status, await response.text());
    throw new Error(`OpenAI request failed (${response.status})`);
  }
  return extractResponseJson(await response.json());
}

const keywordFields = {
  text: { type: "string" },
  monthlySearches: { type: "integer" },
  competition: {
    type: "string",
    enum: ["LOW", "MEDIUM", "HIGH", "UNSPECIFIED"],
  },
  competitionIndex: { type: "number" },
  lowTopPageBidMicros: { type: "number" },
  highTopPageBidMicros: { type: "number" },
  relevance: { type: "number" },
  intent: {
    type: "string",
    enum: ["commercial", "informational", "job", "competitor", "irrelevant"],
  },
  selected: { type: "boolean" },
  negative: { type: "boolean" },
};

export const openAiProvider: AiProvider = {
  async expandKeywords(input) {
    const result = (await structured(
      "keyword_expansion",
      {
        type: "object",
        additionalProperties: false,
        required: ["keywords"],
        properties: {
          keywords: {
            type: "array",
            minItems: 20,
            maxItems: 100,
            items: { type: "string" },
          },
        },
      },
      "Generate diverse, commercially relevant Google Search keyword ideas. Exclude claims not supported by the business context.",
      input,
    )) as { keywords: string[] };
    return result.keywords;
  },
  async scoreKeywords(input) {
    const result = (await structured(
      "keyword_scores",
      {
        type: "object",
        additionalProperties: false,
        required: ["keywords"],
        properties: {
          keywords: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: Object.keys(keywordFields),
              properties: keywordFields,
            },
          },
        },
      },
      "Score relevance to the business. Mark job-seeking, DIY, unrelated, and unsupported competitor terms negative and unselected. Preserve all supplied metrics exactly.",
      input,
    )) as { keywords: unknown[] };
    return result.keywords.map(parseKeyword);
  },
  async generateCreative(input) {
    const sitelink = {
      type: "object",
      additionalProperties: false,
      required: ["text", "description1", "description2", "finalUrl"],
      properties: {
        text: { type: "string", maxLength: 25 },
        description1: { type: "string", maxLength: 35 },
        description2: { type: "string", maxLength: 35 },
        finalUrl: { type: "string" },
      },
    };
    const result = await structured(
      "rsa_creative",
      {
        type: "object",
        additionalProperties: false,
        required: ["headlines", "descriptions", "sitelinks"],
        properties: {
          headlines: {
            type: "array",
            minItems: 8,
            maxItems: 15,
            items: { type: "string", maxLength: 30 },
          },
          descriptions: {
            type: "array",
            minItems: 2,
            maxItems: 4,
            items: { type: "string", maxLength: 90 },
          },
          sitelinks: {
            type: "array",
            minItems: 2,
            maxItems: 4,
            items: sitelink,
          },
        },
      },
      "Write accurate Responsive Search Ad assets. Character limits are strict. Do not invent offers, certifications, prices, or guarantees.",
      input,
    );
    return parseCreative(result);
  },
};
