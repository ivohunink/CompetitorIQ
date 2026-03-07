import * as cheerio from "cheerio";

export function parseCapterra(html: string, _url: string): string {
  const $ = cheerio.load(html);
  $("script, style, nav, footer, header, iframe, noscript").remove();

  const sections: string[] = [];

  // Capterra product pages have structured feature listings
  $('[class*="feature"], [data-testid*="feature"], [class*="functionality"]').each(
    (_, el) => {
      const text = $(el).text().replace(/\s+/g, " ").trim();
      if (text.length > 20 && text.length < 3000) {
        sections.push(text);
      }
    }
  );

  // Product description and overview
  $('[class*="description"], [class*="overview"], [class*="about"]').each(
    (_, el) => {
      const text = $(el).text().replace(/\s+/g, " ").trim();
      if (text.length > 50) {
        sections.push(text);
      }
    }
  );

  // Review content mentioning capabilities
  $('[class*="review"], [class*="testimonial"]').each((_, el) => {
    const text = $(el).text().replace(/\s+/g, " ").trim();
    if (text.length > 30 && text.length < 2000) {
      sections.push(`Review: ${text}`);
    }
  });

  // Pros/cons
  $('[class*="pros"], [class*="cons"]').each((_, el) => {
    const text = $(el).text().replace(/\s+/g, " ").trim();
    if (text.length > 20) {
      sections.push(text);
    }
  });

  if (sections.length === 0) {
    const body = $("body").text().replace(/\s+/g, " ").trim();
    sections.push(body);
  }

  return sections.join("\n\n").slice(0, 8000);
}
