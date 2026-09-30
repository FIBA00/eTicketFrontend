import { describe, it, expect } from "vitest";
import {
  formatCents,
  parseToCents,
  formatETB,
  calcFareBreakdown,
} from "./money";

describe("mobile money utilities", () => {
  it("formats cents to Birr string", () => {
    expect(formatCents(100)).toBe("1.00");
    expect(formatCents(12345)).toBe("123.45");
    expect(formatCents(50)).toBe("0.50");
    expect(formatCents(0)).toBe("0.00");
  });

  it("parses Birr string to cents", () => {
    expect(parseToCents("1.00")).toBe(100);
    expect(parseToCents("123.45")).toBe(12345);
    expect(parseToCents("50")).toBe(5000);
    expect(parseToCents("0.05")).toBe(5);
  });

  it("formats ETB", () => {
    expect(formatETB(12345)).toBe("123.45 ETB");
  });

  describe("calcFareBreakdown (Parity with project_spec.md)", () => {
    it("applies 5% service charge for short trips (< 50 km)", () => {
      // 60.00 ETB tariff (6000 cents), 45 km
      const res = calcFareBreakdown({ fareCents: 6000, distanceKm: 45 });
      expect(res.serviceChargeCents).toBe(300); // 5% of 6000
      expect(res.vatCents).toBe(45); // 15% of 300
      expect(res.stationFeeCents).toBe(30); // 10% of 300
      expect(res.commissionCents).toBe(15); // 5% of 300
      expect(res.totalCents).toBe(6375); // 6000 + 300 + 45 + 30
    });

    it("applies 4% service charge for trips at exactly 50 km (boundary test)", () => {
      // At distanceKm = 50, spec specifies Case B (>= 50 km) applies 4%
      const res = calcFareBreakdown({ fareCents: 20000, distanceKm: 50 });
      expect(res.serviceChargeCents).toBe(800); // 4% of 20000
      expect(res.vatCents).toBe(120); // 15% of 800
      expect(res.stationFeeCents).toBe(80); // 10% of 800
      expect(res.commissionCents).toBe(40); // 5% of 800
      expect(res.totalCents).toBe(21000); // 20000 + 800 + 120 + 80
    });

    it("applies 4% service charge for long trips (> 50 km)", () => {
      // 200.00 ETB tariff (20000 cents), 150 km
      const res = calcFareBreakdown({ fareCents: 20000, distanceKm: 150 });
      expect(res.serviceChargeCents).toBe(800); // 4% of 20000
      expect(res.totalCents).toBe(21000);
    });
  });
});
