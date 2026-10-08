import { z } from "zod";
import type { PrismaClient } from "@/generated/prisma/client";
import { isHttpUrl } from "@/lib/url/http";

const MAX_ROWS = 500;

export interface LawyerCsvRow {
  fullName: string;
  slug: string;
  licenseNumber: string | null;
  city: string;
  province: string | null;
  bio: string | null;
  avatarUrl: string | null;
  active: boolean;
  specialties: string[];
  socialLinks: Array<{
    platform: string;
    url: string;
  }>;
}

function parseCsvRows(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];

    if (quoted) {
      if (char === '"' && input[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell.replace(/\r$/, ""));
    rows.push(row);
  }

  return rows.filter((values) =>
    values.some((value) => value.trim().length > 0)
  );
}

function parseBoolean(value: string | undefined): boolean {
  const clean = value?.trim().toLowerCase();
  if (!clean) return true;
  if (["1", "true", "yes", "on"].includes(clean)) return true;
  if (["0", "false", "no", "off"].includes(clean)) return false;
  throw new Error("active must be true/false");
}

function optionalHttpUrl(
  value: string | undefined
): string | null {
  const clean = value?.trim();
  if (!clean) return null;

  if (!isHttpUrl(clean)) {
    throw new Error("avatar_url must use HTTP(S)");
  }

  return z.string().url().max(500).parse(clean);
}

function parseSocialLinks(
  value: string | undefined
): LawyerCsvRow["socialLinks"] {
  const clean = value?.trim();
  if (!clean) return [];

  return clean
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const separator = item.indexOf("|");
      if (separator < 1) {
        throw new Error(
          "social_links entries must be platform|https://..."
        );
      }

      const platform = item.slice(0, separator).trim();
      const url = item.slice(separator + 1).trim();

      if (
        platform.length < 1 ||
        platform.length > 40 ||
        !isHttpUrl(url)
      ) {
        throw new Error("Invalid social link");
      }

      return {
        platform,
        url: z.string().url().max(500).parse(url)
      };
    });
}

export function parseLawyerCsv(input: string): LawyerCsvRow[] {
  const rows = parseCsvRows(input);

  if (rows.length < 2) {
    throw new Error("CSV must include header and at least one row");
  }

  if (rows.length - 1 > MAX_ROWS) {
    throw new Error("CSV row limit exceeded");
  }

  const headers = rows[0]!.map((item) => item.trim());
  const required = ["full_name", "slug", "city"];

  for (const header of required) {
    if (!headers.includes(header)) {
      throw new Error("Missing CSV header: " + header);
    }
  }

  const indexOf = (name: string) => headers.indexOf(name);
  const result: LawyerCsvRow[] = [];
  const slugs = new Set<string>();
  const licenses = new Set<string>();

  for (const values of rows.slice(1)) {
    const fullName = values[indexOf("full_name")]?.trim() ?? "";
    const slug = values[indexOf("slug")]?.trim().toLowerCase() ?? "";
    const city = values[indexOf("city")]?.trim() ?? "";
    const licenseNumber =
      values[indexOf("license_number")]?.trim() || null;

    z.string().min(2).max(150).parse(fullName);
    z.string().regex(/^[a-z0-9-]{3,100}$/).parse(slug);
    z.string().min(2).max(100).parse(city);

    if (slugs.has(slug)) {
      throw new Error("Duplicate slug in CSV: " + slug);
    }
    slugs.add(slug);

    if (licenseNumber) {
      z.string().max(100).parse(licenseNumber);
      if (licenses.has(licenseNumber)) {
        throw new Error(
          "Duplicate license_number in CSV: " + licenseNumber
        );
      }
      licenses.add(licenseNumber);
    }

    const specialties = [
      ...new Set(
        (values[indexOf("specialties")] ?? "")
          .split("|")
          .map((item) => item.trim())
          .filter(Boolean)
      )
    ];

    if (specialties.length > 30) {
      throw new Error("Too many specialties");
    }

    result.push({
      fullName,
      slug,
      licenseNumber,
      city,
      province: values[indexOf("province")]?.trim() || null,
      bio: values[indexOf("bio")]?.trim() || null,
      avatarUrl: optionalHttpUrl(values[indexOf("avatar_url")]),
      active: parseBoolean(values[indexOf("active")]),
      specialties,
      socialLinks: parseSocialLinks(
        values[indexOf("social_links")]
      )
    });
  }

  return result;
}

export async function importLawyerCsv(
  prisma: PrismaClient,
  input: string
) {
  const rows = parseLawyerCsv(input);

  const existing = await prisma.lawyer.findMany({
    where: {
      OR: [
        { slug: { in: rows.map((row) => row.slug) } },
        {
          licenseNumber: {
            in: rows
              .map((row) => row.licenseNumber)
              .filter((value): value is string => Boolean(value))
          }
        }
      ]
    },
    select: {
      slug: true,
      licenseNumber: true
    }
  });

  if (existing.length > 0) {
    throw new Error(
      "CSV conflicts with existing lawyer slug or license number"
    );
  }

  const created = await prisma.$transaction(async (tx) => {
    const ids: string[] = [];

    for (const row of rows) {
      const lawyer = await tx.lawyer.create({
        data: {
          fullName: row.fullName,
          slug: row.slug,
          licenseNumber: row.licenseNumber,
          city: row.city,
          province: row.province,
          bio: row.bio,
          avatarUrl: row.avatarUrl,
          verified: false,
          active: row.active,
          specialties: {
            create: row.specialties.map((area) => ({ area }))
          },
          socialLinks: {
            create: row.socialLinks
          }
        },
        select: { id: true }
      });

      ids.push(lawyer.id);
    }

    return ids;
  });

  return {
    created: created.length,
    lawyerIds: created
  };
}
