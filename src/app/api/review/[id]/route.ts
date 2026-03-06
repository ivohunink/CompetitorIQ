import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user || user.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { reviewStatus } = await req.json();

  const coverage = await prisma.featureCoverage.update({
    where: { id: params.id },
    data: { reviewStatus },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "UPDATE",
      entityType: "FeatureCoverage",
      entityId: coverage.id,
      details: JSON.stringify({ reviewStatus }),
    },
  });

  return NextResponse.json(coverage);
}
