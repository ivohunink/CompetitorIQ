import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { ids, data } = await req.json();

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "No category IDs provided" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};
  if (data.description !== undefined) updateData.description = data.description;
  if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No update fields provided" }, { status: 400 });
  }

  await prisma.category.updateMany({
    where: { id: { in: ids } },
    data: updateData,
  });

  return NextResponse.json({ success: true, updated: ids.length });
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { ids } = await req.json();

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "No category IDs provided" }, { status: 400 });
  }

  await prisma.category.deleteMany({
    where: { id: { in: ids } },
  });

  return NextResponse.json({ success: true, deleted: ids.length });
}
