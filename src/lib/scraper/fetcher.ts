import * as cheerio from "cheerio";

interface FetchResult {
  html: string;
  text: string;
  url: string;
  success: boolean;
  error?: string;
}

const USER_AGENT =
  "Mozilla/5.0 (compatible; CompetitorIQ/1.0; +https://competitoriq.app)";

async function lightFetch(url: string): Promise<FetchResult> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    return { html: "", text: "", url, success: false, error: `HTTP ${response.status}` };
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // Remove scripts, styles, nav, footer noise
  $("script, style, nav, footer, header, iframe, noscript").remove();

  const text = $("body").text().replace(/\s+/g, " ").trim();
  return { html, text, url, success: true };
}

async function headlessFetch(url: string): Promise<FetchResult> {
  try {
    const chromium = (await import("@sparticuz/chromium")).default;
    const puppeteer = await import("puppeteer-core");

    const browser = await puppeteer.default.launch({
      args: chromium.args,
      defaultViewport: { width: 1280, height: 720 },
      executablePath: await chromium.executablePath(),
      headless: true,
    });

    const page = await browser.newPage();
    await page.setUserAgent(USER_AGENT);
    await page.goto(url, { waitUntil: "networkidle2", timeout: 15000 });

    const html = await page.content();
    const $ = cheerio.load(html);
    $("script, style, nav, footer, header, iframe, noscript").remove();
    const text = $("body").text().replace(/\s+/g, " ").trim();

    await browser.close();
    return { html, text, url, success: true };
  } catch (error) {
    return {
      html: "",
      text: "",
      url,
      success: false,
      error: error instanceof Error ? error.message : "Headless fetch failed",
    };
  }
}

const MIN_CONTENT_LENGTH = 200;

export async function fetchPage(url: string): Promise<FetchResult> {
  // Try light fetch first
  const light = await lightFetch(url);
  if (light.success && light.text.length >= MIN_CONTENT_LENGTH) {
    return light;
  }

  // Fall back to headless for JS-rendered pages
  const headless = await headlessFetch(url);
  if (headless.success) {
    return headless;
  }

  // Return whatever we got from light fetch
  return light.success ? light : headless;
}
