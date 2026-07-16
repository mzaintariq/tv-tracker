import { describe, expect, it } from "vitest";
import { parseCsv } from "./csv";

describe("strict CSV parser", () => {
  it("supports commas, quotes, and newlines in quoted fields", () => expect(parseCsv('a,b\n"one, two","line 1\nline 2"\n', ["a", "b"])).toEqual([{ a: "one, two", b: "line 1\nline 2" }]));
  it("rejects schema drift", () => expect(() => parseCsv("a,c\n1,2\n", ["a", "b"])).toThrow("unsupported schema"));
});
