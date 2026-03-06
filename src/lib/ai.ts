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

Text:
${text.slice(0, 4000)}

For each feature found, provide:
- name: A short canonical name (e.g., "Auto-scheduling", "GPS Verification")
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
