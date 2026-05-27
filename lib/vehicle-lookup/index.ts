import { lookupViaMock } from "./mock";
import { lookupViaDataGoKr } from "./data-go-kr";

export type LookupResult = {
  source: "mock" | "data-go-kr";
  fallbackReason?: string;
  vehicle: {
    manufacturer?: string;
    model?: string;
    trim?: string;
    year?: number;
    fuel_type?: "gasoline" | "diesel" | "hybrid" | "ev" | "lpg";
    transmission?: "auto" | "manual";
    displacement_cc?: number;
    body_type?:
      | "sedan"
      | "suv"
      | "hatchback"
      | "coupe"
      | "wagon"
      | "van"
      | "pickup"
      | "convertible"
      | "other";
    vehicle_class?: "passenger" | "van" | "truck" | "special";
    engine_code?: string;
    color?: string;
    interior_color?: string;
    options?: string[];
    plate_number?: string;
  };
};

export type LookupError = {
  code: "invalid_plate" | "not_found" | "upstream_error";
  message: string;
};

export async function lookupVehicle(
  plate: string,
): Promise<{ ok: true; data: LookupResult } | { ok: false; error: LookupError }> {
  const normalized = plate.trim().replace(/\s+/g, "");
  if (normalized.length < 6 || normalized.length > 12) {
    return {
      ok: false,
      error: { code: "invalid_plate", message: "올바른 차량번호 형식이 아닙니다" },
    };
  }

  const provider = process.env.VEHICLE_LOOKUP_PROVIDER ?? "mock";

  if (provider === "data-go-kr") {
    try {
      const real = await lookupViaDataGoKr(normalized);
      if (real) return { ok: true, data: { source: "data-go-kr", vehicle: real } };
      // 응답이 비어있으면 mock 폴백
      const mock = lookupViaMock(normalized);
      return {
        ok: true,
        data: {
          source: "mock",
          fallbackReason: "공공 API 응답에 데이터가 없어 데모 값으로 채웠습니다",
          vehicle: mock,
        },
      };
    } catch (e) {
      const reason =
        e instanceof Error ? e.message : "공공 API 호출에 실패했습니다";
      const mock = lookupViaMock(normalized);
      return {
        ok: true,
        data: {
          source: "mock",
          fallbackReason: `${reason} — 데모 데이터로 채움 (API 활성화 후 자동 전환)`,
          vehicle: mock,
        },
      };
    }
  }

  const mock = lookupViaMock(normalized);
  return { ok: true, data: { source: "mock", vehicle: mock } };
}
