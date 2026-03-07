import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ExtractedCoverage {
  featureName: string;
  status: "SUPPORTED" | "PARTIAL" | "NOT_SUPPORTED";
  confidence: "HIGH" | "MEDIUM" | "LOW";
  evidence: string;
}

export interface ExtractionResult {
  knownFeatures: ExtractedCoverage[];
  newFeatures: Array<{
    name: string;
    description: string;
    suggestedCategory: string;
    confidence: "HIGH" | "MEDIUM" | "LOW";
  }>;
}

export async function extractFeatureCoverage(
  scrapedText: string,
  competitorName: string,
  knownFeatureNames: string[],
  sourceUrl: string
): Promise<ExtractionResult> {
  const prompt = `You are a product analyst for workforce management SaaS tools. Analyze the following scraped content from ${competitorName}'s website/listing and determine feature coverage.

KNOWN FEATURES TO CHECK:
${knownFeatureNames.map((f) => `- ${f}`).join("\n")}

SCRAPED CONTENT:
${scrapedText.slice(0, 6000)}

SOURCE URL: ${sourceUrl}

For each KNOWN feature, determine if ${competitorName} supports it based on the content:
- SUPPORTED: Clear evidence the feature exists
- PARTIAL: Feature exists but with limitations or only basic version
- NOT_SUPPORTED: Only if there is clear indication it's missing (don't guess)

Also identify any NEW features not in the known list that are clearly product features.
A "feature" is a concrete product capability that users interact with (e.g., "Shift templates", "GPS clock-in", "Push notifications").
Do NOT report marketing benefits or value propositions as features (e.g., "Streamlined workforce management" is NOT a feature).

Respond with ONLY valid JSON in this exact format, no other text:
{
  "knownFeatures": [
    {"featureName": "exact feature name from list", "status": "SUPPORTED", "confidence": "HIGH", "evidence": "brief quote or reason"}
  ],
  "newFeatures": [
    {"name": "Feature Name", "description": "What it does", "suggestedCategory": "Category Name", "confidence": "HIGH"}
  ]
}

Rules:
- Only include known features where you have actual evidence from the content
- Do NOT include features where there is no evidence either way
- confidence: HIGH = direct mention, MEDIUM = inferred from context, LOW = uncertain
- Keep evidence strings under 100 characters
- New feature names should be 2-5 words using standard product terminology
- Do NOT include vague capabilities like "Enterprise security" or "Seamless integration"`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 3000,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "{}";

    // Parse, handling potential markdown code blocks
    const cleaned = text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    const result = JSON.parse(cleaned) as ExtractionResult;

    return {
      knownFeatures: result.knownFeatures || [],
      newFeatures: result.newFeatures || [],
    };
  } catch (error) {
    console.error("AI extraction failed:", error);
    return { knownFeatures: [], newFeatures: [] };
  }
}
