import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { scrapeCompetitor } from "@/lib/scraper/engine";

export async function POST(
  _request: NextRequest,
  { params }: { params: { competitorId: string } }
) {
  const user = await getCurrentUser();
  if (!user || user.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { competitorId } = params;

  // Verify competitor exists
  const competitor = await prisma.competitor.findUnique({
    where: { id: competitorId },
    select: { id: true, name: true },
  });

  if (!competitor) {
    return NextResponse.json(
      { error: "Competitor not found" },
      { status: 404 }
    );
  }

  try {
    const result = await scrapeCompetitor(competitorId);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "CREATE",
        entityType: "Scrape",
        entityId: competitorId,
        details: JSON.stringify({
          sourcesScraped: result.sourcesScraped,
          sourcesFailed: result.sourcesFailed,
          featuresUpdated: result.featuresUpdated,
          newFeaturesFound: result.newFeaturesFound,
          errors: result.errors,
        }),
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error(`Scrape failed for ${competitorId}:`, error);
    return NextResponse.json(
      {
        error: "Scrape failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
