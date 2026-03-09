import { prisma } from "@/lib/db";
import { computeSimilarity } from "@/lib/similarity";
import { detectDuplicatesAI } from "@/lib/ai";

interface DuplicateResult {
  newDuplicates: number;
}

/**
 * Run full duplicate detection across all features (or within a category).
 * Pass 1: String similarity for obvious matches.
 * Pass 2: AI for borderline cases.
 */
export async function detectDuplicates(
  categoryId?: string
): Promise<DuplicateResult> {
  // 1. Fetch features
  const features = await prisma.feature.findMany({
    where: categoryId ? { categoryId } : undefined,
    select: { id: true, name: true, description: true },
  });

  // 2. Fetch existing pairs (all statuses) to skip re-evaluation
  const existingPairs = await prisma.featureDuplicate.findMany({
    select: { featureAId: true, featureBId: true },
  });
  const existingPairSet = new Set(
    existingPairs.map((p) => `${p.featureAId}:${p.featureBId}`)
  );

  // Helper to check both orderings
  const alreadyEvaluated = (idA: string, idB: string) =>
    existingPairSet.has(`${idA}:${idB}`) ||
    existingPairSet.has(`${idB}:${idA}`);

  // 3. Score all unique pairs
  const highConfidence: Array<{
    featureAId: string;
    featureBId: string;
    similarity: number;
  }> = [];
  const borderline: Array<{
    featureAId: string;
    featureBId: string;
    nameA: string;
    nameB: string;
    descA?: string;
    descB?: string;
    similarity: number;
  }> = [];

  for (let i = 0; i < features.length; i++) {
    for (let j = i + 1; j < features.length; j++) {
      const a = features[i];
      const b = features[j];

      if (alreadyEvaluated(a.id, b.id)) continue;

      const score = computeSimilarity(a.name, b.name);

      if (score >= 0.8) {
        highConfidence.push({
          featureAId: a.id,
          featureBId: b.id,
          similarity: score,
        });
      } else if (score >= 0.3) {
        borderline.push({
          featureAId: a.id,
          featureBId: b.id,
          nameA: a.name,
          nameB: b.name,
          descA: a.description || undefined,
          descB: b.description || undefined,
          similarity: score,
        });
      }
    }
  }

  let newDuplicates = 0;

  // 4. Store high-confidence string matches
  for (const match of highConfidence) {
    try {
      await prisma.featureDuplicate.create({
        data: {
          featureAId: match.featureAId,
          featureBId: match.featureBId,
          similarity: match.similarity,
          method: "string",
          status: "PENDING",
        },
      });
      newDuplicates++;
    } catch {
      // Skip if already exists (unique constraint)
    }
  }

  // 5. AI pass for borderline cases
  if (borderline.length > 0) {
    const aiPairs = borderline.map((b) => ({
      a: b.nameA,
      b: b.nameB,
      descA: b.descA,
      descB: b.descB,
    }));

    const aiResults = await detectDuplicatesAI(aiPairs);

    for (const result of aiResults) {
      if (!result.isDuplicate || result.confidence < 0.7) continue;

      // Find the matching borderline entry
      const match = borderline.find(
        (b) => b.nameA === result.a && b.nameB === result.b
      );
      if (!match) continue;

      try {
        await prisma.featureDuplicate.create({
          data: {
            featureAId: match.featureAId,
            featureBId: match.featureBId,
            similarity: result.confidence,
            method: "ai",
            status: "PENDING",
          },
        });
        newDuplicates++;
      } catch {
        // Skip if already exists
      }
    }
  }

  return { newDuplicates };
}

/**
 * Lightweight check for a single newly-created feature against all existing features.
 * Uses string similarity only (no AI call) for speed.
 */
export async function checkNewFeatureForDuplicates(
  featureId: string,
  featureName: string
): Promise<void> {
  const features = await prisma.feature.findMany({
    where: { id: { not: featureId } },
    select: { id: true, name: true },
  });

  for (const existing of features) {
    const score = computeSimilarity(featureName, existing.name);
    if (score < 0.6) continue;

    // Ensure consistent ordering (smaller ID first) to avoid constraint issues
    const [idA, idB] =
      featureId < existing.id
        ? [featureId, existing.id]
        : [existing.id, featureId];

    try {
      await prisma.featureDuplicate.create({
        data: {
          featureAId: idA,
          featureBId: idB,
          similarity: score,
          method: "string",
          status: "PENDING",
        },
      });
    } catch {
      // Skip if already exists
    }
  }
}
