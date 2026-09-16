import { isIP } from "node:net";

export function assertSafePublicUrl(value: string): URL {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol))
    throw new Error("Only HTTP and HTTPS website URLs are supported");
  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    host === "0.0.0.0" ||
    host === "::1"
  )
    throw new Error("Private website URLs are not allowed");
  const version = isIP(host);
  if (version === 4) {
    const parts = host.split(".").map(Number);
    if (
      parts[0] === 10 ||
      parts[0] === 127 ||
      (parts[0] === 192 && parts[1] === 168) ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 169 && parts[1] === 254)
    )
      throw new Error("Private website URLs are not allowed");
  }
  if (
    version === 6 &&
    (host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80"))
  )
    throw new Error("Private website URLs are not allowed");
  return url;
}

export async function websiteContext(value: string): Promise<string> {
  const url = assertSafePublicUrl(value);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "error",
      headers: { "user-agent": "BrandShopAdsAgent/1.0" },
    });
    if (!response.ok) return "";
    const type = response.headers.get("content-type") || "";
    if (!type.includes("text/html")) return "";
    const html = (await response.text()).slice(0, 500_000);
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&[a-z]+;/gi, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 12_000);
  } finally {
    clearTimeout(timeout);
  }
}
