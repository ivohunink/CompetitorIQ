# Duplicate Feature Detection — Implementation Plan

## Overview
Add automatic duplicate feature detection using a two-pass approach:
1. **Fast pass**: String similarity (trigram/normalized comparison) to catch obvious duplicates
2. **AI pass**: Claude-powered semantic analysis for borderline cases

Duplicates are surfaced for human review — never auto-merged.

---

## Step 1: Add Prisma Model for Duplicate Pairs

**File:** `prisma/schema.prisma`

Add a `FeatureDuplicate` model to store detected duplicate pairs:

```prisma
model FeatureDuplicate {
  id             String   @id @default(cuid())
  featureAId     String
  featureBId     String
  similarity     Float    // 0.0–1.0 score
  method         String   // "string" | "ai" | "both"
  status         String   @default("PENDING") // PENDING | CONFIRMED | DISMISSED
  resolvedAt     DateTime?
  resolvedBy     String?
  createdAt      DateTime @default(now())

  featureA       Feature  @relation("DuplicateA", fields: [featureAId], references: [id], onDelete: Cascade)
  featureB       Feature  @relation("DuplicateB", fields: [featureBId], references: [id], onDelete: Cascade)
  resolver       User?    @relation(fields: [resolvedBy], references: [id])

  @@unique([featureAId, featureBId])
}
```

Update the `Feature` model to add reverse relations:
```prisma
duplicatesAsA  FeatureDuplicate[] @relation("DuplicateA")
duplicatesAsB  FeatureDuplicate[] @relation("DuplicateB")
```

Update the `User` model:
```prisma
resolvedDuplicates FeatureDuplicate[]
```

Run `npx prisma db push` to apply.

---

## Step 2: String Similarity Utility

**New file:** `src/lib/similarity.ts`

Implement:
- `normalize(name: string): string` — lowercase, strip punctuation, collapse whitespace
- `trigrams(s: string): Set<string>` — generate character trigrams
- `trigramSimilarity(a: string, b: string): number` — Dice coefficient over trigrams (0–1)
- `isAcronymMatch(a: string, b: string): boolean` — detect "SSO" ↔ "Single Sign-On" style matches

No new dependencies needed — pure TypeScript.

---

## Step 3: AI Duplicate Detection Function

**File:** `src/lib/ai.ts`

Add `detectDuplicatesAI(pairs: {a: string, b: string}[]): Promise<{a: string, b: string, isDuplicate: boolean, confidence: number}[]>`

- Receives candidate pairs (pre-filtered by string similarity above a low threshold, e.g. 0.3)
- Sends a batch prompt to Claude asking it to judge whether each pair refers to the same capability
- Returns confidence scores

This keeps AI calls efficient by batching and only running on pre-filtered candidates.

---

## Step 4: Core Detection Engine

**New file:** `src/lib/duplicates.ts`

Main function: `detectDuplicates(categoryId?: string): Promise<DuplicateResult[]>`

Flow:
1. Fetch all features (optionally filtered by category) with names and descriptions
2. Generate all unique pairs
3. **Pass 1 — String similarity**: Score each pair with `trigramSimilarity()` + `isAcronymMatch()`
   - Score ≥ 0.8 → mark as "string" method duplicate (high confidence)
   - Score 0.3–0.8 → send to AI pass
   - Score < 0.3 → skip
4. **Pass 2 — AI**: Send borderline pairs to `detectDuplicatesAI()`
   - AI confidence ≥ 0.7 → mark as "ai" method duplicate
5. Upsert results into `FeatureDuplicate` table (skip already-dismissed pairs)
6. Return new duplicates found

---

## Step 5: API Routes

**New file:** `src/app/api/features/duplicates/route.ts`

- `GET /api/features/duplicates` — List duplicate pairs (filterable by status: PENDING/CONFIRMED/DISMISSED, categoryId)
- `POST /api/features/duplicates` — Trigger duplicate detection scan (accepts optional `categoryId`)

**New file:** `src/app/api/features/duplicates/[id]/route.ts`

- `PATCH /api/features/duplicates/:id` — Resolve a duplicate pair (confirm or dismiss)
- `POST /api/features/duplicates/:id/merge` — Merge two features (keeps one, transfers all coverages to it, deletes the other)

---

## Step 6: Hook into Feature Creation

**File:** `src/app/api/features/route.ts`

After creating a new feature, run a lightweight check: compare the new feature name against all existing features using string similarity only (fast, no AI call). If a match is found above 0.6, create a `FeatureDuplicate` record with status PENDING.

This gives immediate feedback without slowing down creation.

---

## Step 7: Hook into Feature Discovery

**File:** `src/app/api/categories/[id]/discover/route.ts`

After AI discovers new features, run the same lightweight string-similarity check against existing features. Log any potential duplicates.

---

## Step 8: UI — Duplicates Review Page

**New file:** `src/app/(app)/duplicates/page.tsx`

A review page showing:
- List of PENDING duplicate pairs with similarity score and method
- Each pair shows: Feature A name/category, Feature B name/category, similarity %, detection method
- Actions per pair: **Merge** (choose which to keep), **Dismiss** (not a duplicate)
- Filter by category, status
- Count badge in sidebar for pending duplicates

**File to update:** `src/components/sidebar.tsx` — Add "Duplicates" link with pending count badge.

---

## Step 9: Notifications

**File:** `src/lib/notifications.ts`

Add `notifyDuplicatesFound(count: number)` to alert admins/editors when new duplicates are detected, using the existing notification system.

---

## Files Changed (Summary)

| File | Action |
|------|--------|
| `prisma/schema.prisma` | Add FeatureDuplicate model + relations |
| `src/lib/similarity.ts` | **New** — string similarity utilities |
| `src/lib/duplicates.ts` | **New** — core detection engine |
| `src/lib/ai.ts` | Add `detectDuplicatesAI()` |
| `src/lib/notifications.ts` | Add `notifyDuplicatesFound()` |
| `src/app/api/features/duplicates/route.ts` | **New** — list & trigger API |
| `src/app/api/features/duplicates/[id]/route.ts` | **New** — resolve API |
| `src/app/api/features/duplicates/[id]/merge/route.ts` | **New** — merge API |
| `src/app/api/features/route.ts` | Hook lightweight check on create |
| `src/app/api/categories/[id]/discover/route.ts` | Hook lightweight check on discover |
| `src/app/(app)/duplicates/page.tsx` | **New** — review UI page |
| `src/components/sidebar.tsx` | Add duplicates nav link |
