import { z } from "zod";
import type {
  LawDocumentInput,
  LawDocumentStatus,
  LawSourceAdapter
} from "./types";

const REQUIRED_HEADERS = [
  "law_title",
  "law_slug",
  "article_number",
  "article_text"
] as const;

const STATUS_VALUES = new Set<LawDocumentStatus>([
  "ACTIVE",
  "AMENDED",
  "REPEALED",
  "UNKNOWN"
]);

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

  return rows.filter((item) =>
    item.some((value) => value.trim().length > 0)
  );
}

function optionalUrl(value: string | undefined): string | null {
  const clean = value?.trim();
  if (!clean) return null;
  return z.string().url().parse(clean);
}

function optionalStatus(value: string | undefined): LawDocumentStatus | undefined {
  const clean = value?.trim().toUpperCase();
  if (!clean) return undefined;
  if (!STATUS_VALUES.has(clean as LawDocumentStatus)) {
    throw new Error("Invalid law_status: " + clean);
  }
  return clean as LawDocumentStatus;
}

export class CsvLawAdapter implements LawSourceAdapter<string> {
  readonly name = "csv";

  async parse(input: string): Promise<LawDocumentInput[]> {
    const rows = parseCsvRows(input);
    if (rows.length < 2) {
      throw new Error("CSV must contain a header and at least one row");
    }

    const headers = rows[0]!.map((item) => item.trim());
    for (const header of REQUIRED_HEADERS) {
      if (!headers.includes(header)) {
        throw new Error("Missing CSV header: " + header);
      }
    }

    const indexOf = (name: string) => headers.indexOf(name);
    const groups = new Map<string, LawDocumentInput>();

    for (const values of rows.slice(1)) {
      const title = values[indexOf("law_title")]?.trim() ?? "";
      const slug = values[indexOf("law_slug")]?.trim() ?? "";
      const number = values[indexOf("article_number")]?.trim() ?? "";
      const text = values[indexOf("article_text")]?.trim() ?? "";

      if (!title || !slug || !number || !text) {
        throw new Error("CSV contains an incomplete law/article row");
      }

      const lawSourceUrl = optionalUrl(
        values[indexOf("law_source_url")]
      );
      const articleSourceUrl = optionalUrl(
        values[indexOf("article_source_url")]
      );
      const articleTitle =
        values[indexOf("article_title")]?.trim() || null;
      const status = optionalStatus(values[indexOf("law_status")]);

      const existing = groups.get(slug);
      if (existing) {
        if (existing.title !== title) {
          throw new Error(
            "Rows with the same law_slug must have the same law_title"
          );
        }

        if (
          status &&
          existing.status &&
          existing.status !== status
        ) {
          throw new Error(
            "Rows with the same law_slug must have the same law_status"
          );
        }

        if (status && !existing.status) {
          existing.status = status;
        }

        existing.articles.push({
          number,
          title: articleTitle,
          text,
          sourceUrl: articleSourceUrl
        });
      } else {
        groups.set(slug, {
          title,
          slug,
          status,
          sourceUrl: lawSourceUrl,
          articles: [
            {
              number,
              title: articleTitle,
              text,
              sourceUrl: articleSourceUrl
            }
          ]
        });
      }
    }

    return [...groups.values()];
  }
}
