import { NextRequest } from "next/server";

import { createGroundedResponse } from "@/lib/chat";
import { fail, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { chatSchema } from "@/lib/schemas";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ brandId: string }> },
) {
  try {
    const { brandId } = await context.params;
    const body = await request.json();
    const parsed = chatSchema.safeParse(body);

    if (!parsed.success) {
      return fail("Invalid chat payload.", 400, parsed.error.flatten());
    }

    const brand = await prisma.brand.findUnique({
      where: { id: brandId },
      include: {
        competitors: {
          include: {
            ads: {
              orderBy: [{ firstSeenAt: "desc" }, { createdAt: "desc" }],
              take: 10,
              include: {
                analysis: true,
              },
            },
          },
        },
      },
    });

    if (!brand) {
      return fail("Brand not found.", 404);
    }

    await prisma.chatMessage.create({
      data: {
        brandId,
        role: "user",
        content: parsed.data.message,
      },
    });

    const answer = await createGroundedResponse({
      context: {
        brand,
        competitors: brand.competitors,
      },
      message: parsed.data.message,
    });

    await prisma.chatMessage.create({
      data: {
        brandId,
        role: "assistant",
        content: answer,
      },
    });

    return ok({
      response: answer,
    });
  } catch (error) {
    return fail("Failed to process chat.", 500, error instanceof Error ? error.message : "Unknown error");
  }
}
