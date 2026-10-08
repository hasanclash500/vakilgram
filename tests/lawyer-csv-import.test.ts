import { describe, expect, it } from "vitest";
import { parseLawyerCsv } from "../src/modules/lawyers/csv-import";

describe("parseLawyerCsv", () => {
  it("parses specialties and social links", () => {
    const rows = parseLawyerCsv([
      "full_name,slug,license_number,city,province,specialties,social_links,active",
      '"نمونه ساختگی","demo-lawyer","TEST-1","تهران","تهران","خانواده|قرارداد","website|https://example.com;telegram|https://t.me/example","true"'
    ].join("\n"));

    expect(rows).toHaveLength(1);
    expect(rows[0]?.specialties).toEqual(["خانواده", "قرارداد"]);
    expect(rows[0]?.socialLinks).toHaveLength(2);
    expect(rows[0]?.active).toBe(true);
  });

  it("rejects duplicate license numbers inside one file", () => {
    const csv = [
      "full_name,slug,license_number,city",
      "A Person,demo-a,TEST-1,Tehran",
      "B Person,demo-b,TEST-1,Tehran"
    ].join("\n");

    expect(() => parseLawyerCsv(csv)).toThrow(
      "Duplicate license_number"
    );
  });

  it("rejects non-http avatar URLs", () => {
    const csv = [
      "full_name,slug,city,avatar_url",
      "A Person,demo-a,Tehran,javascript:alert(1)"
    ].join("\n");

    expect(() => parseLawyerCsv(csv)).toThrow(
      "avatar_url must use HTTP(S)"
    );
  });
});
