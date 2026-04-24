import OpenAI from "openai";

import { env } from "@/lib/env";

type ChatContextInput = {
  brand: {
    name: string;
    websiteUrl: string;
    profileCategory: string | null;
    profilePosition: string | null;
    profileTone: string | null;
    profileAudience: string | null;
    profileValueProps: string | null;
    profileVisual: string | null;
    profileSummary: string | null;
  };
  competitors: Array<{
    name: string;
    ads: Array<{
      adText: string | null;
      headline: string | null;
      format: string;
      analysis: {
        hookLine: string | null;
        cta: string | null;
        messagingAngle: string | null;
        visualStyle: string | null;
        creativeCategory: string | null;
        summary: string | null;
      } | null;
    }>;
  }>;
};

function buildContext(input: ChatContextInput): string {
  const sections: string[] = [];
  sections.push(`Brand: ${input.brand.name} (${input.brand.websiteUrl})`);
  sections.push(
    [
      `Category: ${input.brand.profileCategory ?? "unknown"}`,
      `Positioning: ${input.brand.profilePosition ?? "unknown"}`,
      `Tone: ${input.brand.profileTone ?? "unknown"}`,
      `Audience: ${input.brand.profileAudience ?? "unknown"}`,
      `Value Props: ${input.brand.profileValueProps ?? "unknown"}`,
      `Visual Style: ${input.brand.profileVisual ?? "unknown"}`,
      `Summary: ${input.brand.profileSummary ?? "unknown"}`,
    ].join("\n"),
  );

  for (const competitor of input.competitors) {
    sections.push(`Competitor: ${competitor.name}`);
    for (const [index, ad] of competitor.ads.entries()) {
      sections.push(
        [
          `Ad ${index + 1}:`,
          `  Headline: ${ad.headline ?? ""}`,
          `  Copy: ${(ad.adText ?? "").slice(0, 600)}`,
          `  Format: ${ad.format}`,
          `  Hook: ${ad.analysis?.hookLine ?? "unknown"}`,
          `  CTA: ${ad.analysis?.cta ?? "unknown"}`,
          `  Angle: ${ad.analysis?.messagingAngle ?? "unknown"}`,
          `  Visual: ${ad.analysis?.visualStyle ?? "unknown"}`,
          `  Category: ${ad.analysis?.creativeCategory ?? "unknown"}`,
          `  Summary: ${ad.analysis?.summary ?? "unknown"}`,
        ].join("\n"),
      );
    }
  }

  return sections.join("\n\n");
}

export async function createGroundedResponse(params: {
  context: ChatContextInput;
  message: string;
}): Promise<string> {
  const contextText = buildContext(params.context);

  if (!env.OPENAI_API_KEY) {
    return [
      "OPENAI_API_KEY is not configured, so this is a local fallback response.",
      "Based on available competitor analysis, prioritize underused messaging angles and diversify hooks/CTAs while keeping your brand tone consistent.",
      "Configure OPENAI_API_KEY to enable full grounded creative generation.",
    ].join("\n\n");
  }

  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model: env.OPENAI_MODEL,
    temperature: 0.4,
    input: [
      {
        role: "system",
        content:
          "You are Brandora, a creative strategist. Use only the provided context. If context is missing, say what is missing. Do not provide generic advice without tying it to the data.",
      },
      {
        role: "user",
        content: `Context:\n${contextText}\n\nQuestion: ${params.message}`,
      },
    ],
  });

  return response.output_text?.trim() || "No response generated.";
}
