import { prisma } from "@/lib/db";
import { fetchPage, computeContentHash } from "./fetcher";
import { parseContent } from "./parsers";
import { extractFeatureCoverage } from "./extractor";
import { notifyFeatureChange } from "@/lib/notifications";
import { isAllowedByRobotsTxt, domainDelay } from "./politeness";
import { discoverLinks } from "./crawler";

export interface ScrapeResult {
  competitorId: string;
  competitorName: string;
  sourcesScraped: number;
  sourcesFailed: number;
  featuresUpdated: number;
  newFeaturesFound: number;
  errors: string[];
  runId: string;
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

  const runStartTime = Date.now();

  // Create the scrape run record
  const scrapeRun = await prisma.scrapeRun.create({
    data: {
      competitorId,
      competitorName: competitor.name,
      status: "running",
    },
  });

  const result: ScrapeResult = {
    competitorId,
    competitorName: competitor.name,
    sourcesScraped: 0,
    sourcesFailed: 0,
    featuresUpdated: 0,
    newFeaturesFound: 0,
    errors: [],
    runId: scrapeRun.id,
  };

  try {
    if (competitor.dataSources.length === 0) {
      result.errors.push("No enabled data sources");
      await finalizeRun(scrapeRun.id, result, runStartTime);
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
        // Check robots.txt before fetching
        const allowed = await isAllowedByRobotsTxt(source.url);
        if (!allowed) {
          result.errors.push(`Blocked by robots.txt: ${source.url}`);
          await prisma.scrapeLog.create({
            data: {
              competitorId,
              competitorName: competitor.name,
              sourceUrl: source.url,
              sourceType: source.type,
              status: "blocked_robots",
              duration: Date.now() - startTime,
              runId: scrapeRun.id,
            },
          });
          continue;
        }

        // Per-domain rate limiting
        await domainDelay(source.url);

        const page = await fetchPage(source.url, {
          etag: source.lastEtag ?? undefined,
          lastModified: source.lastModified ?? undefined,
        });
        const duration = Date.now() - startTime;

        // Handle 304 Not Modified
        if (page.unchanged) {
          result.sourcesScraped++;
          await prisma.scrapeLog.create({
            data: {
              competitorId,
              competitorName: competitor.name,
              sourceUrl: source.url,
              sourceType: source.type,
              status: "unchanged_304",
              duration,
              runId: scrapeRun.id,
            },
          });
          await prisma.dataSource.update({
            where: { id: source.id },
            data: { lastScraped: new Date() },
          });
          continue;
        }

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
              runId: scrapeRun.id,
            },
          });
          continue;
        }

        // Parse parent page
        const parsed = parseContent(page.html, source.url, source.type);

        // Depth-2 crawling: discover and fetch child pages
        const childLinks = discoverLinks(page.html, source.url);
        const childTexts: string[] = [];

        for (const childUrl of childLinks) {
          const childAllowed = await isAllowedByRobotsTxt(childUrl);
          if (!childAllowed) continue;

          await domainDelay(childUrl);

          try {
            const childPage = await fetchPage(childUrl);
            if (childPage.success && !childPage.unchanged) {
              const childParsed = parseContent(
                childPage.html,
                childUrl,
                source.type
              );
              if (childParsed.length > 50) {
                childTexts.push(
                  `[Source: ${source.type} - ${childUrl}]\n${childParsed}`
                );
              }
            }
          } catch {
            // Skip failed child pages silently — parent page is the priority
          }
        }

        // Combine parent + child content
        const combinedSourceText = [
          parsed.length > 50
            ? `[Source: ${source.type} - ${source.url}]\n${parsed}`
            : "",
          ...childTexts,
        ]
          .filter(Boolean)
          .join("\n\n");

        // Content hash comparison — skip AI if nothing changed
        const newHash = computeContentHash(combinedSourceText);
        if (
          combinedSourceText.length > 50 &&
          newHash === source.contentHash
        ) {
          result.sourcesScraped++;
          await prisma.scrapeLog.create({
            data: {
              competitorId,
              competitorName: competitor.name,
              sourceUrl: source.url,
              sourceType: source.type,
              status: "unchanged_hash",
              contentLength: combinedSourceText.length,
              duration: Date.now() - startTime,
              runId: scrapeRun.id,
            },
          });
          await prisma.dataSource.update({
            where: { id: source.id },
            data: {
              lastScraped: new Date(),
              lastEtag: page.etag ?? source.lastEtag,
              lastModified: page.lastModified ?? source.lastModified,
            },
          });
          continue;
        }

        if (combinedSourceText.length > 50) {
          allContent.push(combinedSourceText);
          result.sourcesScraped++;
          const log = await prisma.scrapeLog.create({
            data: {
              competitorId,
              competitorName: competitor.name,
              sourceUrl: source.url,
              sourceType: source.type,
              status: "success",
              contentLength: combinedSourceText.length,
              duration: Date.now() - startTime,
              runId: scrapeRun.id,
            },
          });
          successLogIds.push(log.id);

          // Store the full parsed text for this source (parent + children)
          await prisma.scrapePageContent.create({
            data: {
              scrapeLogId: log.id,
              rawText: combinedSourceText,
            },
          });
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
              contentLength: combinedSourceText.length,
              duration: Date.now() - startTime,
              runId: scrapeRun.id,
            },
          });
        }

        // Update lastScraped and cache headers
        await prisma.dataSource.update({
          where: { id: source.id },
          data: {
            lastScraped: new Date(),
            contentHash: newHash,
            lastEtag: page.etag ?? null,
            lastModified: page.lastModified ?? null,
          },
        });
      } catch (error) {
        const duration = Date.now() - startTime;
        const errorMsg =
          error instanceof Error ? error.message : "Unknown error";
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
            runId: scrapeRun.id,
          },
        });
      }
    }

    if (allContent.length === 0) {
      result.errors.push("No content extracted from any source");
      await finalizeRun(scrapeRun.id, result, runStartTime);
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

    // Store per-feature extraction results
    const featureResults = [
      ...extraction.knownFeatures.map((fc) => ({
        scrapeRunId: scrapeRun.id,
        featureName: fc.featureName,
        featureId: featureNameToId.get(fc.featureName) || null,
        isNew: false,
        status: fc.status,
        confidence: fc.confidence,
        evidence: fc.evidence,
        sourceUrl: fc.sourceUrl || null,
        sourceType: null as string | null,
      })),
      ...extraction.newFeatures.map((nf) => ({
        scrapeRunId: scrapeRun.id,
        featureName: nf.name,
        featureId: null as string | null,
        isNew: true,
        status: null as string | null,
        confidence: nf.confidence,
        evidence: nf.description,
        sourceUrl: nf.sourceUrl || null,
        sourceType: null as string | null,
      })),
    ];

    if (featureResults.length > 0) {
      await prisma.scrapeFeatureResult.createMany({ data: featureResults });
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

    await finalizeRun(scrapeRun.id, result, runStartTime);
    return result;
  } catch (error) {
    // Mark run as failed on unhandled exceptions
    const errorMsg =
      error instanceof Error ? error.message : "Unknown error";
    result.errors.push(errorMsg);
    await prisma.scrapeRun.update({
      where: { id: scrapeRun.id },
      data: {
        status: "failed",
        totalDuration: Date.now() - runStartTime,
        errors: JSON.stringify(result.errors),
        completedAt: new Date(),
      },
    });
    throw error;
  }
}

async function finalizeRun(
  runId: string,
  result: ScrapeResult,
  runStartTime: number
) {
  await prisma.scrapeRun.update({
    where: { id: runId },
    data: {
      status:
        result.sourcesFailed > 0 && result.sourcesScraped === 0
          ? "failed"
          : "completed",
      sourcesScraped: result.sourcesScraped,
      sourcesFailed: result.sourcesFailed,
      featuresFound: result.featuresUpdated,
      newFeatures: result.newFeaturesFound,
      totalDuration: Date.now() - runStartTime,
      errors:
        result.errors.length > 0 ? JSON.stringify(result.errors) : null,
      completedAt: new Date(),
    },
  });
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
      status: "ACTIVE",
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
