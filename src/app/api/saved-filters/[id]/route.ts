import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, filters } = await req.json();

  const saved = await prisma.savedFilter.updateMany({
    where: { id: params.id, userId: user.id },
    data: {
      ...(name !== undefined && { name }),
      ...(filters !== undefined && { filters: JSON.stringify(filters) }),
    },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.savedFilter.deleteMany({
    where: { id: params.id, userId: user.id },
  });

  return NextResponse.json({ success: true });
}
