import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, supportStatusIcon, formatDate } from "@/lib/utils";
import Link from "next/link";
import { Globe, ExternalLink, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SourceManager } from "./source-manager";

export default async function CompetitorProfilePage({
  params,
}: {
  params: { id: string };
}) {
  const competitor = await prisma.competitor.findUnique({
    where: { id: params.id },
    include: {
      dataSources: true,
      featureCoverages: {
        where: { reviewStatus: "APPROVED" },
        include: {
          feature: { include: { category: true } },
        },
      },
    },
  });

  if (!competitor) notFound();

  // Group coverages by category
  const byCategory = new Map<string, typeof competitor.featureCoverages>();
  competitor.featureCoverages.forEach((cov) => {
    const catName = cov.feature.category?.name || "Uncategorized";
    if (!byCategory.has(catName)) byCategory.set(catName, []);
    byCategory.get(catName)!.push(cov);
  });

  const totalFeatures = competitor.featureCoverages.length;
  const supported = competitor.featureCoverages.filter(
    (c) => c.status === "SUPPORTED"
  ).length;
  const partial = competitor.featureCoverages.filter(
    (c) => c.status === "PARTIAL"
  ).length;

  return (
    <>
      <div className="mb-4">
        <Link
          href="/competitors"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Competitors
        </Link>
      </div>

      <PageHeader
        title={competitor.name}
        description={competitor.marketSegment || undefined}
        actions={
          competitor.websiteUrl ? (
            <a
              href={competitor.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="secondary" size="sm">
                <Globe className="mr-1.5 h-4 w-4" />
                Visit Website
                <ExternalLink className="ml-1.5 h-3 w-3" />
              </Button>
            </a>
          ) : undefined
        }
      />

      {/* Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{totalFeatures}</p>
            <p className="text-sm text-gray-500">Features Tracked</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{supported}</p>
            <p className="text-sm text-gray-500">Fully Supported</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-600">{partial}</p>
            <p className="text-sm text-gray-500">Partial Support</p>
          </CardContent>
        </Card>
      </div>

      {/* Features by Category */}
      <div className="space-y-4">
        {Array.from(byCategory.entries()).map(([catName, coverages]) => (
          <Card key={catName}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">{catName}</h3>
                <Badge variant="info">{coverages.length} features</Badge>
              </div>
            </CardHeader>
            <div className="divide-y divide-gray-100">
              {coverages.map((cov) => {
                const statusColors: Record<string, string> = {
                  SUPPORTED: "text-green-600 bg-green-50",
                  PARTIAL: "text-yellow-600 bg-yellow-50",
                  NOT_SUPPORTED: "text-red-600 bg-red-50",
                  UNKNOWN: "text-gray-400 bg-gray-50",
                };
                return (
                  <div
                    key={cov.id}
                    className="flex items-center justify-between px-6 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {cov.feature.name}
                      </p>
                      {cov.notes && (
                        <p className="text-xs text-gray-500">{cov.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
                          statusColors[cov.status]
                        )}
                      >
                        {supportStatusIcon(cov.status)} {cov.status.replace("_", " ").toLowerCase()}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatDate(cov.lastVerified)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ))}

        {byCategory.size === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-sm text-gray-500">
              No feature data for this competitor yet. Add coverage data in the
              Feature Matrix.
            </CardContent>
          </Card>
        )}
      </div>

      {/* Data Sources */}
      <div className="mt-6">
        <SourceManager
          competitorId={competitor.id}
          initialSources={JSON.parse(JSON.stringify(competitor.dataSources))}
        />
      </div>

      {/* Notes */}
      {competitor.notes && (
        <Card className="mt-6">
          <CardHeader>
            <h3 className="font-semibold text-gray-900">Notes</h3>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {competitor.notes}
            </p>
          </CardContent>
        </Card>
      )}
    </>
  );
}
