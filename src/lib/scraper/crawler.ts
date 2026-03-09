import * as cheerio from "cheerio";

const EXCLUDED_PATHS = [
  "/login",
  "/signin",
  "/signup",
  "/register",
  "/contact",
  "/careers",
  "/jobs",
  "/privacy",
  "/terms",
  "/legal",
  "/cookie",
  "/assets",
  "/static",
  "/cdn-cgi",
];

/**
 * Discover links on a page that share the same path prefix as the source URL.
 * Returns up to `maxLinks` unique, same-origin URLs suitable for depth-2 crawling.
 */
export function discoverLinks(
  html: string,
  sourceUrl: string,
  maxLinks: number = 20
): string[] {
  const source = new URL(sourceUrl);
  const sourcePathPrefix = source.pathname.replace(/\/+$/, "") || "/";
  const $ = cheerio.load(html);

  const seen = new Set<string>();
  const links: string[] = [];

  $("a[href]").each((_, el) => {
    if (links.length >= maxLinks) return false;

    const href = $(el).attr("href");
    if (!href) return;

    let resolved: URL;
    try {
      resolved = new URL(href, sourceUrl);
    } catch {
      return; // Skip malformed URLs
    }

    // Same origin only
    if (resolved.origin !== source.origin) return;

    // Strip fragment and query for dedup
    resolved.hash = "";
    resolved.search = "";

    const cleanUrl = resolved.toString();

    // Skip the source URL itself
    if (resolved.pathname === source.pathname) return;

    // Same-path-prefix filter
    if (!resolved.pathname.startsWith(sourcePathPrefix + "/")) return;

    // Exclude common non-content paths
    const lowerPath = resolved.pathname.toLowerCase();
    if (EXCLUDED_PATHS.some((p) => lowerPath.startsWith(p))) return;

    // Skip file extensions that aren't pages
    if (/\.(pdf|zip|png|jpg|jpeg|gif|svg|css|js|xml|json)$/i.test(resolved.pathname)) return;

    if (seen.has(cleanUrl)) return;
    seen.add(cleanUrl);
    links.push(cleanUrl);
  });

  return links;
}
