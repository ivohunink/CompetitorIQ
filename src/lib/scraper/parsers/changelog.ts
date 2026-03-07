import * as cheerio from "cheerio";

export function parseChangelog(html: string, _url: string): string {
  const $ = cheerio.load(html);
  $("script, style, nav, footer, header, iframe, noscript").remove();

  const entries: string[] = [];

  // Common changelog patterns
  const entrySelectors = [
    '[class*="changelog"]',
    '[class*="release"]',
    '[class*="update"]',
    "article",
    ".post",
    '[class*="entry"]',
  ];

  for (const sel of entrySelectors) {
    $(sel).each((_, el) => {
      const text = $(el).text().replace(/\s+/g, " ").trim();
      if (text.length > 30 && text.length < 3000) {
        entries.push(text);
      }
    });
  }

  // Fallback: look for date headings followed by content
  if (entries.length === 0) {
    $("h2, h3").each((_, el) => {
      const heading = $(el).text().trim();
      // Check if heading looks like a date or version
      if (/\d{4}|v\d|version/i.test(heading)) {
        const content = $(el).nextUntil("h2, h3").text().replace(/\s+/g, " ").trim();
        if (content) {
          entries.push(`${heading}\n${content}`);
        }
      }
    });
  }

  // Take the most recent entries (likely at the top)
  return entries.slice(0, 10).join("\n\n---\n\n").slice(0, 8000);
}
