import assert from "node:assert/strict";
import { getPrisma } from "../../src/lib/db/prisma";
import { consumeLegalAskRateLimit } from "../../src/lib/rate-limit/legal-ask";
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
