import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: { runId: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { runId } = params;

  const run = await prisma.scrapeRun.findUnique({
    where: { id: runId },
    include: {
      scrapeLogs: {
        include: { pageContent: true },
        orderBy: { createdAt: "asc" },
      },
      featureResults: {
        orderBy: { featureName: "asc" },
      },
    },
  });

  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  return NextResponse.json(run);
}
