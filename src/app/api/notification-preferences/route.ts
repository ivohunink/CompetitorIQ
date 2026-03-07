import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const VALID_ALERT_TYPES = ["new_feature", "status_change", "weekly_digest"];

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prefs = await prisma.notificationPreference.findMany({
    where: { userId: user.id },
  });

  // Return a map of alertType -> enabled (default true if no pref exists)
  const result: Record<string, boolean> = {};
  for (const type of VALID_ALERT_TYPES) {
    const pref = prefs.find((p) => p.alertType === type);
    result[type] = pref ? pref.enabled : true;
  }

  return NextResponse.json(result);
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  // body: { alertType: string, enabled: boolean }
  const { alertType, enabled } = body;

  if (!VALID_ALERT_TYPES.includes(alertType)) {
    return NextResponse.json({ error: "Invalid alert type" }, { status: 400 });
  }

  await prisma.notificationPreference.upsert({
    where: {
      userId_alertType: { userId: user.id, alertType },
    },
    create: {
      userId: user.id,
      alertType,
      enabled,
    },
    update: { enabled },
  });

  return NextResponse.json({ success: true });
}
