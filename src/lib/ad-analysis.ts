import OpenAI from "openai";

import { env } from "@/lib/env";

export type AdAnalysisResult = {
  hookLine: string;
  cta: string;
  messagingAngle: string;
  visualStyle: string;
  hasPeople: boolean | null;
  hasTextOverlay: boolean | null;
  productionStyle: string;
  productVisibility: string;
  creativeCategory: string;
  summary: string;
  rawJson: string;
};

function heuristicAnalysis(adText: string | null, imageCount: number): AdAnalysisResult {
  const text = (adText ?? "").trim();
  const sentences = text.split(/[.!?]/).map((s) => s.trim()).filter(Boolean);
  const hookLine = sentences[0] || "No clear hook available.";

  const ctaMatch = text.match(/\b(shop now|learn more|buy now|get started|try now|sign up)\b/i);
  const cta = ctaMatch ? ctaMatch[0] : "CTA not explicit";

  const lower = text.toLowerCase();
  const messagingAngle =
    lower.includes("limited") || lower.includes("today")
      ? "Urgency"
      : lower.includes("save") || lower.includes("discount")
        ? "Offer-driven"
        : lower.includes("real") || lower.includes("review")
          ? "Social proof"
          : lower.includes("problem") || lower.includes("struggle")
            ? "Pain-point"
            : "Aspirational";

  const creativeCategory = imageCount > 1 ? "Feature carousel" : "Single visual ad";

  return {
    hookLine,
    cta,
    messagingAngle,
    visualStyle: imageCount > 1 ? "Mixed carousel creative" : "Single product/lifestyle frame",
    hasPeople: null,
    hasTextOverlay: null,
    productionStyle: "Unknown",
    productVisibility: "Unknown",
    creativeCategory,
    summary: `${messagingAngle} messaging with ${creativeCategory.toLowerCase()}.`,
    rawJson: JSON.stringify({ source: "heuristic" }),
  };
}

function extractJsonObject(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return text.slice(start, end + 1);
  }
  return text;
}

export async function analyzeAd(params: {
  adText: string | null;
  imageUrls: string[];
}): Promise<AdAnalysisResult> {
  const fallback = heuristicAnalysis(params.adText, params.imageUrls.length);

  if (!env.OPENAI_API_KEY) {
    return fallback;
  }

  try {
    const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });

    const input: OpenAI.Responses.ResponseInput = [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: [
              "Analyze this Meta ad and return strict JSON with keys:",
              "hookLine, cta, messagingAngle, visualStyle, hasPeople, hasTextOverlay, productionStyle, productVisibility, creativeCategory, summary.",
              "If a field is unknown, still return a reasonable best-effort value.",
              `Ad copy: ${params.adText ?? ""}`,
            ].join("\n"),
          },
          ...params.imageUrls.slice(0, 4).map((imageUrl) => ({
            type: "input_image" as const,
            image_url: imageUrl,
            detail: "auto" as const,
          })),
        ],
      },
    ];

    const response = await client.responses.create({
      model: env.OPENAI_VISION_MODEL,
      input,
      temperature: 0.2,
    });

    const raw = response.output_text?.trim();
    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(extractJsonObject(raw)) as Partial<AdAnalysisResult>;
    const merged: AdAnalysisResult = {
      hookLine: parsed.hookLine || fallback.hookLine,
      cta: parsed.cta || fallback.cta,
      messagingAngle: parsed.messagingAngle || fallback.messagingAngle,
      visualStyle: parsed.visualStyle || fallback.visualStyle,
      hasPeople: typeof parsed.hasPeople === "boolean" ? parsed.hasPeople : fallback.hasPeople,
      hasTextOverlay:
        typeof parsed.hasTextOverlay === "boolean" ? parsed.hasTextOverlay : fallback.hasTextOverlay,
      productionStyle: parsed.productionStyle || fallback.productionStyle,
      productVisibility: parsed.productVisibility || fallback.productVisibility,
      creativeCategory: parsed.creativeCategory || fallback.creativeCategory,
      summary: parsed.summary || fallback.summary,
      rawJson: raw,
    };

    return merged;
  } catch {
    return fallback;
  }
}
