import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const pending = await prisma.featureCoverage.findMany({
    where: { reviewStatus: "PENDING" },
    include: {
      feature: { include: { category: true } },
      competitor: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(pending);
}
