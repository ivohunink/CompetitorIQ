import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface CategorySuggestion {
  category: string;
  subcategory: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
}

const DOMAIN_CATEGORIES = [
  "Scheduling",
  "Time & Attendance",
  "HR & Employee Management",
  "Compliance & Labor Law",
  "Communication",
  "Reporting & Analytics",
  "Integrations",
  "Employee App (Mobile)",
  "AI & Automation",
  "Onboarding & Setup",
];

export async function categorizeFeature(
  featureName: string,
  featureDescription?: string
): Promise<CategorySuggestion> {
  const prompt = `You are a product analyst for workforce management SaaS tools. Categorize the following feature into one of these categories and suggest a subcategory.

Available categories: ${DOMAIN_CATEGORIES.join(", ")}

Feature name: ${featureName}
${featureDescription ? `Feature description: ${featureDescription}` : ""}

Respond with ONLY valid JSON in this exact format, no other text:
{"category": "Category Name", "subcategory": "Subcategory Name", "confidence": "HIGH"}

The confidence should be HIGH if the feature clearly belongs to one category, MEDIUM if it could fit multiple, or LOW if it's ambiguous.`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 200,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";
    const result = JSON.parse(text) as CategorySuggestion;
    return result;
  } catch (error) {
    console.error("AI categorization failed:", error);
    return {
      category: "Uncategorized",
      subcategory: "General",
      confidence: "LOW",
    };
  }
}

export interface DiscoveredFeature {
  name: string;
  description: string;
  competitors: Array<{
    name: string;
    status: "SUPPORTED" | "PARTIAL";
    evidence: string;
    confidence: "HIGH" | "MEDIUM" | "LOW";
  }>;
}

export async function discoverCategoryFeatures(
  categoryName: string,
  categoryDescription: string,
  scrapedContentByCompetitor: Array<{ competitorName: string; content: string }>,
  existingFeatureNames: string[]
): Promise<DiscoveredFeature[]> {
  const competitorSections = scrapedContentByCompetitor
    .map(
      (c) =>
        `--- ${c.competitorName} ---\n${c.content.slice(0, 6000)}`
    )
    .join("\n\n");

  const prompt = `You are a product analyst specializing in SaaS tools. Your task is to discover ALL concrete product features that belong to a particular category by analyzing scraped competitor content.

CATEGORY: ${categoryName}
CATEGORY DESCRIPTION: ${categoryDescription}

IMPORTANT — WHAT COUNTS AS A "FEATURE":
A feature is a specific, concrete product capability that a user can interact with, configure, or receive.
GOOD feature names: "Push notifications", "Group messaging", "Read receipts", "Document sharing", "Shift swap requests", "Auto-scheduling", "News feed", "Employee directory"
BAD — these are marketing values/benefits, NOT features:
  - "HQ-to-frontline communication bridge" (marketing tagline)
  - "Unified employee experience" (benefit/outcome)
  - "Enterprise-grade security" (too vague)
  - "Seamless workforce management" (value proposition)

Feature names should be 2-5 words using standard product terminology — the way they would appear in a product comparison spreadsheet, not in a marketing brochure.

EXISTING FEATURES (do NOT include these):
${existingFeatureNames.length > 0 ? existingFeatureNames.map((f) => `- ${f}`).join("\n") : "(none)"}

SCRAPED COMPETITOR CONTENT:
${competitorSections}

EXTRACTION RULES:
1. Extract ALL distinct features you can identify. Aim for 10-25 features. Be comprehensive.
2. Each feature must be a specific, user-facing capability — something a user clicks, configures, or receives.
3. Do NOT include marketing slogans, value propositions, benefits, or vague descriptors.
4. Use standard product terminology for names (e.g., "Read receipts" not "Message read confirmation tracking for managers").
5. Keep names to 2-5 words. If a name exceeds 5 words, generalize it.
6. Deduplicate: if multiple competitors mention the same capability, list it once with all competitors.
7. Do NOT include features already in the existing features list.
8. For each competitor, provide a brief evidence quote from the scraped content.
9. If the scraped content is mostly marketing language, look past the slogans and infer what concrete capabilities must exist to deliver the claimed value.

Respond with ONLY valid JSON in this exact format, no other text:
[
  {
    "name": "Feature Name",
    "description": "Brief description of what this feature does",
    "competitors": [
      {"name": "Competitor Name", "status": "SUPPORTED", "evidence": "brief quote", "confidence": "HIGH"}
    ]
  }
]

If no features found, return an empty array: []`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "[]";
    const cleaned = text
      .replace(/```json?\n?/g, "")
      .replace(/```/g, "")
      .trim();
    return JSON.parse(cleaned) as DiscoveredFeature[];
  } catch (error) {
    console.error("AI category feature discovery failed:", error);
    return [];
  }
}

interface DuplicatePair {
  a: string;
  b: string;
  descA?: string;
  descB?: string;
}

interface DuplicateJudgment {
  a: string;
  b: string;
  isDuplicate: boolean;
  confidence: number;
}

export async function detectDuplicatesAI(
  pairs: DuplicatePair[]
): Promise<DuplicateJudgment[]> {
  if (pairs.length === 0) return [];

  const results: DuplicateJudgment[] = [];

  // Process in batches of 20
  for (let i = 0; i < pairs.length; i += 20) {
    const batch = pairs.slice(i, i + 20);

    const pairDescriptions = batch
      .map((p, idx) => {
        let line = `${idx + 1}. "${p.a}" vs "${p.b}"`;
        if (p.descA) line += `\n   A: ${p.descA}`;
        if (p.descB) line += `\n   B: ${p.descB}`;
        return line;
      })
      .join("\n");

    const prompt = `You are a product analyst. For each pair of product feature names below, determine if they refer to the SAME product capability (just named differently) or are genuinely DIFFERENT features.

Consider:
- Acronyms vs full names (e.g., "SSO" = "Single Sign-On")
- Synonyms (e.g., "Chat" ≈ "Messaging")
- Different phrasing of the same thing (e.g., "Auto-scheduling" ≈ "Automated Schedule Generation")
- Subset features are NOT duplicates (e.g., "GPS Clock-in" ≠ "Clock-in" — the first is more specific)

Feature pairs:
${pairDescriptions}

Respond with ONLY valid JSON array, no other text:
[{"pair": 1, "isDuplicate": true, "confidence": 0.95}, ...]

confidence should be 0.0-1.0 indicating how sure you are they are duplicates.`;

    try {
      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      });

      const text =
        message.content[0].type === "text" ? message.content[0].text : "[]";
      const cleaned = text
        .replace(/```json?\n?/g, "")
        .replace(/```/g, "")
        .trim();
      const judgments = JSON.parse(cleaned) as Array<{
        pair: number;
        isDuplicate: boolean;
        confidence: number;
      }>;

      for (const j of judgments) {
        const pair = batch[j.pair - 1];
        if (pair) {
          results.push({
            a: pair.a,
            b: pair.b,
            isDuplicate: j.isDuplicate,
            confidence: j.confidence,
          });
        }
      }
    } catch (error) {
      console.error("AI duplicate detection failed for batch:", error);
      // Skip this batch — string similarity results will still be used
    }
  }

  return results;
}

export async function extractFeaturesFromText(
  text: string,
  competitorName: string
): Promise<
  Array<{
    name: string;
    description: string;
    category: string;
    confidence: "HIGH" | "MEDIUM" | "LOW";
  }>
> {
  const prompt = `You are a product analyst. Extract individual product features from the following text about ${competitorName}'s product.

A "feature" is a specific, concrete product capability that users interact with (e.g., "Auto-scheduling", "GPS clock-in", "Push notifications", "Group messaging").
Do NOT extract marketing benefits, value propositions, or vague descriptors (e.g., "Seamless workforce management" or "Enterprise-grade platform" are NOT features).
Feature names should be 2-5 words using standard product terminology.

Text:
${text.slice(0, 4000)}

For each feature found, provide:
- name: A short canonical name (2-5 words, e.g., "Auto-scheduling", "GPS Verification")
- description: A brief description of what it does
- category: One of: ${DOMAIN_CATEGORIES.join(", ")}
- confidence: HIGH if clearly a distinct feature, MEDIUM if inferred, LOW if uncertain

Respond with ONLY a valid JSON array, no other text:
[{"name": "...", "description": "...", "category": "...", "confidence": "HIGH"}]

If no features found, return an empty array: []`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "[]";
    return JSON.parse(responseText);
  } catch (error) {
    console.error("AI feature extraction failed:", error);
    return [];
  }
}
