const USER_AGENT_NAME = "CompetitorIQ";

interface RobotsCache {
  disallowedPaths: string[];
  crawlDelay: number | null;
  fetchedAt: number;
}

const robotsCache = new Map<string, RobotsCache>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const lastRequestByDomain = new Map<string, number>();

const DOMAIN_DELAY_MS = parseInt(
  process.env.SCRAPE_DOMAIN_DELAY_MS ?? "2000",
  10
);

function parseRobotsTxt(text: string): {
  disallowedPaths: string[];
  crawlDelay: number | null;
} {
  const lines = text.split("\n").map((l) => l.trim());
  const disallowedPaths: string[] = [];
  let crawlDelay: number | null = null;
  let inRelevantBlock = false;
  let inWildcardBlock = false;

  for (const line of lines) {
    const lower = line.toLowerCase();

    if (lower.startsWith("user-agent:")) {
      const agent = line.slice("user-agent:".length).trim();
      if (agent.toLowerCase() === USER_AGENT_NAME.toLowerCase()) {
        inRelevantBlock = true;
        inWildcardBlock = false;
      } else if (agent === "*") {
        inWildcardBlock = !inRelevantBlock;
      } else {
        if (!inRelevantBlock) inWildcardBlock = false;
      }
      continue;
    }

    if (!inRelevantBlock && !inWildcardBlock) continue;

    if (lower.startsWith("disallow:")) {
      const path = line.slice("disallow:".length).trim();
      if (path) disallowedPaths.push(path);
    } else if (lower.startsWith("crawl-delay:")) {
      const val = parseFloat(line.slice("crawl-delay:".length).trim());
      if (!isNaN(val) && val > 0) crawlDelay = val;
    }
  }

  return { disallowedPaths, crawlDelay };
}

async function fetchRobotsTxt(origin: string): Promise<RobotsCache> {
  try {
    const response = await fetch(`${origin}/robots.txt`, {
      signal: AbortSignal.timeout(3000),
      headers: { "User-Agent": USER_AGENT_NAME },
    });

    if (!response.ok) {
      return { disallowedPaths: [], crawlDelay: null, fetchedAt: Date.now() };
    }

    const text = await response.text();
    const { disallowedPaths, crawlDelay } = parseRobotsTxt(text);
    return { disallowedPaths, crawlDelay, fetchedAt: Date.now() };
  } catch {
    // Fail open: if we can't fetch robots.txt, allow everything
    return { disallowedPaths: [], crawlDelay: null, fetchedAt: Date.now() };
  }
}

async function getCachedRobots(origin: string): Promise<RobotsCache> {
  const cached = robotsCache.get(origin);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached;
  }

  const fresh = await fetchRobotsTxt(origin);
  robotsCache.set(origin, fresh);
  return fresh;
}

export async function isAllowedByRobotsTxt(url: string): Promise<boolean> {
  const parsed = new URL(url);
  const robots = await getCachedRobots(parsed.origin);

  for (const disallowed of robots.disallowedPaths) {
    if (parsed.pathname.startsWith(disallowed)) {
      return false;
    }
  }

  return true;
}

export async function getCrawlDelay(url: string): Promise<number | null> {
  const parsed = new URL(url);
  const robots = await getCachedRobots(parsed.origin);
  return robots.crawlDelay;
}

export async function domainDelay(url: string): Promise<void> {
  const domain = new URL(url).hostname;
  const crawlDelay = await getCrawlDelay(url);
  const delayMs = Math.max(DOMAIN_DELAY_MS, (crawlDelay ?? 0) * 1000);

  const lastRequest = lastRequestByDomain.get(domain);
  if (lastRequest) {
    const elapsed = Date.now() - lastRequest;
    if (elapsed < delayMs) {
      await new Promise((resolve) => setTimeout(resolve, delayMs - elapsed));
    }
  }

  lastRequestByDomain.set(domain, Date.now());
}
