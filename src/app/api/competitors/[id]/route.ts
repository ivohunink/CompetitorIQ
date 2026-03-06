import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const competitor = await prisma.competitor.findUnique({
    where: { id: params.id },
    include: {
      dataSources: true,
      featureCoverages: {
        include: { feature: { include: { category: true } } },
      },
    },
  });

  if (!competitor) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(competitor);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user || user.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { name, websiteUrl, logoUrl, marketSegment, notes, status } = body;

  const competitor = await prisma.competitor.update({
    where: { id: params.id },
    data: { name, websiteUrl, logoUrl, marketSegment, notes, status },
    include: { dataSources: true },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "UPDATE",
      entityType: "Competitor",
      entityId: competitor.id,
      details: JSON.stringify(body),
    },
  });

  return NextResponse.json(competitor);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.competitor.delete({ where: { id: params.id } });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "DELETE",
      entityType: "Competitor",
      entityId: params.id,
    },
  });

  return NextResponse.json({ success: true });
}
