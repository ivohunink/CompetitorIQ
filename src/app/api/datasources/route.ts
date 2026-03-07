import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dataSources = await prisma.dataSource.findMany({
    include: {
      competitor: { select: { id: true, name: true, status: true } },
    },
    orderBy: [{ competitor: { name: "asc" } }, { type: "asc" }],
  });

  return NextResponse.json(dataSources);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { competitorId, url, type, cadence, scrapeEnabled } = body;

  if (!competitorId || !url || !type) {
    return NextResponse.json(
      { error: "competitorId, url, and type are required" },
      { status: 400 }
    );
  }

  const dataSource = await prisma.dataSource.create({
    data: {
      competitorId,
      url,
      type,
      cadence: cadence || "weekly",
      scrapeEnabled: scrapeEnabled ?? true,
    },
    include: {
      competitor: { select: { id: true, name: true, status: true } },
    },
  });

  return NextResponse.json(dataSource, { status: 201 });
}
