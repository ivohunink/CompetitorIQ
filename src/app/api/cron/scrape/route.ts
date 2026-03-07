import { NextRequest, NextResponse } from "next/server";
import { getDueCompetitors, scrapeCompetitor } from "@/lib/scraper/engine";

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

  // Process up to 3 competitors per cron run to stay within timeout
  const batch = dueCompetitors.slice(0, 3);
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

  return NextResponse.json({
    processed: results.length,
    remaining: dueCompetitors.length - batch.length,
    results,
  });
}
