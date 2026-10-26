import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { RESERVED_SLUGS } from "@/core/tenancy/domain/value-objects/business-slug";
import { BUSINESS_KINDS } from "@/core/tenancy/domain/value-objects/business-kind";
import { MEMBER_ROLES } from "@/core/tenancy/domain/value-objects/member-role";

/**
 * scripts/manage-business.mjs cannot import the TypeScript domain, so it repeats
 * a few rules. This test fails if they ever drift apart, which would let the
 * script create a business the application then refuses to load.
 */
const script = readFileSync("scripts/manage-business.mjs", "utf8");

const listIn = (name: string): string[] => {
  const match = script.match(new RegExp(`const ${name} = \\[([\\s\\S]*?)\\];`));
  if (!match) throw new Error(`${name} not found in the script`);
  return [...match[1].matchAll(/"([^"]+)"/g)].map((item) => item[1]);
};

describe("manage-business script", () => {
  it("reserves exactly the words the domain reserves", () => {
    expect([...listIn("RESERVED")].sort()).toEqual([...RESERVED_SLUGS].sort());
  });

  it("offers exactly the domain's kinds and roles", () => {
    expect(listIn("KINDS")).toEqual([...BUSINESS_KINDS]);
    expect(listIn("ROLES")).toEqual([...MEMBER_ROLES]);
  });

  it("writes to the collections the repositories read", () => {
    for (const collection of ["businesses", "business_slugs", "business_members"]) {
      expect(script).toContain(`"${collection}"`);
    }
  });
});
