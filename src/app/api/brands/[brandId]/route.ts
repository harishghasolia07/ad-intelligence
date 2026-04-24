import { fail, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  context: { params: Promise<{ brandId: string }> },
) {
  const { brandId } = await context.params;

  const brand = await prisma.brand.findUnique({
    where: { id: brandId },
    include: {
      competitors: {
        orderBy: { createdAt: "desc" },
        include: {
          ads: {
            orderBy: [{ firstSeenAt: "desc" }, { createdAt: "desc" }],
            include: {
              assets: {
                orderBy: { sortOrder: "asc" },
              },
              analysis: true,
            },
          },
        },
      },
      chatMessages: {
        orderBy: { createdAt: "asc" },
        take: 40,
      },
    },
  });

  if (!brand) {
    return fail("Brand not found.", 404);
  }

  return ok({ brand });
}
