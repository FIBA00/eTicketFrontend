import { describe, it, expect } from "vitest";
import { formatCents, parseToCents, formatETB } from "@/lib/money-utils";

describe("Money Utils", () => {
  describe("formatCents", () => {
    it("formats cents to ETB string", () => {
      expect(formatCents(6375)).toBe("63.75");
      expect(formatCents(6000)).toBe("60.00");
      expect(formatCents(45)).toBe("0.45");
      expect(formatCents(0)).toBe("0.00");
    });
  });

  describe("parseToCents", () => {
    it("parses ETB string to cents", () => {
      expect(parseToCents("63.75")).toBe(6375);
      expect(parseToCents("60")).toBe(6000);
      expect(parseToCents("60.5")).toBe(6050);
    });

    it("throws on invalid input", () => {
      expect(() => parseToCents("abc")).toThrow();
      expect(() => parseToCents("-10")).toThrow();
    });
  });

  describe("formatETB", () => {
    it("formats with ETB suffix", () => {
      expect(formatETB(6375)).toBe("63.75 ETB");
    });
  });
});
