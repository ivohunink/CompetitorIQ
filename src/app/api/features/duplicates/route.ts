import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { detectDuplicates } from "@/lib/duplicates";
import { notifyDuplicatesFound } from "@/lib/notifications";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "PENDING";
  const categoryId = searchParams.get("categoryId");

  const where: Record<string, unknown> = { status };

  if (categoryId) {
    where.OR = [
      { featureA: { categoryId } },
      { featureB: { categoryId } },
    ];
  }

  const duplicates = await prisma.featureDuplicate.findMany({
    where,
    include: {
      featureA: { include: { category: true } },
      featureB: { include: { category: true } },
      resolver: { select: { id: true, name: true } },
    },
    orderBy: { similarity: "desc" },
  });

  return NextResponse.json(duplicates);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const categoryId = body.categoryId as string | undefined;

  const result = await detectDuplicates(categoryId);

  if (result.newDuplicates > 0) {
    try {
      await notifyDuplicatesFound(result.newDuplicates);
    } catch {
      // Non-critical
    }
  }

  return NextResponse.json({
    newDuplicates: result.newDuplicates,
    message: result.newDuplicates > 0
      ? `Found ${result.newDuplicates} potential duplicate(s).`
      : "No new duplicates found.",
  });
}
