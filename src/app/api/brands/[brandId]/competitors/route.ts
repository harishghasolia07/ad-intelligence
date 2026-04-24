import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { addCompetitorsSchema } from "@/lib/schemas";

export async function GET(
  _request: Request,
  context: { params: Promise<{ brandId: string }> },
) {
  const { brandId } = await context.params;

  const competitors = await prisma.competitor.findMany({
    where: { brandId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          ads: true,
        },
      },
    },
  });

  return ok({ competitors });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ brandId: string }> },
) {
  try {
    const { brandId } = await context.params;
    const body = await request.json();
    const parsed = addCompetitorsSchema.safeParse(body);

    if (!parsed.success) {
      return fail("Invalid competitors payload.", 400, parsed.error.flatten());
    }

    const existingCount = await prisma.competitor.count({ where: { brandId } });
    if (existingCount >= 3) {
      return fail("A brand can have at most 3 competitors.", 400);
    }

    const normalized = Array.from(
      new Set(parsed.data.competitors.map((name) => name.trim()).filter(Boolean)),
    );

    const toCreate = normalized.slice(0, Math.max(0, 3 - existingCount));
    if (toCreate.length === 0) {
      return fail("No new competitors to add.", 400);
    }

    const created = [];
    for (const name of toCreate) {
      const competitor = await prisma.competitor.upsert({
        where: {
          brandId_name: {
            brandId,
            name,
          },
        },
        update: {},
        create: {
          brandId,
          name,
        },
      });

      created.push(competitor);
    }

    return ok({ competitors: created }, { status: 201 });
  } catch (error) {
    return fail("Failed to save competitors.", 500, error instanceof Error ? error.message : "Unknown error");
  }
}
