import * as cheerio from "cheerio";

export function parseG2(html: string, _url: string): string {
  const $ = cheerio.load(html);
  $("script, style, nav, footer, header, iframe, noscript").remove();

  const sections: string[] = [];

  // G2 product pages have structured feature sections
  // Look for feature category listings
  $('[class*="feature"], [data-testid*="feature"], [class*="category"]').each(
    (_, el) => {
      const text = $(el).text().replace(/\s+/g, " ").trim();
      if (text.length > 20 && text.length < 3000) {
        sections.push(text);
      }
    }
  );

  // Look for "What is" / product description sections
  $('[class*="description"], [class*="about"], [class*="overview"]').each(
    (_, el) => {
      const text = $(el).text().replace(/\s+/g, " ").trim();
      if (text.length > 50) {
        sections.push(text);
      }
    }
  );

  // Extract review snippets that mention features
  $('[class*="review"], [data-testid*="review"]').each((_, el) => {
    const text = $(el).text().replace(/\s+/g, " ").trim();
    if (text.length > 30 && text.length < 2000) {
      sections.push(`Review: ${text}`);
    }
  });

  // Pros/cons sections are gold for feature detection
  $('[class*="pros"], [class*="cons"], [class*="like"], [class*="dislike"]').each(
    (_, el) => {
      const text = $(el).text().replace(/\s+/g, " ").trim();
      if (text.length > 20) {
        sections.push(text);
      }
    }
  );

  // Fallback: general content
  if (sections.length === 0) {
    const body = $("body").text().replace(/\s+/g, " ").trim();
    sections.push(body);
  }

  return sections.join("\n\n").slice(0, 8000);
}
