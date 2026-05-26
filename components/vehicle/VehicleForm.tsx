"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  BODY_TYPES,
  BODY_TYPE_LABELS,
  VEHICLE_CLASSES,
  VEHICLE_CLASS_LABELS,
  FUEL_LABELS,
  TRANSMISSION_LABELS,
  OPTION_GROUPS,
  ALL_OPTIONS,
} from "@/lib/constants/vehicle";
import type { LookupResult } from "@/lib/vehicle-lookup";

type LookupVehicle = LookupResult["vehicle"];

const schema = z.object({
  manufacturer: z.string().min(1, "제조사를 입력해주세요"),
  model: z.string().min(1, "모델명을 입력해주세요"),
  year: z.string().regex(/^\d{4}$/, "4자리 연식"),
  mileage: z.string().regex(/^\d+$/, "주행거리는 숫자만"),
  trim: z.string().optional(),
  registered_at: z
    .string()
    .regex(/^(\d{4}-\d{2}-\d{2})?$/, "YYYY-MM-DD")
    .optional(),
  fuel_type: z.enum(["", "gasoline", "diesel", "hybrid", "ev", "lpg"]),
  transmission: z.enum(["", "auto", "manual"]),
  color: z.string().optional(),
  plate_number: z.string().optional(),
  vin: z.string().optional(),
  displacement_cc: z.string().regex(/^\d*$/, "숫자만").optional(),
  body_type: z.enum([
    "",
    "sedan",
    "suv",
    "hatchback",
    "coupe",
    "wagon",
    "van",
    "pickup",
    "convertible",
    "other",
  ]),
  vehicle_class: z.enum(["", "passenger", "van", "truck", "special"]),
  engine_code: z.string().optional(),
  inspection_valid_until: z
    .string()
    .regex(/^(\d{4}-\d{2}-\d{2})?$/, "YYYY-MM-DD")
    .optional(),
  seating_capacity: z.string().regex(/^\d*$/, "숫자만").optional(),
  extra_options_text: z.string().optional(),
  loan_principal: z.string().regex(/^\d*$/, "숫자만").optional(),
  loan_started_at: z
    .string()
    .regex(/^(\d{4}-\d{2}-\d{2})?$/, "YYYY-MM-DD")
    .optional(),
  loan_months: z.string().regex(/^\d*$/, "숫자만").optional(),
  loan_apr: z
    .string()
    .regex(/^(\d{1,2}(\.\d{1,3})?)?$/, "예: 5.250")
    .optional(),
});

type FormValues = z.infer<typeof schema>;

export type VehicleFormDefaults = {
  id?: string;
  manufacturer?: string;
  model?: string;
  trim?: string | null;
  year?: number | null;
  mileage?: number | null;
  registered_at?: string | null;
  fuel_type?: string | null;
  transmission?: string | null;
  color?: string | null;
  plate_number?: string | null;
  vin?: string | null;
  displacement_cc?: number | null;
  body_type?: string | null;
  vehicle_class?: string | null;
  engine_code?: string | null;
  inspection_valid_until?: string | null;
  seating_capacity?: number | null;
  options?: string[] | null;
  loan_principal?: number | null;
  loan_started_at?: string | null;
  loan_months?: number | null;
  loan_apr?: number | null;
};

type Props =
  | { mode: "new"; vehicle?: undefined }
  | { mode: "edit"; vehicle: VehicleFormDefaults };

export function VehicleForm(props: Props) {
  const router = useRouter();
  const v = props.vehicle;
  const isEdit = props.mode === "edit";

  const initialOptions = new Set<string>(
    (v?.options ?? []).filter((o) => ALL_OPTIONS.includes(o)),
  );
  const initialExtraOptions = (v?.options ?? [])
    .filter((o) => !ALL_OPTIONS.includes(o))
    .join(", ");

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [regOpen, setRegOpen] = useState(false);
  const [optOpen, setOptOpen] = useState((v?.options ?? []).length > 0);
  const [loanOpen, setLoanOpen] = useState(
    v?.loan_principal != null && v.loan_principal > 0,
  );
  const [checkedOptions, setCheckedOptions] = useState<Set<string>>(initialOptions);

  // 차량번호 자동조회
  const [lookupPlate, setLookupPlate] = useState(v?.plate_number ?? "");
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupMsg, setLookupMsg] = useState<{
    tone: "info" | "warn" | "error";
    text: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      manufacturer: v?.manufacturer ?? "",
      model: v?.model ?? "",
      trim: v?.trim ?? "",
      year: v?.year != null ? String(v.year) : "",
      mileage: v?.mileage != null ? String(v.mileage) : "",
      registered_at: v?.registered_at?.slice(0, 10) ?? "",
      fuel_type: (v?.fuel_type as FormValues["fuel_type"]) ?? "",
      transmission: (v?.transmission as FormValues["transmission"]) ?? "",
      color: v?.color ?? "",
      plate_number: v?.plate_number ?? "",
      vin: v?.vin ?? "",
      displacement_cc:
        v?.displacement_cc != null ? String(v.displacement_cc) : "",
      body_type: (v?.body_type as FormValues["body_type"]) ?? "",
      vehicle_class:
        (v?.vehicle_class as FormValues["vehicle_class"]) ?? "",
      engine_code: v?.engine_code ?? "",
      inspection_valid_until:
        v?.inspection_valid_until?.slice(0, 10) ?? "",
      seating_capacity:
        v?.seating_capacity != null ? String(v.seating_capacity) : "",
      extra_options_text: initialExtraOptions,
      loan_principal:
        v?.loan_principal != null ? String(v.loan_principal) : "",
      loan_started_at: v?.loan_started_at?.slice(0, 10) ?? "",
      loan_months: v?.loan_months != null ? String(v.loan_months) : "",
      loan_apr: v?.loan_apr != null ? String(v.loan_apr) : "",
    },
  });

  const toggleOption = (opt: string) => {
    setCheckedOptions((prev) => {
      const next = new Set(prev);
      if (next.has(opt)) next.delete(opt);
      else next.add(opt);
      return next;
    });
  };

  const applyLookup = async () => {
    const trimmed = lookupPlate.trim().replace(/\s+/g, "");
    if (trimmed.length < 4) {
      setLookupMsg({ tone: "error", text: "차량번호를 정확히 입력해주세요" });
      return;
    }
    setLookupBusy(true);
    setLookupMsg(null);
    try {
      const res = await fetch("/api/vehicles/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plate: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLookupMsg({
          tone: "error",
          text: data?.error ?? "조회에 실패했습니다",
        });
        return;
      }
      const v = data.vehicle as LookupVehicle;
      if (v.manufacturer)
        setValue("manufacturer", v.manufacturer, { shouldValidate: true });
      if (v.model) setValue("model", v.model, { shouldValidate: true });
      if (v.trim) setValue("trim", v.trim);
      if (v.year) setValue("year", String(v.year), { shouldValidate: true });
      if (v.fuel_type) setValue("fuel_type", v.fuel_type);
      if (v.transmission) setValue("transmission", v.transmission);
      if (v.displacement_cc)
        setValue("displacement_cc", String(v.displacement_cc));
      if (v.body_type) setValue("body_type", v.body_type);
      if (v.vehicle_class) setValue("vehicle_class", v.vehicle_class);
      if (v.engine_code) setValue("engine_code", v.engine_code);
      if (v.color) setValue("color", v.color);
      if (v.plate_number) setValue("plate_number", v.plate_number);
      if (v.options && v.options.length > 0) {
        const matched = v.options.filter((o) => ALL_OPTIONS.includes(o));
        setCheckedOptions(new Set(matched));
        const extra = v.options.filter((o) => !ALL_OPTIONS.includes(o));
        setValue("extra_options_text", extra.join(", "));
        setOptOpen(true);
      }
      setRegOpen(true);
      if (data.source === "mock") {
        setLookupMsg({
          tone: "warn",
          text:
            data.fallbackReason ??
            "데모 데이터입니다. 실제 정보는 직접 확인·수정해주세요.",
        });
      } else {
        setLookupMsg({
          tone: "info",
          text: "공공 API에서 조회된 정보로 채워졌습니다. 필요하면 수정하세요.",
        });
      }
    } catch {
      setLookupMsg({
        tone: "error",
        text: "네트워크 오류로 조회에 실패했습니다",
      });
    } finally {
      setLookupBusy(false);
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);

    const hasAnyLoan =
      !!values.loan_principal ||
      !!values.loan_started_at ||
      !!values.loan_months ||
      !!values.loan_apr;
    const allLoan =
      !!values.loan_principal &&
      !!values.loan_started_at &&
      !!values.loan_months &&
      !!values.loan_apr;
    if (hasAnyLoan && !allLoan) {
      setSubmitError(
        "대출 정보는 원금/실행일/기간/금리 4개를 모두 입력하거나 모두 비워주세요",
      );
      return;
    }

    const extraList = (values.extra_options_text ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const optionsCombined = [...checkedOptions, ...extraList];

    const payload: Record<string, unknown> = {
      manufacturer: values.manufacturer.trim(),
      model: values.model.trim(),
      year: Number(values.year),
      mileage: Number(values.mileage),
      trim: values.trim?.trim() || (isEdit ? null : undefined),
      registered_at:
        values.registered_at?.trim() ||
        (isEdit ? null : `${values.year}-01-01`),
      fuel_type: values.fuel_type || (isEdit ? null : undefined),
      transmission: values.transmission || (isEdit ? null : undefined),
      color: values.color?.trim() || (isEdit ? null : undefined),
      plate_number: values.plate_number?.trim() || (isEdit ? null : undefined),
      vin: values.vin?.trim() || (isEdit ? null : undefined),
      displacement_cc: values.displacement_cc
        ? Number(values.displacement_cc)
        : isEdit
          ? null
          : undefined,
      body_type: values.body_type || (isEdit ? null : undefined),
      vehicle_class: values.vehicle_class || (isEdit ? null : undefined),
      engine_code: values.engine_code?.trim() || (isEdit ? null : undefined),
      inspection_valid_until:
        values.inspection_valid_until?.trim() || (isEdit ? null : undefined),
      seating_capacity: values.seating_capacity
        ? Number(values.seating_capacity)
        : isEdit
          ? null
          : undefined,
      options:
        optionsCombined.length > 0
          ? optionsCombined
          : isEdit
            ? null
            : undefined,
      loan_principal: hasAnyLoan
        ? Number(values.loan_principal)
        : isEdit
          ? null
          : undefined,
      loan_started_at: hasAnyLoan ? values.loan_started_at : isEdit ? null : undefined,
      loan_months: hasAnyLoan ? Number(values.loan_months) : isEdit ? null : undefined,
      loan_apr: hasAnyLoan ? Number(values.loan_apr) : isEdit ? null : undefined,
    };

    // 등록(POST)에서는 undefined 값들 제거
    if (!isEdit) {
      for (const k of Object.keys(payload)) {
        if (payload[k] === undefined) delete payload[k];
      }
    }

    try {
      const url = isEdit ? `/api/vehicles/${v!.id}` : "/api/vehicles";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSubmitError(data?.error ?? "저장에 실패했습니다");
        return;
      }
      const data = isEdit ? null : await res.json().catch(() => null);
      const targetId = isEdit ? v!.id : data?.id;
      router.push(targetId ? `/vehicles/${targetId}` : "/garage");
      router.refresh();
    } catch {
      setSubmitError("네트워크 오류로 저장에 실패했습니다");
    }
  });

  return (
    <Card>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {/* 차량번호 자동조회 */}
        <section className="flex flex-col gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <p className="text-sm font-semibold text-foreground">
            차량번호로 자동 채우기
          </p>
          <p className="text-xs text-muted">
            번호를 입력하고 조회하면 제조사·모델·트림·옵션까지 자동 채워집니다.
            나머지 정보는 직접 수정·보완 가능합니다.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={lookupPlate}
              onChange={(e) => setLookupPlate(e.target.value)}
              placeholder="예) 12가 3456"
              className="h-11 flex-1 rounded-xl border border-border bg-background px-3 text-base text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <Button
              type="button"
              onClick={applyLookup}
              disabled={lookupBusy}
            >
              {lookupBusy ? "조회 중..." : "조회"}
            </Button>
          </div>
          {lookupMsg && (
            <p
              className={
                lookupMsg.tone === "error"
                  ? "text-xs text-danger"
                  : lookupMsg.tone === "warn"
                    ? "text-xs text-warning"
                    : "text-xs text-success"
              }
            >
              {lookupMsg.text}
            </p>
          )}
        </section>

        {/* 필수 정보 */}
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-foreground">필수 정보</h2>
          <Input
            label="제조사"
            placeholder="예) 현대"
            error={errors.manufacturer?.message}
            {...register("manufacturer")}
          />
          <Input
            label="모델명"
            placeholder="예) 그랜저"
            error={errors.model?.message}
            {...register("model")}
          />
          <Input
            label="연식"
            placeholder="2022"
            inputMode="numeric"
            error={errors.year?.message}
            {...register("year")}
          />
          <Input
            label="주행거리 (km)"
            placeholder="40000"
            inputMode="numeric"
            error={errors.mileage?.message}
            {...register("mileage")}
          />
        </section>

        {/* 등록증 정보 */}
        <CollapsibleHeader
          label="등록증 정보 (선택)"
          open={regOpen}
          onToggle={() => setRegOpen((v) => !v)}
        />
        {regOpen && (
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-background p-3">
            <Input
              label="트림"
              placeholder="예) 익스클루시브"
              {...register("trim")}
            />
            <Input
              label="최초 등록일 (YYYY-MM-DD)"
              placeholder="2022-03-15"
              error={errors.registered_at?.message}
              {...register("registered_at")}
            />
            <Input
              label="차대번호 VIN"
              placeholder="11~17자"
              {...register("vin")}
            />
            <Input
              label="배기량 (cc)"
              inputMode="numeric"
              placeholder="2497"
              error={errors.displacement_cc?.message}
              {...register("displacement_cc")}
            />
            <Input
              label="원동기 형식"
              placeholder="예) G6DM"
              {...register("engine_code")}
            />
            <SelectField
              label="차종"
              {...register("vehicle_class")}
              options={[
                { value: "", label: "선택 안 함" },
                ...VEHICLE_CLASSES.map((c) => ({
                  value: c,
                  label: VEHICLE_CLASS_LABELS[c],
                })),
              ]}
            />
            <SelectField
              label="차체 형상"
              {...register("body_type")}
              options={[
                { value: "", label: "선택 안 함" },
                ...BODY_TYPES.map((b) => ({
                  value: b,
                  label: BODY_TYPE_LABELS[b],
                })),
              ]}
            />
            <SelectField
              label="연료"
              {...register("fuel_type")}
              options={[
                { value: "", label: "선택 안 함" },
                ...Object.entries(FUEL_LABELS).map(([value, label]) => ({
                  value,
                  label,
                })),
              ]}
            />
            <SelectField
              label="변속기"
              {...register("transmission")}
              options={[
                { value: "", label: "선택 안 함" },
                ...Object.entries(TRANSMISSION_LABELS).map(([value, label]) => ({
                  value,
                  label,
                })),
              ]}
            />
            <Input
              label="승차 정원"
              inputMode="numeric"
              placeholder="5"
              error={errors.seating_capacity?.message}
              {...register("seating_capacity")}
            />
            <Input
              label="검사 유효기간 (YYYY-MM-DD)"
              placeholder="2026-09-30"
              error={errors.inspection_valid_until?.message}
              {...register("inspection_valid_until")}
            />
            <Input
              label="색상"
              placeholder="예) 검정"
              {...register("color")}
            />
            <Input
              label="번호판"
              placeholder="예) 12가 3456"
              {...register("plate_number")}
            />
          </div>
        )}

        {/* 옵션 */}
        <CollapsibleHeader
          label="추가 옵션 (선택)"
          open={optOpen}
          onToggle={() => setOptOpen((v) => !v)}
        />
        {optOpen && (
          <div className="flex flex-col gap-4 rounded-lg border border-border bg-background p-3">
            {OPTION_GROUPS.map((g) => (
              <div key={g.group} className="flex flex-col gap-2">
                <p className="text-xs font-semibold text-muted">{g.group}</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {g.items.map((opt) => {
                    const checked = checkedOptions.has(opt);
                    return (
                      <label
                        key={opt}
                        className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-2 py-1.5 text-xs has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleOption(opt)}
                          className="h-3.5 w-3.5 accent-primary"
                        />
                        <span className="select-none text-foreground">
                          {opt}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
            <Input
              label="기타 옵션 (쉼표로 구분)"
              placeholder="예) JBL 사운드, 디지털 키"
              {...register("extra_options_text")}
            />
          </div>
        )}

        {/* 대출 */}
        <CollapsibleHeader
          label="대출 정보 (선택)"
          open={loanOpen}
          onToggle={() => setLoanOpen((v) => !v)}
        />
        {loanOpen && (
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-background p-3">
            <p className="text-xs text-muted">
              원리금 균등상환 기준으로 잔액과 매각 시 순수령액을 계산합니다.
              원금·실행일·기간·금리 4개를 모두 입력해야 적용됩니다.
            </p>
            <Input
              label="대출 원금 (원)"
              inputMode="numeric"
              placeholder="20000000"
              error={errors.loan_principal?.message}
              {...register("loan_principal")}
            />
            <Input
              label="대출 실행일 (YYYY-MM-DD)"
              placeholder="2022-03-15"
              error={errors.loan_started_at?.message}
              {...register("loan_started_at")}
            />
            <Input
              label="대출 기간 (개월)"
              inputMode="numeric"
              placeholder="60"
              error={errors.loan_months?.message}
              {...register("loan_months")}
            />
            <Input
              label="연 금리 (%)"
              inputMode="decimal"
              placeholder="5.25"
              error={errors.loan_apr?.message}
              {...register("loan_apr")}
            />
          </div>
        )}

        {submitError && <p className="text-sm text-danger">{submitError}</p>}

        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            fullWidth
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            취소
          </Button>
          <Button type="submit" fullWidth size="lg" disabled={isSubmitting}>
            {isSubmitting ? "저장 중..." : isEdit ? "수정 저장" : "등록하기"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function CollapsibleHeader({
  label,
  open,
  onToggle,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground"
    >
      <span>{label}</span>
      {open ? (
        <ChevronUp className="h-4 w-4" />
      ) : (
        <ChevronDown className="h-4 w-4" />
      )}
    </button>
  );
}

type SelectFieldProps = {
  label: string;
  options: { value: string; label: string }[];
} & React.SelectHTMLAttributes<HTMLSelectElement>;

function SelectField({ label, options, ...rest }: SelectFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <select
        {...rest}
        className="h-11 w-full rounded-xl border border-border bg-background px-3 text-base text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
