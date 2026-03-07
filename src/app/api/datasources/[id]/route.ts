import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user || user.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { url, type, cadence, scrapeEnabled } = body;

  const dataSource = await prisma.dataSource.update({
    where: { id: params.id },
    data: {
      ...(url !== undefined && { url }),
      ...(type !== undefined && { type }),
      ...(cadence !== undefined && { cadence }),
      ...(scrapeEnabled !== undefined && { scrapeEnabled }),
    },
    include: {
      competitor: { select: { id: true, name: true, status: true } },
    },
  });

  return NextResponse.json(dataSource);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user || user.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.dataSource.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
