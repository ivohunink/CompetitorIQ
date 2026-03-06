import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { FeatureMatrixClient } from "./matrix-client";

export default async function MatrixPage() {
  const user = await getCurrentUser();

  const [features, competitors, categories] = await Promise.all([
    prisma.feature.findMany({
      include: {
        category: true,
        subcategory: true,
        coverages: {
          where: { reviewStatus: "APPROVED" },
          include: { competitor: true },
        },
      },
      orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
    }),
    prisma.competitor.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
    }),
    prisma.category.findMany({
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Feature Coverage Matrix"
        description="Compare feature support across all tracked competitors."
      />
      <FeatureMatrixClient
        features={JSON.parse(JSON.stringify(features))}
        competitors={JSON.parse(JSON.stringify(competitors))}
        categories={JSON.parse(JSON.stringify(categories))}
        userRole={user!.role}
      />
    </>
  );
}
