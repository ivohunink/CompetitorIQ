import * as cheerio from "cheerio";

export function parseDocs(html: string, _url: string): string {
  const $ = cheerio.load(html);
  $("script, style, nav, footer, header, iframe, noscript").remove();

  const sections: string[] = [];

  // Documentation typically uses clear heading hierarchy
  const contentSelectors = [
    "main",
    ".documentation",
    ".docs-content",
    '[class*="doc"]',
    "#content",
    "article",
  ];

  for (const sel of contentSelectors) {
    $(sel).each((_, el) => {
      // Get headings and their content
      $(el)
        .find("h1, h2, h3")
        .each((__, heading) => {
          const title = $(heading).text().trim();
          const content = $(heading)
            .nextUntil("h1, h2, h3")
            .text()
            .replace(/\s+/g, " ")
            .trim();
          if (title && content && content.length > 20) {
            sections.push(`## ${title}\n${content}`);
          }
        });
    });
  }

  // Fallback: grab all paragraphs with substantial text
  if (sections.length === 0) {
    $("p").each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 50) {
        sections.push(text);
      }
    });
  }

  return sections.join("\n\n").slice(0, 8000);
}
