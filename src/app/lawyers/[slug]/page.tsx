import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPrisma } from "@/lib/db/prisma";
import { safeJsonLd } from "@/lib/seo/safe-json-ld";
import { isHttpUrl } from "@/lib/url/http";

export const dynamic = "force-dynamic";

async function getLawyer(slug: string) {
  return getPrisma().lawyer.findFirst({
    where: {
      slug,
      active: true,
      verified: true
    },
    include: {
      specialties: {
        select: { area: true }
      },
      socialLinks: {
        select: {
          platform: true,
          url: true
        }
      }
    }
  });
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const lawyer = await getLawyer(slug);

  if (!lawyer) {
    return {
      title: "وکیل پیدا نشد",
      robots: { index: false, follow: false }
    };
  }

  return {
    title: lawyer.fullName,
    description:
      lawyer.bio?.slice(0, 150) ??
      `پروفایل وکیل تأییدشده در ${lawyer.city}`,
    alternates: {
      canonical: "/lawyers/" + lawyer.slug
    }
  };
}

export default async function LawyerProfilePage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lawyer = await getLawyer(slug);
  if (!lawyer) notFound();

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: lawyer.fullName,
    jobTitle: "وکیل",
    address: {
      "@type": "PostalAddress",
      addressLocality: lawyer.city,
      ...(lawyer.province
        ? { addressRegion: lawyer.province }
        : {})
    },
    ...(lawyer.avatarUrl && isHttpUrl(lawyer.avatarUrl)
      ? { image: lawyer.avatarUrl }
      : {})
  };

  return (
    <main className="shell">
      <article className="assistant-card profile">
        <span className="eyebrow">پروفایل تأییدشده</span>
        <h1>{lawyer.fullName}</h1>
        <p>
          {lawyer.city}
          {lawyer.province ? `، ${lawyer.province}` : ""}
        </p>

        {lawyer.licenseNumber && (
          <p>شماره پروانه: {lawyer.licenseNumber}</p>
        )}

        {lawyer.specialties.length > 0 && (
          <>
            <h2>حوزه‌های فعالیت</h2>
            <p>
              {lawyer.specialties
                .map((item) => item.area)
                .join(" · ")}
            </p>
          </>
        )}

        {lawyer.bio && (
          <>
            <h2>درباره وکیل</h2>
            <p>{lawyer.bio}</p>
          </>
        )}

        {lawyer.socialLinks.length > 0 && (
          <>
            <h2>پیوندها</h2>
            <div className="actions">
              {lawyer.socialLinks.filter((link) => isHttpUrl(link.url)).map((link) => (
                <a
                  key={link.platform}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {link.platform}
                </a>
              ))}
            </div>
          </>
        )}
      </article>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd(structuredData)
        }}
      />
    </main>
  );
}
