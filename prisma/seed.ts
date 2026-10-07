import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString })
});

async function main() {
  await prisma.setting.upsert({
    where: { key: "feature.voice" },
    update: { value: true },
    create: { key: "feature.voice", value: true }
  });

  await prisma.setting.upsert({
    where: { key: "legal.disclaimer" },
    update: {
      value: "این پاسخ صرفاً اطلاعات عمومی حقوقی است و جایگزین مشاوره رسمی وکیل نیست."
    },
    create: {
      key: "legal.disclaimer",
      value: "این پاسخ صرفاً اطلاعات عمومی حقوقی است و جایگزین مشاوره رسمی وکیل نیست."
    }
  });

  await prisma.featuredTier.upsert({
    where: { id: "sample-tier" },
    update: {},
    create: {
      id: "sample-tier",
      name: "نمونه ساختگی - ویژه",
      priority: 10,
      costPerClick: 0n,
      active: false
    }
  });
}

main().finally(async () => {
  await prisma.$disconnect();
});
