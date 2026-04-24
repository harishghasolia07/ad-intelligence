import * as cheerio from "cheerio";
import OpenAI from "openai";

import { env } from "@/lib/env";

const WEBSITE_FETCH_TIMEOUT_MS = 15000;

export type BrandProfile = {
  category: string;
  positioning: string;
  tone: string;
  audience: string;
  valueProps: string;
  visualStyle: string;
  summary: string;
};

function asString(value: unknown, fallback: string): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || fallback;
  }

  if (Array.isArray(value)) {
    const joined = value
      .map((item) => (typeof item === "string" ? item.trim() : String(item ?? "").trim()))
      .filter(Boolean)
      .join("; ");
    return joined || fallback;
  }

  if (value && typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return fallback;
    }
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return fallback;
}

function extractHeuristicProfile(websiteUrl: string, html: string): BrandProfile {
  const $ = cheerio.load(html);
  const title = $("title").text().trim();
  const description = $("meta[name='description']").attr("content")?.trim() ?? "";
  const h1 = $("h1")
    .slice(0, 3)
    .toArray()
    .map((el) => $(el).text().trim())
    .join(". ");
  const bodyText = $("p")
    .slice(0, 10)
    .toArray()
    .map((el) => $(el).text().trim())
    .join(" ")
    .replace(/\s+/g, " ");

  const merged = [title, description, h1, bodyText].filter(Boolean).join(" ");
  const lower = merged.toLowerCase();

  const category =
    lower.includes("skin") || lower.includes("beauty")
      ? "Beauty / Personal Care"
      : lower.includes("shoe") || lower.includes("apparel") || lower.includes("fashion")
        ? "Fashion / Apparel"
        : lower.includes("supplement") || lower.includes("nutrition")
          ? "Health / Wellness"
          : "D2C Consumer Brand";

  const tone =
    lower.includes("science") || lower.includes("clinical")
      ? "Evidence-led"
      : lower.includes("luxury") || lower.includes("premium")
        ? "Premium / Aspirational"
        : lower.includes("simple") || lower.includes("easy")
          ? "Practical and clear"
          : "Friendly and persuasive";

  const audience =
    lower.includes("men") && lower.includes("women")
      ? "Adult consumers"
      : lower.includes("women")
        ? "Women-focused consumers"
        : lower.includes("men")
          ? "Men-focused consumers"
          : "General online shoppers";

  const positioning =
    description || h1 || "Brand appears positioned around clear outcomes and convenience.";

  const valueProps =
    bodyText.slice(0, 260) || "Value proposition not explicit; likely centered on quality, trust, and results.";

  const visualStyle =
    lower.includes("minimal") || lower.includes("clean")
      ? "Minimal and clean"
      : lower.includes("bold") || lower.includes("vibrant")
        ? "Bold and high-contrast"
        : "Lifestyle-forward product storytelling";

  return {
    category,
    positioning,
    tone,
    audience,
    valueProps,
    visualStyle,
    summary: `${title || websiteUrl}. ${description || ""}`.trim(),
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

export async function buildBrandProfile(websiteUrl: string): Promise<BrandProfile> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), WEBSITE_FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(websiteUrl, {
      headers: {
        "User-Agent": "BrandoraBot/1.0 (+https://brandora.local)",
      },
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        `Unable to fetch website: request timed out after ${Math.floor(WEBSITE_FETCH_TIMEOUT_MS / 1000)}s`,
      );
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new Error(`Unable to fetch website: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const heuristic = extractHeuristicProfile(websiteUrl, html);

  if (!env.OPENAI_API_KEY) {
    return heuristic;
  }

  try {
    const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    const prompt = [
      "You are an expert brand strategist.",
      "Extract a concise profile from the following website text.",
      "Return strict JSON with keys: category, positioning, tone, audience, valueProps, visualStyle, summary.",
      `Website URL: ${websiteUrl}`,
      `Website text: ${html.slice(0, 14000)}`,
    ].join("\n\n");

    const completion = await client.responses.create({
      model: env.OPENAI_MODEL,
      input: prompt,
      temperature: 0.3,
    });

    const text = completion.output_text?.trim();
    if (!text) {
      return heuristic;
    }

    const parsed = JSON.parse(extractJsonObject(text)) as Partial<BrandProfile>;
    return {
      category: asString(parsed.category, heuristic.category),
      positioning: asString(parsed.positioning, heuristic.positioning),
      tone: asString(parsed.tone, heuristic.tone),
      audience: asString(parsed.audience, heuristic.audience),
      valueProps: asString(parsed.valueProps, heuristic.valueProps),
      visualStyle: asString(parsed.visualStyle, heuristic.visualStyle),
      summary: asString(parsed.summary, heuristic.summary),
    };
  } catch {
    return heuristic;
  }
}
