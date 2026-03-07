import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { fetchPage } from "@/lib/scraper/fetcher";
import { parseContent } from "@/lib/scraper/parsers";
import { discoverCategoryFeatures } from "@/lib/ai";
import { notifyFeatureChange } from "@/lib/notifications";

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user || user.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const categoryId = params.id;

  // Fetch the category
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: {
      features: { select: { name: true } },
    },
  });

  if (!category) {
    return NextResponse.json(
      { error: "Category not found" },
      { status: 404 }
    );
  }

  if (!category.description) {
    return NextResponse.json(
      { error: "Category needs a description to discover features. Edit the category and add a description of what it should cover." },
      { status: 400 }
    );
  }

  // Fetch all active competitors with enabled data sources
  const competitors = await prisma.competitor.findMany({
    where: {
      status: { in: ["ACTIVE", "MONITORING"] },
      dataSources: { some: { scrapeEnabled: true } },
    },
    include: {
      dataSources: { where: { scrapeEnabled: true } },
    },
  });

  if (competitors.length === 0) {
    return NextResponse.json(
      { error: "No active competitors with enabled data sources" },
      { status: 400 }
    );
  }

  // Scrape all competitor sources and aggregate content
  const scrapedContentByCompetitor: Array<{
    competitorName: string;
    competitorId: string;
    content: string;
  }> = [];

  let totalSourcesScraped = 0;
  let totalSourcesFailed = 0;

  for (const competitor of competitors) {
    const contentParts: string[] = [];

    for (const source of competitor.dataSources) {
      const startTime = Date.now();
      try {
        const page = await fetchPage(source.url);
        const duration = Date.now() - startTime;

        if (!page.success) {
          totalSourcesFailed++;
          await prisma.scrapeLog.create({
            data: {
              competitorId: competitor.id,
              competitorName: competitor.name,
              sourceUrl: source.url,
              sourceType: source.type,
              status: "failed",
              error: page.error || "Fetch failed",
              duration,
            },
          });
          continue;
        }

        const parsed = parseContent(page.html, source.url, source.type);
        if (parsed.length > 50) {
          contentParts.push(parsed);
          totalSourcesScraped++;
          await prisma.scrapeLog.create({
            data: {
              competitorId: competitor.id,
              competitorName: competitor.name,
              sourceUrl: source.url,
              sourceType: source.type,
              status: "success",
              contentLength: parsed.length,
              duration,
            },
          });
        } else {
          totalSourcesFailed++;
          await prisma.scrapeLog.create({
            data: {
              competitorId: competitor.id,
              competitorName: competitor.name,
              sourceUrl: source.url,
              sourceType: source.type,
              status: "no_content",
              contentLength: parsed.length,
              duration,
            },
          });
        }

        await prisma.dataSource.update({
          where: { id: source.id },
          data: { lastScraped: new Date() },
        });
      } catch (error) {
        const duration = Date.now() - startTime;
        totalSourcesFailed++;
        await prisma.scrapeLog.create({
          data: {
            competitorId: competitor.id,
            competitorName: competitor.name,
            sourceUrl: source.url,
            sourceType: source.type,
            status: "failed",
            error:
              error instanceof Error ? error.message : "Unknown error",
            duration,
          },
        });
      }
    }

    if (contentParts.length > 0) {
      scrapedContentByCompetitor.push({
        competitorName: competitor.name,
        competitorId: competitor.id,
        content: contentParts.join("\n\n"),
      });
    }
  }

  if (scrapedContentByCompetitor.length === 0) {
    return NextResponse.json(
      {
        error: "Could not scrape content from any competitor source",
        sourcesScraped: totalSourcesScraped,
        sourcesFailed: totalSourcesFailed,
      },
      { status: 500 }
    );
  }

  // Run AI discovery
  const existingFeatureNames = category.features.map((f) => f.name);
  const discoveredFeatures = await discoverCategoryFeatures(
    category.name,
    category.description,
    scrapedContentByCompetitor,
    existingFeatureNames
  );

  // Build a map of competitor name -> id
  const competitorNameToId = new Map(
    competitors.map((c) => [c.name, c.id])
  );

  // Create features and coverage records
  let featuresCreated = 0;
  let coveragesCreated = 0;
  const createdFeatures: Array<{ name: string; description: string; competitorCount: number }> = [];

  for (const discovered of discoveredFeatures) {
    try {
      const feature = await prisma.feature.create({
        data: {
          name: discovered.name,
          description: discovered.description,
          categoryId,
        },
      });
      featuresCreated++;

      let competitorCount = 0;
      for (const comp of discovered.competitors) {
        const compId = competitorNameToId.get(comp.name);
        if (!compId) continue;

        try {
          await prisma.featureCoverage.create({
            data: {
              featureId: feature.id,
              competitorId: compId,
              status: comp.status,
              confidence: comp.confidence,
              notes: comp.evidence,
              reviewStatus: "PENDING",
              lastVerified: new Date(),
            },
          });
          coveragesCreated++;
          competitorCount++;
        } catch {
          // Skip duplicate coverage entries
        }
      }

      createdFeatures.push({
        name: discovered.name,
        description: discovered.description,
        competitorCount,
      });
    } catch {
      // Skip if feature name already exists or other error
    }
  }

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "CREATE",
      entityType: "CategoryDiscover",
      entityId: categoryId,
      details: JSON.stringify({
        categoryName: category.name,
        sourcesScraped: totalSourcesScraped,
        sourcesFailed: totalSourcesFailed,
        featuresCreated,
        coveragesCreated,
      }),
    },
  });

  // Notifications
  if (featuresCreated > 0) {
    try {
      await notifyFeatureChange(
        `Category: ${category.name}`,
        categoryId,
        coveragesCreated,
        featuresCreated
      );
    } catch {
      // Non-critical
    }
  }

  return NextResponse.json({
    categoryName: category.name,
    sourcesScraped: totalSourcesScraped,
    sourcesFailed: totalSourcesFailed,
    featuresCreated,
    coveragesCreated,
    features: createdFeatures,
  });
}
