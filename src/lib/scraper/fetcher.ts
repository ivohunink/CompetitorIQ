import * as cheerio from "cheerio";
import { createHash } from "crypto";

export interface FetchResult {
  html: string;
  text: string;
  url: string;
  success: boolean;
  error?: string;
  etag?: string;
  lastModified?: string;
  unchanged?: boolean;
}

export interface ConditionalHeaders {
  etag?: string;
  lastModified?: string;
}

export function computeContentHash(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

const USER_AGENT =
  "Mozilla/5.0 (compatible; CompetitorIQ/1.0; +https://competitoriq.app)";

async function lightFetch(
  url: string,
  conditionalHeaders?: ConditionalHeaders
): Promise<FetchResult> {
  const headers: Record<string, string> = {
    "User-Agent": USER_AGENT,
    Accept: "text/html,application/xhtml+xml",
  };

  if (conditionalHeaders?.etag) {
    headers["If-None-Match"] = conditionalHeaders.etag;
  }
  if (conditionalHeaders?.lastModified) {
    headers["If-Modified-Since"] = conditionalHeaders.lastModified;
  }

  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(8000),
  });

  // Handle 304 Not Modified
  if (response.status === 304) {
    return { html: "", text: "", url, success: true, unchanged: true };
  }

  if (!response.ok) {
    return { html: "", text: "", url, success: false, error: `HTTP ${response.status}` };
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // Remove scripts, styles, nav, footer noise
  $("script, style, nav, footer, header, iframe, noscript").remove();

  const text = $("body").text().replace(/\s+/g, " ").trim();
  return {
    html,
    text,
    url,
    success: true,
    etag: response.headers.get("etag") ?? undefined,
    lastModified: response.headers.get("last-modified") ?? undefined,
  };
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

export async function fetchPage(
  url: string,
  conditionalHeaders?: ConditionalHeaders
): Promise<FetchResult> {
  // Try light fetch first
  const light = await lightFetch(url, conditionalHeaders);
  if (light.unchanged) {
    return light;
  }
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
