import { NextRequest, NextResponse } from "next/server";
import { getDueCompetitors, scrapeCompetitor } from "@/lib/scraper/engine";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dueCompetitors = await getDueCompetitors();

  if (dueCompetitors.length === 0) {
    return NextResponse.json({ message: "No competitors due for scraping" });
  }

  // Process competitors per cron run (configurable, default 5)
  const batchSize = parseInt(process.env.SCRAPE_BATCH_SIZE ?? "5", 10);
  const batch = dueCompetitors.slice(0, batchSize);
  const results = [];

  for (const competitor of batch) {
    try {
      const result = await scrapeCompetitor(competitor.id);
      results.push(result);
    } catch (error) {
      results.push({
        competitorId: competitor.id,
        competitorName: competitor.name,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Clean up scrape runs older than 30 days (cascades to ScrapePageContent and ScrapeFeatureResult)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  await prisma.scrapeRun.deleteMany({
    where: { createdAt: { lt: thirtyDaysAgo } },
  });

  // Clean up scrape logs older than 30 days
  await prisma.scrapeLog.deleteMany({
    where: { createdAt: { lt: thirtyDaysAgo } },
  });

  return NextResponse.json({
    processed: results.length,
    remaining: dueCompetitors.length - batch.length,
    results,
  });
}
