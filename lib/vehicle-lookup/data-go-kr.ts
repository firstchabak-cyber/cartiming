import type { LookupResult } from "./index";

// data.go.kr B553881 MnfctEntrsInfo_01/getMnfctEntrsInfo
// 응답 필드는 API 활성화 후 실제 응답으로 확정 예정.
// 현재 키 활성화 대기 중이라 호출 실패시 어댑터(index.ts)에서 mock으로 폴백됩니다.

const FUEL_MAP: Record<string, LookupResult["vehicle"]["fuel_type"]> = {
  가솔린: "gasoline",
  휘발유: "gasoline",
  디젤: "diesel",
  경유: "diesel",
  하이브리드: "hybrid",
  전기: "ev",
  LPG: "lpg",
  엘피지: "lpg",
};

const TRANSMISSION_MAP: Record<
  string,
  LookupResult["vehicle"]["transmission"]
> = {
  자동: "auto",
  오토: "auto",
  수동: "manual",
};

function mapFuel(raw?: string): LookupResult["vehicle"]["fuel_type"] | undefined {
  if (!raw) return undefined;
  return FUEL_MAP[raw.trim()];
}

function mapTransmission(
  raw?: string,
): LookupResult["vehicle"]["transmission"] | undefined {
  if (!raw) return undefined;
  return TRANSMISSION_MAP[raw.trim()];
}

export async function lookupViaDataGoKr(
  plate: string,
): Promise<LookupResult["vehicle"] | null> {
  const url = process.env.DATA_GO_KR_VEHICLE_LOOKUP_URL;
  const key = process.env.DATA_GO_KR_API_KEY;
  if (!url || !key) {
    throw new Error("DATA_GO_KR_API_KEY 또는 URL이 설정되지 않았습니다");
  }

  const params = new URLSearchParams({
    serviceKey: key,
    _type: "json",
    vhrno: plate,
  });

  const res = await fetch(`${url}?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
  });

  const text = await res.text();

  if (res.status === 403) {
    throw new Error("공공 API 키 활성화 대기 중 (403)");
  }
  if (!res.ok) {
    throw new Error(`공공 API 오류 (${res.status})`);
  }

  // 응답이 JSON인지 XML인지 확인
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    // XML로 왔거나 비정상 응답
    throw new Error("공공 API 응답 형식이 JSON이 아닙니다");
  }

  // 응답 구조는 활성화 후 실제 응답 확인하면서 매핑 보강 필요
  // 일반적인 data.go.kr 패턴: { response: { body: { items: [...] } } }
  const item = extractFirstItem(parsed);
  if (!item) return null;

  return {
    manufacturer: getString(item, ["mnfcCmpnyNm", "mnfctCmpnyNm", "carMknm"]),
    model: getString(item, ["carMdlNm", "carModelNm", "modelNm"]),
    trim: getString(item, ["carTrim", "trim", "trimNm"]),
    year: getYear(item, ["carYear", "yyyy", "modelYear"]),
    fuel_type: mapFuel(
      getString(item, ["fuelKnd", "fuelType", "fuelKindNm"]),
    ),
    transmission: mapTransmission(
      getString(item, ["transmsn", "transmission", "trnsmsnKnd"]),
    ),
    displacement_cc: getNumber(item, ["dspl", "displacement", "engDspl"]),
    color: getString(item, ["carColor", "color", "colorNm"]),
    engine_code: getString(item, ["engineNm", "engCd", "engineCode"]),
    plate_number: plate,
  };
}

function extractFirstItem(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== "object") return null;
  const candidates: unknown[] = [];

  function pushItems(node: unknown) {
    if (!node) return;
    if (Array.isArray(node)) {
      candidates.push(...node);
      return;
    }
    if (typeof node === "object") {
      const obj = node as Record<string, unknown>;
      if ("item" in obj) pushItems(obj.item);
      if ("items" in obj) pushItems(obj.items);
      if ("body" in obj) pushItems(obj.body);
      if ("response" in obj) pushItems(obj.response);
    }
  }

  pushItems(payload);
  return (candidates[0] as Record<string, unknown>) ?? null;
}

function getString(
  item: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const k of keys) {
    const v = item[k];
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return undefined;
}

function getNumber(
  item: Record<string, unknown>,
  keys: string[],
): number | undefined {
  for (const k of keys) {
    const v = item[k];
    if (typeof v === "number") return v;
    if (typeof v === "string") {
      const n = Number(v.replace(/,/g, ""));
      if (Number.isFinite(n)) return n;
    }
  }
  return undefined;
}

function getYear(
  item: Record<string, unknown>,
  keys: string[],
): number | undefined {
  const n = getNumber(item, keys);
  if (n == null) return undefined;
  if (n >= 1900 && n <= 2100) return n;
  // 6자리 YYYYMM 형식이면 앞 4자리
  if (n >= 190001 && n <= 210012) return Math.floor(n / 100);
  return undefined;
}
