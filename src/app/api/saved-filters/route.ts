import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const filters = await prisma.savedFilter.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(filters);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, filters } = await req.json();

  if (!name || !filters) {
    return NextResponse.json(
      { error: "name and filters are required" },
      { status: 400 }
    );
  }

  const saved = await prisma.savedFilter.create({
    data: {
      userId: user.id,
      name,
      filters: JSON.stringify(filters),
    },
  });

  return NextResponse.json(saved, { status: 201 });
}
