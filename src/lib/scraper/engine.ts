import { prisma } from "@/lib/db";
import { fetchPage } from "./fetcher";
import { parseContent } from "./parsers";
import { extractFeatureCoverage } from "./extractor";
import { notifyFeatureChange } from "@/lib/notifications";

export interface ScrapeResult {
  competitorId: string;
  competitorName: string;
  sourcesScraped: number;
  sourcesFailed: number;
  featuresUpdated: number;
  newFeaturesFound: number;
  errors: string[];
}

export async function scrapeCompetitor(
  competitorId: string
): Promise<ScrapeResult> {
  const competitor = await prisma.competitor.findUnique({
    where: { id: competitorId },
    include: {
      dataSources: { where: { scrapeEnabled: true } },
    },
  });

  if (!competitor) {
    throw new Error(`Competitor ${competitorId} not found`);
  }

  const result: ScrapeResult = {
    competitorId,
    competitorName: competitor.name,
    sourcesScraped: 0,
    sourcesFailed: 0,
    featuresUpdated: 0,
    newFeaturesFound: 0,
    errors: [],
  };

  if (competitor.dataSources.length === 0) {
    result.errors.push("No enabled data sources");
    return result;
  }

  // Fetch all known features for matching
  const features = await prisma.feature.findMany({
    select: { id: true, name: true },
  });
  const featureNameToId = new Map(features.map((f) => [f.name, f.id]));
  const knownFeatureNames = features.map((f) => f.name);

  // Scrape each data source and aggregate content
  const allContent: string[] = [];
  const successLogIds: string[] = [];

  for (const source of competitor.dataSources) {
    const startTime = Date.now();
    try {
      const page = await fetchPage(source.url);
      const duration = Date.now() - startTime;

      if (!page.success) {
        result.sourcesFailed++;
        result.errors.push(`Failed to fetch ${source.url}: ${page.error}`);
        await prisma.scrapeLog.create({
          data: {
            competitorId,
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
        allContent.push(`[Source: ${source.type} - ${source.url}]\n${parsed}`);
        result.sourcesScraped++;
        const log = await prisma.scrapeLog.create({
          data: {
            competitorId,
            competitorName: competitor.name,
            sourceUrl: source.url,
            sourceType: source.type,
            status: "success",
            contentLength: parsed.length,
            duration,
          },
        });
        successLogIds.push(log.id);
      } else {
        result.sourcesFailed++;
        result.errors.push(`No meaningful content from ${source.url}`);
        await prisma.scrapeLog.create({
          data: {
            competitorId,
            competitorName: competitor.name,
            sourceUrl: source.url,
            sourceType: source.type,
            status: "no_content",
            contentLength: parsed.length,
            duration,
          },
        });
      }

      // Update lastScraped timestamp
      await prisma.dataSource.update({
        where: { id: source.id },
        data: { lastScraped: new Date() },
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      result.sourcesFailed++;
      result.errors.push(`Error scraping ${source.url}: ${errorMsg}`);
      await prisma.scrapeLog.create({
        data: {
          competitorId,
          competitorName: competitor.name,
          sourceUrl: source.url,
          sourceType: source.type,
          status: "failed",
          error: errorMsg,
          duration,
        },
      });
    }
  }

  if (allContent.length === 0) {
    result.errors.push("No content extracted from any source");
    return result;
  }

  // Run AI extraction on combined content
  const combinedText = allContent.join("\n\n---\n\n");
  const sourceUrls = competitor.dataSources.map((s) => s.url).join(", ");

  const extraction = await extractFeatureCoverage(
    combinedText,
    competitor.name,
    knownFeatureNames,
    sourceUrls
  );

  // Update successful logs with feature counts
  if (successLogIds.length > 0) {
    await prisma.scrapeLog.updateMany({
      where: { id: { in: successLogIds } },
      data: {
        featuresFound: extraction.knownFeatures.length,
        newFeatures: extraction.newFeatures.length,
      },
    });
  }

  // Upsert feature coverages with PENDING review status
  for (const fc of extraction.knownFeatures) {
    const featureId = featureNameToId.get(fc.featureName);
    if (!featureId) continue;

    try {
      await prisma.featureCoverage.upsert({
        where: {
          featureId_competitorId: {
            featureId,
            competitorId: competitor.id,
          },
        },
        create: {
          featureId,
          competitorId: competitor.id,
          status: fc.status,
          confidence: fc.confidence,
          evidenceUrl: sourceUrls,
          notes: fc.evidence,
          reviewStatus: "PENDING",
          lastVerified: new Date(),
        },
        update: {
          status: fc.status,
          confidence: fc.confidence,
          evidenceUrl: sourceUrls,
          notes: fc.evidence,
          reviewStatus: "PENDING",
          lastVerified: new Date(),
        },
      });
      result.featuresUpdated++;
    } catch (error) {
      result.errors.push(
        `Failed to upsert coverage for ${fc.featureName}: ${error instanceof Error ? error.message : "Unknown"}`
      );
    }
  }

  result.newFeaturesFound = extraction.newFeatures.length;

  // Log new features as audit entries (don't auto-create, flag for review)
  if (extraction.newFeatures.length > 0) {
    console.log(
      `[Scraper] New features found for ${competitor.name}:`,
      extraction.newFeatures.map((f) => f.name)
    );
  }

  // Send in-app notifications
  if (result.featuresUpdated > 0 || result.newFeaturesFound > 0) {
    try {
      await notifyFeatureChange(
        competitor.name,
        competitor.id,
        result.featuresUpdated,
        result.newFeaturesFound
      );
    } catch (error) {
      console.error("Failed to send notifications:", error);
    }
  }

  return result;
}

export async function getDueCompetitors(): Promise<
  Array<{ id: string; name: string }>
> {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Find competitors with data sources that are due for scraping
  const competitors = await prisma.competitor.findMany({
    where: {
      status: { in: ["ACTIVE", "MONITORING"] },
      dataSources: {
        some: {
          scrapeEnabled: true,
          OR: [
            // Daily sources not scraped in 24h
            {
              cadence: "daily",
              OR: [
                { lastScraped: null },
                { lastScraped: { lt: oneDayAgo } },
              ],
            },
            // Weekly sources not scraped in 7 days
            {
              cadence: "weekly",
              OR: [
                { lastScraped: null },
                { lastScraped: { lt: oneWeekAgo } },
              ],
            },
          ],
        },
      },
    },
    select: { id: true, name: true },
  });

  return competitors;
}
