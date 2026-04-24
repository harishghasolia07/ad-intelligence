import { NextRequest } from "next/server";

import { buildBrandProfile } from "@/lib/brand-profile";
import { fail, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { createBrandSchema } from "@/lib/schemas";

export async function GET() {
  const brands = await prisma.brand.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          competitors: true,
          chatMessages: true,
        },
      },
    },
  });

  return ok({ brands });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createBrandSchema.safeParse(body);

    if (!parsed.success) {
      return fail("Invalid brand payload.", 400, parsed.error.flatten());
    }

    const profile = await buildBrandProfile(parsed.data.websiteUrl);

    const brand = await prisma.brand.create({
      data: {
        name: parsed.data.name,
        websiteUrl: parsed.data.websiteUrl,
        profileCategory: profile.category,
        profilePosition: profile.positioning,
        profileTone: profile.tone,
        profileAudience: profile.audience,
        profileValueProps: profile.valueProps,
        profileVisual: profile.visualStyle,
        profileSummary: profile.summary,
      },
    });

    return ok({ brand }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("Unable to fetch website") || message.includes("fetch failed")) {
      return fail(
        "Could not fetch the website URL. Use a valid, publicly reachable https URL.",
        400,
        message,
      );
    }

    return fail("Failed to create brand.", 500, error instanceof Error ? error.message : "Unknown error");
  }
}
