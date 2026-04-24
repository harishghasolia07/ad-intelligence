import { AdFormat } from "@prisma/client";

import { env } from "@/lib/env";

export type NormalizedAd = {
  sourceAdId: string;
  sourceUrl: string | null;
  adText: string | null;
  headline: string | null;
  pageName: string | null;
  format: AdFormat;
  firstSeenAt: Date | null;
  imageUrls: string[];
  rawPayload: string;
};

export function isApifyUnavailableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return (
    message.includes("Apify calls are disabled") ||
    message.includes("Missing APIFY_TOKEN or APIFY_ACTOR_ID") ||
    message.includes("APIFY_ACTOR_ID is empty after normalization") ||
    message.includes("Monthly usage hard limit exceeded") ||
    message.includes("platform-feature-disabled") ||
    message.includes("403 Forbidden")
  );
}

function normalizeActorId(input: string): string {
  const raw = input.trim();
  if (!raw) {
    return raw;
  }

  const tildeMatch = raw.match(/[A-Za-z0-9_-]+~[A-Za-z0-9_-]+/);
  if (tildeMatch) {
    return tildeMatch[0];
  }

  if (!raw.includes("/")) {
    return raw;
  }

  try {
    const url = raw.startsWith("http") ? new URL(raw) : new URL(`https://placeholder.local/${raw}`);
    const parts = url.pathname.split("/").filter(Boolean);
    const actsIndex = parts.indexOf("acts");
    if (actsIndex >= 0 && parts[actsIndex + 1]) {
      return decodeURIComponent(parts[actsIndex + 1]);
    }

    const actorsIndex = parts.indexOf("actors");
    if (actorsIndex >= 0 && parts[actorsIndex + 1]) {
      return decodeURIComponent(parts[actorsIndex + 1]);
    }

    if (parts.length >= 2 && /^[A-Za-z0-9_-]+$/.test(parts[0]) && /^[A-Za-z0-9_-]+$/.test(parts[1])) {
      return `${decodeURIComponent(parts[0])}~${decodeURIComponent(parts[1])}`;
    }

    return decodeURIComponent(parts[parts.length - 1] || raw);
  } catch {
    const cleaned = raw
      .replace(/^https?:\/\/api\.apify\.com\/v2\/acts\//, "")
      .replace(/\/run-sync-get-dataset-items.*$/, "")
      .replace(/\/runs\/.*$/, "")
      .replace(/^acts\//, "")
      .replace(/^actors\//, "");

    const cleanedTilde = cleaned.match(/[A-Za-z0-9_-]+~[A-Za-z0-9_-]+/);
    if (cleanedTilde) {
      return cleanedTilde[0];
    }

    const slashParts = cleaned.split("/").filter(Boolean);
    if (slashParts.length >= 2) {
      return `${decodeURIComponent(slashParts[0])}~${decodeURIComponent(slashParts[1])}`;
    }

    return decodeURIComponent(cleaned);
  }
}

function toAdFormat(input: unknown): AdFormat {
  const value = String(input ?? "").toLowerCase();
  if (value.includes("carousel")) {
    return "CAROUSEL";
  }
  if (value.includes("image") || value.includes("single")) {
    return "SINGLE_IMAGE";
  }
  return "UNKNOWN";
}

function normalizeItem(item: Record<string, unknown>, idx: number): NormalizedAd | null {
  const sourceAdId =
    String(item.adArchiveID ?? item.ad_archive_id ?? item.adId ?? item.id ?? `fallback-${idx}`);

  const imageCandidates = [
    item.imageUrl,
    item.image_url,
    item.thumbnail,
    ...(Array.isArray(item.images) ? item.images : []),
    ...(Array.isArray(item.imageUrls) ? item.imageUrls : []),
    ...(Array.isArray(item.cards)
      ? (item.cards as unknown[])
          .map((card) => (card && typeof card === "object" ? (card as Record<string, unknown>).imageUrl : null))
          .filter(Boolean)
      : []),
  ]
    .map((val) => String(val ?? "").trim())
    .filter((val) => /^https?:\/\//.test(val));

  const mediaType = String(item.mediaType ?? item.media_type ?? item.format ?? "");
  const format = toAdFormat(mediaType || (imageCandidates.length > 1 ? "carousel" : "image"));

  if (imageCandidates.length === 0) {
    return null;
  }

  return {
    sourceAdId,
    sourceUrl: String(item.adUrl ?? item.url ?? item.libraryUrl ?? "") || null,
    adText: String(item.adText ?? item.body ?? item.caption ?? "") || null,
    headline: String(item.headline ?? item.title ?? "") || null,
    pageName: String(item.pageName ?? item.page_name ?? item.advertiserName ?? "") || null,
    format,
    firstSeenAt: item.startDate ? new Date(String(item.startDate)) : null,
    imageUrls: Array.from(new Set(imageCandidates)),
    rawPayload: JSON.stringify(item),
  };
}

export async function fetchCompetitorAds(competitorName: string, limit: number): Promise<NormalizedAd[]> {
  if (!env.APIFY_ENABLED) {
    throw new Error(
      "Apify calls are disabled. Set APIFY_ENABLED=true in .env to allow paid actor runs.",
    );
  }

  if (!env.APIFY_TOKEN || !env.APIFY_ACTOR_ID) {
    throw new Error("Missing APIFY_TOKEN or APIFY_ACTOR_ID in environment.");
  }

  const actorId = normalizeActorId(env.APIFY_ACTOR_ID);
  if (!actorId) {
    throw new Error("APIFY_ACTOR_ID is empty after normalization.");
  }

  const runResponse = await fetch(
    `https://api.apify.com/v2/acts/${encodeURIComponent(actorId)}/run-sync-get-dataset-items?token=${env.APIFY_TOKEN}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: {
          startUrls: [
            {
              url: `https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=ALL&is_targeted_country=false&media_type=all&search_type=keyword_unordered&q=${encodeURIComponent(competitorName)}`,
            },
          ],
        },
        startUrls: [
          {
            url: `https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=ALL&is_targeted_country=false&media_type=all&search_type=keyword_unordered&q=${encodeURIComponent(competitorName)}`,
          },
        ],
        query: competitorName,
        keyword: competitorName,
        keywords: [competitorName],
        maxItems: limit * 2,
        maxResults: limit * 2,
      }),
      cache: "no-store",
    },
  );

  if (!runResponse.ok) {
    const bodyText = await runResponse.text();
    throw new Error(
      `Apify request failed: ${runResponse.status} ${runResponse.statusText} (actorId=${actorId}) - ${bodyText.slice(0, 500)}`,
    );
  }

  const items = (await runResponse.json()) as unknown[];
  const normalized: NormalizedAd[] = [];

  for (const [idx, item] of items.entries()) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const candidate = normalizeItem(item as Record<string, unknown>, idx);
    if (!candidate) {
      continue;
    }

    normalized.push(candidate);
    if (normalized.length >= limit) {
      break;
    }
  }

  return normalized;
}
