import { NextRequest } from "next/server";

import { analyzeAd } from "@/lib/ad-analysis";
import { fetchCompetitorAds, isApifyUnavailableError, type NormalizedAd } from "@/lib/apify";
import { fail, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const DEFAULT_AD_LIMIT = 8;

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ brandId: string }> },
) {
  try {
    const { brandId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      perCompetitorLimit?: number;
      reanalyze?: boolean;
      refresh?: boolean;
    };

    const perCompetitorLimit = Math.min(Math.max(body.perCompetitorLimit ?? DEFAULT_AD_LIMIT, 5), 10);
    const reanalyze = Boolean(body.reanalyze);
    const refresh = Boolean(body.refresh);

    const competitors = await prisma.competitor.findMany({
      where: { brandId },
      orderBy: { createdAt: "asc" },
    });

    if (competitors.length === 0) {
      return fail("Add competitors before ingestion.", 400);
    }

    const stats: Array<{
      competitorId: string;
      competitorName: string;
      fetched: number;
      analyzed: number;
    }> = [];
    const warnings: string[] = [];

    for (const competitor of competitors) {
      const existingAds = await prisma.ad.findMany({
        where: { competitorId: competitor.id },
        orderBy: [{ firstSeenAt: "desc" }, { createdAt: "desc" }],
        take: perCompetitorLimit,
        include: {
          analysis: true,
        },
      });

      // Cache-first: avoid paid actor runs when we already have enough analyzed ads.
      if (!refresh && existingAds.length >= perCompetitorLimit) {
        let reanalyzedCount = 0;
        if (reanalyze) {
          for (const ad of existingAds) {
            const assetRows = await prisma.adAsset.findMany({
              where: { adId: ad.id },
              orderBy: { sortOrder: "asc" },
            });

            const analysis = await analyzeAd({
              adText: ad.adText,
              imageUrls: assetRows.map((asset) => asset.imageUrl),
            });

            await prisma.adAnalysis.upsert({
              where: { adId: ad.id },
              update: {
                hookLine: analysis.hookLine,
                cta: analysis.cta,
                messagingAngle: analysis.messagingAngle,
                visualStyle: analysis.visualStyle,
                hasPeople: analysis.hasPeople,
                hasTextOverlay: analysis.hasTextOverlay,
                productionStyle: analysis.productionStyle,
                productVisibility: analysis.productVisibility,
                creativeCategory: analysis.creativeCategory,
                summary: analysis.summary,
                rawJson: analysis.rawJson,
              },
              create: {
                adId: ad.id,
                hookLine: analysis.hookLine,
                cta: analysis.cta,
                messagingAngle: analysis.messagingAngle,
                visualStyle: analysis.visualStyle,
                hasPeople: analysis.hasPeople,
                hasTextOverlay: analysis.hasTextOverlay,
                productionStyle: analysis.productionStyle,
                productVisibility: analysis.productVisibility,
                creativeCategory: analysis.creativeCategory,
                summary: analysis.summary,
                rawJson: analysis.rawJson,
              },
            });

            reanalyzedCount += 1;
          }
        }

        stats.push({
          competitorId: competitor.id,
          competitorName: competitor.name,
          fetched: 0,
          analyzed: reanalyze ? reanalyzedCount : 0,
        });
        continue;
      }

      let rawAds: NormalizedAd[];
      try {
        rawAds = await fetchCompetitorAds(competitor.name, perCompetitorLimit);
      } catch (error) {
        if (!isApifyUnavailableError(error)) {
          throw error;
        }
        // Real data only: Apify unavailable, skip this competitor with warning
        warnings.push(
          `Apify unavailable for competitor "${competitor.name}". Skipping. Ensure APIFY_TOKEN is valid and has sufficient quota.`
        );
        rawAds = [];
      }

      let analyzedCount = 0;

      for (const [index, item] of rawAds.entries()) {
        const ad = await prisma.ad.upsert({
          where: {
            competitorId_sourceAdId: {
              competitorId: competitor.id,
              sourceAdId: item.sourceAdId,
            },
          },
          update: {
            sourceUrl: item.sourceUrl,
            adText: item.adText,
            headline: item.headline,
            pageName: item.pageName,
            format: item.format,
            firstSeenAt: item.firstSeenAt,
            rawPayload: item.rawPayload,
          },
          create: {
            competitorId: competitor.id,
            sourceAdId: item.sourceAdId,
            sourceUrl: item.sourceUrl,
            adText: item.adText,
            headline: item.headline,
            pageName: item.pageName,
            format: item.format,
            firstSeenAt: item.firstSeenAt,
            rawPayload: item.rawPayload,
          },
          include: {
            analysis: true,
          },
        });

        await prisma.adAsset.deleteMany({ where: { adId: ad.id } });

        if (item.imageUrls.length > 0) {
          await prisma.adAsset.createMany({
            data: item.imageUrls.map((url, assetIndex) => ({
              adId: ad.id,
              imageUrl: url,
              sortOrder: assetIndex,
            })),
          });
        }

        if (!ad.analysis || reanalyze) {
          let analysis;
          try {
            analysis = await analyzeAd({
              adText: item.adText,
              imageUrls: item.imageUrls,
            });
          } catch (error) {
            // Fallback to basic heuristic analysis if OpenAI fails
            analysis = {
              hookLine: item.adText?.split(/[.!?]/)[0]?.trim() || "Ad copy",
              cta: "Learn more",
              messagingAngle: "Generic",
              visualStyle: item.imageUrls.length > 1 ? "Carousel" : "Single image",
              hasPeople: false,
              hasTextOverlay: false,
              productionStyle: "Unknown",
              productVisibility: "Unknown",
              creativeCategory: item.imageUrls.length > 1 ? "Carousel" : "Image",
              summary: "AI analysis unavailable. Displaying heuristic fallback.",
              rawJson: JSON.stringify({}),
            };
          }

          await prisma.adAnalysis.upsert({
            where: { adId: ad.id },
            update: {
              hookLine: analysis.hookLine,
              cta: analysis.cta,
              messagingAngle: analysis.messagingAngle,
              visualStyle: analysis.visualStyle,
              hasPeople: analysis.hasPeople,
              hasTextOverlay: analysis.hasTextOverlay,
              productionStyle: analysis.productionStyle,
              productVisibility: analysis.productVisibility,
              creativeCategory: analysis.creativeCategory,
              summary: analysis.summary,
              rawJson: analysis.rawJson,
            },
            create: {
              adId: ad.id,
              hookLine: analysis.hookLine,
              cta: analysis.cta,
              messagingAngle: analysis.messagingAngle,
              visualStyle: analysis.visualStyle,
              hasPeople: analysis.hasPeople,
              hasTextOverlay: analysis.hasTextOverlay,
              productionStyle: analysis.productionStyle,
              productVisibility: analysis.productVisibility,
              creativeCategory: analysis.creativeCategory,
              summary: analysis.summary,
              rawJson: analysis.rawJson,
            },
          });

          analyzedCount += 1;
        }
      }

      stats.push({
        competitorId: competitor.id,
        competitorName: competitor.name,
        fetched: rawAds.length,
        analyzed: analyzedCount,
      });
    }

    return ok({
      message: "Ingestion complete.",
      mode: refresh ? "live-refresh" : "cache-first",
      stats,
      warnings: warnings.length > 0 ? warnings : undefined,
    });
  } catch (error) {
    return fail("Failed during ingestion.", 500, error instanceof Error ? error.message : "Unknown error");
  }
}
