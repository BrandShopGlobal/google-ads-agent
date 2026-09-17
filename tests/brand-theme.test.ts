import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("Brand Shop theme", () => {
  it("uses Brand Shop fonts and color tokens", () => {
    const css = read("src/app/globals.css");
    const layout = read("src/app/layout.tsx");

    expect(layout).toContain('from "next/font/google"');
    expect(layout).toContain("Outfit");
    expect(css).toContain("--brand-yellow: #fdc808");
    expect(css).toContain("--brand-black: #000000");
    expect(css).toContain("font-family: var(--font-body)");
    expect(css).toContain("font-size: 17px;");
    expect(css).toContain("line-height: 28px;");
    expect(css).toContain("font-size: 30px;");
    expect(css).toContain("line-height: 39px;");
    expect(css).toContain("background: var(--brand-yellow);");
  });

  it("uses Brand Shop identity and defaults instead of the old sample brand", () => {
    const component = read("src/components/ads-agent.tsx");

    expect(component).toContain("function BrandMark");
    expect(component).not.toContain("cropped-BrandShop-Site-Icon-192x192.png");
    expect(component).toContain("bg-[#fdc808]");
    expect(component).toContain('company: "Brand Shop"');
    expect(component).toContain('url: "https://brandshop.com.au"');
    expect(component).toContain(
      'seeds: "ecommerce marketing, google ads agency, shopify marketing"',
    );
    expect(component).not.toContain("Sydney Flow Plumbing");
    expect(component).not.toContain("emergency plumber");
  });
});
