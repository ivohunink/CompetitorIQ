import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { FolderTree } from "lucide-react";

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    include: {
      subcategories: {
        include: { _count: { select: { features: true } } },
      },
      features: {
        include: {
          coverages: {
            where: { reviewStatus: "APPROVED" },
            select: { competitorId: true, status: true },
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
        title="Categories"
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

            // Calculate per-competitor coverage
            const competitorCoverage = competitors.map((comp) => {
              const supported = cat.features.filter((f) =>
                f.coverages.some(
                  (c) =>
                    c.competitorId === comp.id &&
                    (c.status === "SUPPORTED" || c.status === "PARTIAL")
                )
              ).length;
              const pct =
                totalFeatures > 0
                  ? Math.round((supported / totalFeatures) * 100)
                  : 0;
              return { name: comp.name, pct };
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

                  {/* Competitor coverage bars */}
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
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Subcategories */}
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
