import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const feature = await prisma.feature.findUnique({
    where: { id: params.id },
    include: {
      category: true,
      subcategory: true,
      coverages: {
        include: { competitor: true },
      },
    },
  });

  if (!feature) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(feature);
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
  const { name, description, categoryId, subcategoryId } = body;

  const feature = await prisma.feature.update({
    where: { id: params.id },
    data: { name, description, categoryId, subcategoryId },
    include: { category: true, subcategory: true },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "UPDATE",
      entityType: "Feature",
      entityId: feature.id,
      details: JSON.stringify(body),
    },
  });

  return NextResponse.json(feature);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user || user.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.feature.delete({ where: { id: params.id } });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "DELETE",
      entityType: "Feature",
      entityId: params.id,
    },
  });

  return NextResponse.json({ success: true });
}
