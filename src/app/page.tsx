import { BrandoraDashboard } from "@/components/brandora-dashboard";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const brands = await prisma.brand.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          competitors: true,
        },
      },
    },
  });

  const initialBrand = brands[0]
    ? await prisma.brand.findUnique({
        where: { id: brands[0].id },
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
      })
    : null;

  return <BrandoraDashboard initialBrands={brands} initialBrand={initialBrand} />;
}
