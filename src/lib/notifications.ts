import { prisma } from "@/lib/db";

type NotificationType = "new_feature" | "status_change" | "scrape_complete";

interface CreateNotificationParams {
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  competitorId?: string;
}

export async function createNotification(params: CreateNotificationParams) {
  const { type, title, message, entityType, entityId, competitorId } = params;

  // Find users who have this notification type enabled
  const prefs = await prisma.notificationPreference.findMany({
    where: {
      alertType: type,
      enabled: true,
      // If competitorId scope is set, match it (null = all competitors)
      ...(competitorId
        ? {
            OR: [
              { competitorId: null },
              { competitorId },
            ],
          }
        : {}),
    },
    select: { userId: true },
  });

  // If no prefs exist yet, notify all active users (default on)
  let userIds: string[];
  if (prefs.length > 0) {
    userIds = Array.from(new Set(prefs.map((p) => p.userId)));
  } else {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true },
    });
    userIds = users.map((u) => u.id);
  }

  if (userIds.length === 0) return;

  await prisma.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      type,
      title,
      message,
      entityType,
      entityId,
    })),
  });
}

export async function notifyFeatureChange(
  competitorName: string,
  competitorId: string,
  featuresUpdated: number,
  newFeaturesFound: number
) {
  if (featuresUpdated > 0) {
    await createNotification({
      type: "status_change",
      title: `${competitorName} coverage updated`,
      message: `${featuresUpdated} feature${featuresUpdated > 1 ? "s" : ""} updated from scraping.`,
      entityType: "Competitor",
      entityId: competitorId,
      competitorId,
    });
  }

  if (newFeaturesFound > 0) {
    await createNotification({
      type: "new_feature",
      title: `New features found for ${competitorName}`,
      message: `${newFeaturesFound} new feature${newFeaturesFound > 1 ? "s" : ""} detected. Check the review queue.`,
      entityType: "Competitor",
      entityId: competitorId,
      competitorId,
    });
  }
}

export async function notifyDuplicatesFound(count: number) {
  if (count <= 0) return;

  await createNotification({
    type: "new_feature",
    title: "Potential duplicate features detected",
    message: `${count} potential duplicate feature${count > 1 ? "s" : ""} found. Review them on the Duplicates page.`,
    entityType: "FeatureDuplicate",
  });
}
