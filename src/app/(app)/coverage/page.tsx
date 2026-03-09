import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FolderTree } from "lucide-react";

export default async function FeatureCoveragePage() {
  const categories = await prisma.category.findMany({
    include: {
      subcategories: {
        include: { _count: { select: { features: true } } },
      },
      features: {
        include: {
          coverages: {
            where: { reviewStatus: "APPROVED" },
            select: { competitorId: true, status: true, confidence: true },
          },
        },
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  const competitors = await prisma.competitor.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true },
  });

  return (
    <>
      <PageHeader
        title="Feature Coverage"
        description="Feature categories with coverage overview per competitor."
      />

      {categories.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-gray-500">
            No categories yet. Categories are auto-created when you add features
            with AI categorization.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => {
            const totalFeatures = cat.features.length;

            const competitorCoverage = competitors.map((comp) => {
              const supportedFeatures = cat.features.filter((f) =>
                f.coverages.some(
                  (c) =>
                    c.competitorId === comp.id &&
                    (c.status === "SUPPORTED" || c.status === "PARTIAL")
                )
              );
              const supported = supportedFeatures.length;
              const pct =
                totalFeatures > 0
                  ? Math.round((supported / totalFeatures) * 100)
                  : 0;

              // Tally confidence levels across supported coverages
              const confidenceCounts = { HIGH: 0, MEDIUM: 0, LOW: 0, NONE: 0 };
              for (const f of supportedFeatures) {
                const cov = f.coverages.find(
                  (c) =>
                    c.competitorId === comp.id &&
                    (c.status === "SUPPORTED" || c.status === "PARTIAL")
                );
                if (cov) {
                  const key = cov.confidence as keyof typeof confidenceCounts;
                  if (key && key in confidenceCounts) {
                    confidenceCounts[key]++;
                  } else {
                    confidenceCounts.NONE++;
                  }
                }
              }

              return { name: comp.name, pct, confidenceCounts };
            });

            return (
              <Card
                key={cat.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardContent>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                      <FolderTree className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {cat.name}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {totalFeatures} features
                      </p>
                    </div>
                  </div>

                  {cat.description && (
                    <p className="text-xs text-gray-500 mb-3">
                      {cat.description}
                    </p>
                  )}

                  {competitorCoverage.length > 0 && totalFeatures > 0 && (
                    <div className="space-y-2">
                      {competitorCoverage.slice(0, 5).map((cc) => (
                        <div key={cc.name} className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 w-20 truncate">
                            {cc.name}
                          </span>
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-brand-500 rounded-full transition-all"
                              style={{ width: `${cc.pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 w-8 text-right">
                            {cc.pct}%
                          </span>
                          <span className="flex items-center gap-0.5">
                            {cc.confidenceCounts.HIGH > 0 && (
                              <span
                                className="inline-block h-1.5 w-1.5 rounded-full bg-green-500"
                                title={`${cc.confidenceCounts.HIGH} high confidence`}
                              />
                            )}
                            {cc.confidenceCounts.MEDIUM > 0 && (
                              <span
                                className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400"
                                title={`${cc.confidenceCounts.MEDIUM} medium confidence`}
                              />
                            )}
                            {cc.confidenceCounts.LOW > 0 && (
                              <span
                                className="inline-block h-1.5 w-1.5 rounded-full bg-red-500"
                                title={`${cc.confidenceCounts.LOW} low confidence`}
                              />
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {cat.subcategories.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {cat.subcategories.map((sub) => (
                        <Badge key={sub.id} variant="default">
                          {sub.name} ({sub._count.features})
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
