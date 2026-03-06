import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, supportStatusIcon, formatDate } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";

export default async function FeatureDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const feature = await prisma.feature.findUnique({
    where: { id: params.id },
    include: {
      category: true,
      subcategory: true,
      coverages: {
        include: { competitor: true },
        orderBy: { competitor: { name: "asc" } },
      },
    },
  });

  if (!feature) notFound();

  const supported = feature.coverages.filter(
    (c) => c.status === "SUPPORTED"
  ).length;
  const total = feature.coverages.length;

  return (
    <>
      <div className="mb-4">
        <Link
          href="/matrix"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Matrix
        </Link>
      </div>

      <PageHeader
        title={feature.name}
        description={feature.description || undefined}
      />

      <div className="mb-4 flex items-center gap-2">
        {feature.category && (
          <Badge variant="info">{feature.category.name}</Badge>
        )}
        {feature.subcategory && (
          <Badge variant="default">{feature.subcategory.name}</Badge>
        )}
        {feature.isOwnProduct && <Badge variant="success">Own Product</Badge>}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">
              Competitor Coverage
            </h3>
            <span className="text-sm text-gray-500">
              {supported}/{total} competitors support this feature
            </span>
          </div>
        </CardHeader>
        <div className="divide-y divide-gray-100">
          {feature.coverages.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-gray-500">
              No coverage data yet. Add coverage from the Feature Matrix.
            </div>
          ) : (
            feature.coverages.map((cov) => {
              const statusColors: Record<string, string> = {
                SUPPORTED: "bg-green-50 text-green-700 border-green-200",
                PARTIAL: "bg-yellow-50 text-yellow-700 border-yellow-200",
                NOT_SUPPORTED: "bg-red-50 text-red-700 border-red-200",
                UNKNOWN: "bg-gray-50 text-gray-500 border-gray-200",
              };

              return (
                <div
                  key={cov.id}
                  className="flex items-center justify-between px-6 py-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-xs font-bold text-gray-600">
                      {cov.competitor.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <Link
                        href={`/competitors/${cov.competitor.id}`}
                        className="text-sm font-medium text-gray-900 hover:text-brand-600"
                      >
                        {cov.competitor.name}
                      </Link>
                      {cov.notes && (
                        <p className="text-xs text-gray-500">{cov.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {cov.evidenceUrl && (
                      <a
                        href={cov.evidenceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1"
                      >
                        Evidence <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium",
                        statusColors[cov.status]
                      )}
                    >
                      {supportStatusIcon(cov.status)}{" "}
                      {cov.status.replace("_", " ")}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatDate(cov.lastVerified)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </>
  );
}
