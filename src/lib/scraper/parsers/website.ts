import * as cheerio from "cheerio";

export function parseWebsite(html: string, url: string): string {
  const $ = cheerio.load(html);
  $("script, style, nav, footer, header, iframe, noscript").remove();

  const sections: string[] = [];

  // Look for feature-related sections
  const featureSelectors = [
    '[class*="feature"]',
    '[class*="pricing"]',
    '[class*="capability"]',
    '[class*="product"]',
    '[class*="solution"]',
    '[class*="module"]',
    '[id*="feature"]',
    '[id*="pricing"]',
    "main",
    "article",
    ".content",
    "#content",
  ];

  for (const sel of featureSelectors) {
    $(sel).each((_, el) => {
      const text = $(el).text().replace(/\s+/g, " ").trim();
      if (text.length > 50 && text.length < 5000) {
        sections.push(text);
      }
    });
  }

  // If nothing feature-specific found, use headings + surrounding content
  if (sections.length === 0) {
    $("h1, h2, h3, h4").each((_, el) => {
      const heading = $(el).text().trim();
      const sibling = $(el).next().text().trim();
      if (heading && sibling) {
        sections.push(`${heading}: ${sibling}`);
      }
    });
  }

  // Also grab list items which often contain features
  $("ul li, ol li").each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 10 && text.length < 300) {
      sections.push(`- ${text}`);
    }
  });

  // Extract table rows (feature comparison tables)
  $("table tr").each((_, el) => {
    const text = $(el).text().replace(/\s+/g, " ").trim();
    if (text.length > 10 && text.length < 500) {
      sections.push(`| ${text}`);
    }
  });

  // Extract definition lists (common for feature specs)
  $("dl dt").each((_, el) => {
    const term = $(el).text().trim();
    const def = $(el).next("dd").text().trim();
    if (term && def) {
      sections.push(`${term}: ${def}`);
    }
  });

  // Deduplicate sections before joining
  const uniqueSections = Array.from(new Set(sections));
  const result = uniqueSections.join("\n\n").slice(0, 12000);
  return result || $("body").text().replace(/\s+/g, " ").trim().slice(0, 12000);
}
