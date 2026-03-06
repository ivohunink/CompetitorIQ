import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const competitors = await prisma.competitor.findMany({
    where: status ? { status: status as any } : undefined,
    include: {
      dataSources: true,
      _count: { select: { featureCoverages: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(competitors);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { name, websiteUrl, logoUrl, marketSegment, notes, status, dataSources } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const competitor = await prisma.competitor.create({
    data: {
      name,
      websiteUrl,
      logoUrl,
      marketSegment,
      notes,
      status: status || "ACTIVE",
      dataSources: dataSources?.length
        ? {
            create: dataSources.map((ds: { url: string; type: string }) => ({
              url: ds.url,
              type: ds.type,
            })),
          }
        : undefined,
    },
    include: { dataSources: true },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "CREATE",
      entityType: "Competitor",
      entityId: competitor.id,
      details: JSON.stringify({ name }),
    },
  });

  return NextResponse.json(competitor, { status: 201 });
}
