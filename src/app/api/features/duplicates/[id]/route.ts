import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user || user.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { status } = body;

  if (!["CONFIRMED", "DISMISSED"].includes(status)) {
    return NextResponse.json(
      { error: "Status must be CONFIRMED or DISMISSED" },
      { status: 400 }
    );
  }

  const duplicate = await prisma.featureDuplicate.findUnique({
    where: { id: params.id },
  });

  if (!duplicate) {
    return NextResponse.json(
      { error: "Duplicate not found" },
      { status: 404 }
    );
  }

  const updated = await prisma.featureDuplicate.update({
    where: { id: params.id },
    data: {
      status,
      resolvedAt: new Date(),
      resolvedBy: user.id,
    },
    include: {
      featureA: true,
      featureB: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "UPDATE",
      entityType: "FeatureDuplicate",
      entityId: params.id,
      details: JSON.stringify({
        status,
        featureA: updated.featureA.name,
        featureB: updated.featureB.name,
      }),
    },
  });

  return NextResponse.json(updated);
}
