import assert from "node:assert/strict";
import { getPrisma } from "../../src/lib/db/prisma";
import { consumeLegalAskRateLimit } from "../../src/lib/rate-limit/legal-ask";
import { cleanupOperationalData } from "../../src/modules/maintenance/cleanup-service";
import { recordSponsoredClick } from "../../src/modules/ads/click-service";
import { importLawDocument } from "../../src/modules/laws/import-service";
import { retrieveByText } from "../../src/modules/legal-qa/retrieval";

const prisma = getPrisma();

async function main() {
  const official = await prisma.source.create({
    data: {
      name: "CI TEST - official fixture",
      sourceType: "ci-test",
      official: true,
      enabled: true
    }
  });

  const unofficial = await prisma.source.create({
    data: {
      name: "CI TEST - unofficial fixture",
      sourceType: "ci-test",
      official: false,
      enabled: true
    }
  });

  await assert.rejects(
    () =>
      importLawDocument(prisma, unofficial.id, {
        title: "CI TEST - unofficial law",
        slug: "ci-test-unofficial-law",
        status: "UNKNOWN",
        articles: [
          {
            number: "1",
            text: "CI TEST only; never production legal data."
          }
        ]
      }),
    /Official source is not enabled/
  );

  const first = await importLawDocument(prisma, official.id, {
    title: "CI TEST - fictional law",
    slug: "ci-test-fictional-law",
    status: "UNKNOWN",
    metadata: {
      ciFixture: true,
      warning: "Fictional isolated CI data only"
    },
    articles: [
      {
        number: "1",
        title: "CI fixture",
        text:
          "این متن کاملاً ساختگی و فقط برای تست citestcontracttoken است."
      }
    ]
  });

  assert.equal(first.createdArticles, 1);
  assert.equal(first.updatedArticles, 0);
  assert.equal(first.textIndexed, 1);

  const retrieved = await retrieveByText(
    prisma,
    "citestcontracttoken",
    10
  );

  assert.equal(retrieved.length, 1);
  assert.equal(retrieved[0]?.lawSlug, "ci-test-fictional-law");
  assert.equal(retrieved[0]?.number, "1");

  const second = await importLawDocument(prisma, official.id, {
    title: "CI TEST - fictional law",
    slug: "ci-test-fictional-law",
    status: "AMENDED",
    metadata: {
      ciFixture: true,
      warning: "Fictional isolated CI data only"
    },
    articles: [
      {
        number: "1",
        title: "CI fixture updated",
        text:
          "این متن ساختگی نسخه دوم برای تست citestcontracttoken versiontwo است."
      }
    ]
  });

  assert.equal(second.createdArticles, 0);
  assert.equal(second.updatedArticles, 1);
  assert.equal(second.textIndexed, 1);

  const article = await prisma.article.findFirstOrThrow({
    where: {
      law: { slug: "ci-test-fictional-law" },
      number: "1"
    },
    include: {
      versions: {
        orderBy: { version: "asc" }
      },
      law: true
    }
  });

  assert.equal(article.currentVersion, 2);
  assert.equal(article.versions.length, 2);
  assert.equal(article.law.status, "AMENDED");

  const reviewCount = await prisma.reviewQueue.count({
    where: {
      kind: "ARTICLE_UPDATE",
      entityId: article.id,
      status: "PENDING"
    }
  });

  assert.equal(reviewCount, 1);

  const fixedNow = new Date("2026-10-08T08:00:00.000Z");
  const firstRate = await consumeLegalAskRateLimit(
    prisma,
    "ci-test-visitor",
    fixedNow
  );
  const secondRate = await consumeLegalAskRateLimit(
    prisma,
    "ci-test-visitor",
    fixedNow
  );
  const thirdRate = await consumeLegalAskRateLimit(
    prisma,
    "ci-test-visitor",
    fixedNow
  );

  assert.equal(firstRate.allowed, true);
  assert.equal(secondRate.allowed, true);
  assert.equal(thirdRate.allowed, false);
  assert.equal(thirdRate.remaining, 0);

  const sponsoredLawyer = await prisma.lawyer.create({
    data: {
      fullName: "CI TEST - sponsored lawyer",
      slug: "ci-test-sponsored-lawyer",
      city: "CI",
      verified: true,
      active: true
    }
  });

  const organicLawyer = await prisma.lawyer.create({
    data: {
      fullName: "CI TEST - organic lawyer",
      slug: "ci-test-organic-lawyer",
      city: "CI",
      verified: true,
      active: true
    }
  });

  const tier = await prisma.featuredTier.create({
    data: {
      name: "CI TEST - featured tier",
      priority: 100,
      costPerClick: 0n,
      active: true
    }
  });

  await prisma.lawyerFeaturedSubscription.create({
    data: {
      lawyerId: sponsoredLawyer.id,
      tierId: tier.id,
      startsAt: new Date(fixedNow.getTime() - 60 * 60 * 1000),
      endsAt: new Date(fixedNow.getTime() + 60 * 60 * 1000),
      active: true
    }
  });

  const [clickA, clickB] = await Promise.all([
    recordSponsoredClick(
      prisma,
      sponsoredLawyer.id,
      "ci-test-sponsored-visitor",
      fixedNow
    ),
    recordSponsoredClick(
      prisma,
      sponsoredLawyer.id,
      "ci-test-sponsored-visitor",
      fixedNow
    )
  ]);

  assert.deepEqual(
    new Set([clickA.status, clickB.status]),
    new Set(["counted", "duplicate"])
  );

  assert.equal(
    await prisma.adClick.count({
      where: {
        lawyerId: sponsoredLawyer.id,
        visitorHash: "ci-test-sponsored-visitor"
      }
    }),
    1
  );

  const organicClick = await recordSponsoredClick(
    prisma,
    organicLawyer.id,
    "ci-test-organic-visitor",
    fixedNow
  );

  assert.equal(organicClick.status, "not-sponsored");
  assert.equal(organicClick.counted, false);

  const cleanupNow = new Date("2026-10-08T10:00:00.000Z");

  await prisma.apiRateLimit.createMany({
    data: [
      {
        scope: "ci-cleanup",
        visitorHash: "old-rate",
        windowStart: new Date(
          cleanupNow.getTime() - 72 * 60 * 60 * 1000
        ),
        count: 1
      },
      {
        scope: "ci-cleanup",
        visitorHash: "fresh-rate",
        windowStart: new Date(
          cleanupNow.getTime() - 60 * 60 * 1000
        ),
        count: 1
      }
    ]
  });

  await prisma.aiUsageLog.createMany({
    data: [
      {
        kind: "LLM",
        success: true,
        latencyMs: 10,
        errorCode: null,
        createdAt: new Date(
          cleanupNow.getTime() - 100 * 24 * 60 * 60 * 1000
        )
      },
      {
        kind: "LLM",
        success: true,
        latencyMs: 11,
        errorCode: null,
        createdAt: new Date(
          cleanupNow.getTime() - 24 * 60 * 60 * 1000
        )
      }
    ]
  });

  const cleanup = await cleanupOperationalData(
    prisma,
    {
      rateLimitRetentionHours: 48,
      aiUsageRetentionDays: 90
    },
    cleanupNow
  );

  assert.ok(cleanup.deletedRateLimitRows >= 1);
  assert.ok(cleanup.deletedAiUsageRows >= 1);

  assert.equal(
    await prisma.apiRateLimit.count({
      where: {
        scope: "ci-cleanup",
        visitorHash: "old-rate"
      }
    }),
    0
  );

  assert.equal(
    await prisma.apiRateLimit.count({
      where: {
        scope: "ci-cleanup",
        visitorHash: "fresh-rate"
      }
    }),
    1
  );

  const recentUsageCount = await prisma.aiUsageLog.count({
    where: {
      createdAt: {
        gte: new Date(
          cleanupNow.getTime() - 2 * 24 * 60 * 60 * 1000
        )
      }
    }
  });

  assert.ok(recentUsageCount >= 1);

  const extension = await prisma.$queryRaw<Array<{ extname: string }>>`
    SELECT extname
    FROM pg_extension
    WHERE extname = 'vector'
  `;

  assert.equal(extension[0]?.extname, "vector");

  console.log("database integration smoke: ok");
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
