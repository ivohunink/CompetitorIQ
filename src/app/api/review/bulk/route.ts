import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { ids, reviewStatus } = await req.json();

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "No IDs provided" }, { status: 400 });
  }

  if (reviewStatus !== "APPROVED" && reviewStatus !== "REJECTED") {
    return NextResponse.json({ error: "Invalid review status" }, { status: 400 });
  }

  await prisma.featureCoverage.updateMany({
    where: { id: { in: ids }, reviewStatus: "PENDING" },
    data: { reviewStatus },
  });

  // Create audit log entries for each item
  await prisma.auditLog.createMany({
    data: ids.map((id: string) => ({
      userId: user.id,
      action: "UPDATE" as const,
      entityType: "FeatureCoverage",
      entityId: id,
      details: JSON.stringify({ reviewStatus, bulk: true }),
    })),
  });

  return NextResponse.json({ success: true, updated: ids.length });
}
