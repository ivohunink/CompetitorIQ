import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { CompetitorsClient } from "./competitors-client";
import { getCurrentUser } from "@/lib/auth";

export default async function CompetitorsPage() {
  const user = await getCurrentUser();
  const competitors = await prisma.competitor.findMany({
    include: {
      dataSources: true,
      _count: { select: { featureCoverages: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <PageHeader
        title="Competitors"
        description="Track and manage your competitive landscape."
      />
      <CompetitorsClient
        competitors={JSON.parse(JSON.stringify(competitors))}
        userRole={user!.role}
      />
    </>
  );
}
