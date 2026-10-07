import { describe, expect, it } from "vitest";
import { CsvLawAdapter } from "../src/modules/laws/adapters/csv";
import { JsonLawAdapter } from "../src/modules/laws/adapters/json";

describe("law adapters", () => {
  it("groups CSV rows by law slug and preserves quoted commas", async () => {
    const csv = [
      "law_title,law_slug,law_status,article_number,article_text",
      '"قانون نمونه",sample-law,ACTIVE,1,"متن، دارای ویرگول"',
      '"قانون نمونه",sample-law,ACTIVE,2,"ماده دوم"'
    ].join("\n");

    const documents = await new CsvLawAdapter().parse(csv);

    expect(documents).toHaveLength(1);
    expect(documents[0]?.slug).toBe("sample-law");
    expect(documents[0]?.status).toBe("ACTIVE");
    expect(documents[0]?.articles).toHaveLength(2);
    expect(documents[0]?.articles[0]?.text).toBe("متن، دارای ویرگول");
  });

  it("rejects conflicting statuses for the same CSV law", async () => {
    const csv = [
      "law_title,law_slug,law_status,article_number,article_text",
      "Sample,sample-law,ACTIVE,1,one",
      "Sample,sample-law,REPEALED,2,two"
    ].join("\n");

    await expect(new CsvLawAdapter().parse(csv)).rejects.toThrow(
      "same law_status"
    );
  });

  it("accepts a single JSON law document with status", async () => {
    const documents = await new JsonLawAdapter().parse({
      title: "قانون نمونه",
      slug: "sample-law",
      status: "AMENDED",
      articles: [{ number: "1", text: "متن ماده" }]
    });

    expect(documents).toHaveLength(1);
    expect(documents[0]?.status).toBe("AMENDED");
    expect(documents[0]?.articles[0]?.number).toBe("1");
  });
});
