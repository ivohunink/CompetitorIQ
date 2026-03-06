import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { featureId, competitorId, status, evidenceUrl, notes } = body;

  if (!featureId || !competitorId) {
    return NextResponse.json(
      { error: "featureId and competitorId are required" },
      { status: 400 }
    );
  }

  const coverage = await prisma.featureCoverage.upsert({
    where: {
      featureId_competitorId: { featureId, competitorId },
    },
    create: {
      featureId,
      competitorId,
      status: status || "UNKNOWN",
      evidenceUrl,
      notes,
      lastVerified: new Date(),
    },
    update: {
      status: status || undefined,
      evidenceUrl,
      notes,
      lastVerified: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "UPDATE",
      entityType: "FeatureCoverage",
      entityId: coverage.id,
      details: JSON.stringify({ featureId, competitorId, status }),
    },
  });

  return NextResponse.json(coverage);
}
