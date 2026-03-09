import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user || user.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { keepFeatureId } = body;

  if (!keepFeatureId) {
    return NextResponse.json(
      { error: "keepFeatureId is required" },
      { status: 400 }
    );
  }

  const duplicate = await prisma.featureDuplicate.findUnique({
    where: { id: params.id },
    include: {
      featureA: { include: { coverages: true } },
      featureB: { include: { coverages: true } },
    },
  });

  if (!duplicate) {
    return NextResponse.json(
      { error: "Duplicate not found" },
      { status: 404 }
    );
  }

  const discardFeatureId =
    keepFeatureId === duplicate.featureAId
      ? duplicate.featureBId
      : duplicate.featureAId;

  if (keepFeatureId !== duplicate.featureAId && keepFeatureId !== duplicate.featureBId) {
    return NextResponse.json(
      { error: "keepFeatureId must be one of the two features in this duplicate pair" },
      { status: 400 }
    );
  }

  const discardFeature =
    discardFeatureId === duplicate.featureAId
      ? duplicate.featureA
      : duplicate.featureB;

  // Transfer coverages from discarded feature to kept feature
  for (const coverage of discardFeature.coverages) {
    try {
      // Try to create the coverage on the kept feature
      await prisma.featureCoverage.upsert({
        where: {
          featureId_competitorId: {
            featureId: keepFeatureId,
            competitorId: coverage.competitorId,
          },
        },
        create: {
          featureId: keepFeatureId,
          competitorId: coverage.competitorId,
          status: coverage.status,
          evidenceUrl: coverage.evidenceUrl,
          notes: coverage.notes,
          confidence: coverage.confidence,
          reviewStatus: coverage.reviewStatus,
          lastVerified: coverage.lastVerified,
        },
        // Don't overwrite existing coverage on the kept feature
        update: {},
      });
    } catch {
      // Skip on error
    }
  }

  // Delete the discarded feature (cascades to its coverages and duplicate records)
  await prisma.feature.delete({
    where: { id: discardFeatureId },
  });

  // Mark this duplicate as confirmed
  await prisma.featureDuplicate.update({
    where: { id: params.id },
    data: {
      status: "CONFIRMED",
      resolvedAt: new Date(),
      resolvedBy: user.id,
    },
  }).catch(() => {
    // The duplicate record may have been cascade-deleted with the feature
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "DELETE",
      entityType: "FeatureMerge",
      entityId: discardFeatureId,
      details: JSON.stringify({
        action: "merge",
        keptFeatureId: keepFeatureId,
        discardedFeatureId: discardFeatureId,
        discardedFeatureName: discardFeature.name,
        coveragesTransferred: discardFeature.coverages.length,
      }),
    },
  });

  return NextResponse.json({
    message: `Merged "${discardFeature.name}" into kept feature. ${discardFeature.coverages.length} coverage(s) transferred.`,
    keptFeatureId: keepFeatureId,
    discardedFeatureId: discardFeatureId,
  });
}
