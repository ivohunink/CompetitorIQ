import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { categorizeFeature } from "@/lib/ai";
import { checkNewFeatureForDuplicates } from "@/lib/duplicates";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get("categoryId");
  const search = searchParams.get("search");

  const where: any = {};
  if (categoryId) where.categoryId = categoryId;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const features = await prisma.feature.findMany({
    where,
    include: {
      category: true,
      subcategory: true,
      coverages: {
        include: { competitor: true },
        where: { reviewStatus: "APPROVED" },
      },
    },
    orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
  });

  return NextResponse.json(features);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { name, description, categoryId, subcategoryId } = body;

  if (!name) {
    return NextResponse.json({ error: "Feature name is required" }, { status: 400 });
  }

  let finalCategoryId = categoryId;
  let finalSubcategoryId = subcategoryId;

  // AI auto-categorization if no category provided
  if (!categoryId) {
    try {
      const suggestion = await categorizeFeature(name, description);

      // Find or create category
      let category = await prisma.category.findUnique({
        where: { name: suggestion.category },
      });
      if (!category) {
        category = await prisma.category.create({
          data: { name: suggestion.category },
        });
      }
      finalCategoryId = category.id;

      // Find or create subcategory
      if (suggestion.subcategory) {
        let subcategory = await prisma.subcategory.findUnique({
          where: {
            name_categoryId: {
              name: suggestion.subcategory,
              categoryId: category.id,
            },
          },
        });
        if (!subcategory) {
          subcategory = await prisma.subcategory.create({
            data: {
              name: suggestion.subcategory,
              categoryId: category.id,
            },
          });
        }
        finalSubcategoryId = subcategory.id;
      }
    } catch (error) {
      console.error("Auto-categorization failed, creating without category:", error);
    }
  }

  const feature = await prisma.feature.create({
    data: {
      name,
      description,
      categoryId: finalCategoryId,
      subcategoryId: finalSubcategoryId,
    },
    include: { category: true, subcategory: true },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "CREATE",
      entityType: "Feature",
      entityId: feature.id,
      details: JSON.stringify({ name, categoryId: finalCategoryId }),
    },
  });

  // Fire-and-forget duplicate check for the new feature
  checkNewFeatureForDuplicates(feature.id, feature.name).catch((err) =>
    console.error("Duplicate check failed:", err)
  );

  return NextResponse.json(feature, { status: 201 });
}
