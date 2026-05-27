"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, type Control } from "react-hook-form";
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
  fuel_type: z.string().optional(),
  transmission: z.string().optional(),
  color: z.string().optional(),
  interior_color: z.string().optional(),
  plate_number: z.string().optional(),
  vin: z.string().optional(),
  displacement_cc: z.string().regex(/^\d*$/, "숫자만").optional(),
  body_type: z.string().optional(),
  vehicle_class: z.string().optional(),
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
  interior_color?: string | null;
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
  const errorBannerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (submitError && errorBannerRef.current) {
      errorBannerRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [submitError]);
  const [regOpen, setRegOpen] = useState(false);
  const [optOpen, setOptOpen] = useState((v?.options ?? []).length > 0);
  const [loanOpen, setLoanOpen] = useState(
    v?.loan_principal != null && v.loan_principal > 0,
  );
  const [checkedOptions, setCheckedOptions] = useState<Set<string>>(initialOptions);

  // 등록증 사진 업로드
  const [imageBusy, setImageBusy] = useState(false);
  const [imageMsg, setImageMsg] = useState<{
    tone: "info" | "warn" | "error";
    text: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    control,
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
      interior_color: v?.interior_color ?? "",
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

  const applyImageLookup = async (file: File) => {
    setImageBusy(true);
    setImageMsg(null);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/vehicles/lookup-from-image", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setImageMsg({
          tone: "error",
          text: data?.error ?? "분석에 실패했습니다",
        });
        return;
      }
      const vv = (data.vehicle ?? {}) as LookupVehicle;
      const filled: string[] = [];
      if (vv.manufacturer) {
        setValue("manufacturer", vv.manufacturer, { shouldValidate: true });
        filled.push("제조사");
      }
      if (vv.model) {
        setValue("model", vv.model, { shouldValidate: true });
        filled.push("모델");
      }
      if (vv.year) {
        setValue("year", String(vv.year), { shouldValidate: true });
        filled.push("연식");
      }
      if (vv.fuel_type) {
        setValue("fuel_type", vv.fuel_type);
        filled.push("연료");
      }
      if (vv.transmission) {
        setValue("transmission", vv.transmission);
      }
      if (vv.displacement_cc) {
        setValue("displacement_cc", String(vv.displacement_cc));
        filled.push("배기량");
      }
      if (vv.body_type) {
        setValue("body_type", vv.body_type);
        filled.push("차체");
      }
      if (vv.vehicle_class) {
        setValue("vehicle_class", vv.vehicle_class);
        filled.push("차종");
      }
      if (vv.engine_code) {
        setValue("engine_code", vv.engine_code);
        filled.push("원동기형식");
      }
      if (vv.color) {
        setValue("color", vv.color);
        filled.push("외장색상");
      }
      if (vv.plate_number) {
        setValue("plate_number", vv.plate_number);
        filled.push("번호판");
      }
      const extra = (data.extra ?? {}) as {
        registered_at?: string | null;
        seating_capacity?: number | null;
        vin?: string | null;
      };
      if (extra.registered_at) {
        setValue("registered_at", extra.registered_at);
        filled.push("등록일");
      }
      if (extra.seating_capacity) {
        setValue("seating_capacity", String(extra.seating_capacity));
        filled.push("승차정원");
      }
      if (extra.vin) {
        setValue("vin", extra.vin);
        filled.push("차대번호");
      }
      setRegOpen(true);
      if (filled.length === 0) {
        setImageMsg({
          tone: "warn",
          text: "등록증에서 정보를 거의 읽지 못했습니다. 사진을 더 또렷하게 다시 찍어주세요.",
        });
      } else {
        setImageMsg({
          tone: "info",
          text: `등록증에서 ${filled.length}개 항목을 채웠습니다 (${filled.join(", ")}). 외장/내장 색상, 트림, 옵션은 직접 입력해주세요.`,
        });
      }
    } catch {
      setImageMsg({
        tone: "error",
        text: "네트워크 오류로 분석에 실패했습니다",
      });
    } finally {
      setImageBusy(false);
    }
  };

  const onSubmit = handleSubmit(
    async (values) => {
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
      interior_color:
        values.interior_color?.trim() || (isEdit ? null : undefined),
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
        const base = data?.error ?? `저장에 실패했습니다 (HTTP ${res.status})`;
        const detail = data?.detail
          ? ` — ${data.detail}`
          : data?.issues
            ? ` — ${Object.entries(data.issues)
                .map(([k, v]) => `${k}: ${(v as string[]).join(", ")}`)
                .join(" / ")}`
            : "";
        setSubmitError(base + detail);
        return;
      }
      const data = isEdit ? null : await res.json().catch(() => null);
      const targetId = isEdit ? v!.id : data?.id;
      router.push(targetId ? `/vehicles/${targetId}` : "/garage");
      router.refresh();
    } catch {
      setSubmitError("네트워크 오류로 저장에 실패했습니다");
    }
    },
    (formErrors) => {
      const labels: Record<string, string> = {
        manufacturer: "제조사",
        model: "모델명",
        year: "연식 (4자리 숫자)",
        mileage: "주행거리",
      };
      const messages = Object.entries(formErrors).map(([k, err]) => {
        const label = labels[k] ?? k;
        const msg = (err as { message?: string })?.message;
        return msg ? `${label} (${msg})` : label;
      });
      if (messages.length > 0) {
        setSubmitError(`필수 정보가 빠졌거나 잘못됐습니다: ${messages.join(", ")}`);
      }
    },
  );

  return (
    <Card>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {submitError && (
          <div
            ref={errorBannerRef}
            className="flex items-start gap-2 rounded-lg border border-danger bg-danger/10 px-3 py-2 text-sm text-danger"
          >
            <span className="font-semibold">⚠️ 저장 실패</span>
            <span className="flex-1 break-words">{submitError}</span>
            <button
              type="button"
              onClick={() => setSubmitError(null)}
              className="text-danger/70 hover:text-danger"
              aria-label="닫기"
            >
              ×
            </button>
          </div>
        )}

        {/* 차량등록증 사진으로 자동 채우기 */}
        <section className="flex flex-col gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <p className="text-sm font-semibold text-foreground">
            차량등록증 사진으로 자동 채우기
          </p>
          <p className="text-xs text-muted">
            등록증을 촬영하거나 사진을 업로드하면 제조사·모델·연식·연료·배기량·차대번호·번호판
            등을 AI 가 읽어서 채워드립니다. 외장/내장 색상, 트림, 옵션은 직접 입력하세요.
          </p>
          <label className="flex h-11 cursor-pointer items-center justify-center rounded-xl border border-dashed border-primary/40 bg-background px-3 text-sm font-medium text-primary hover:bg-primary/5">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              className="hidden"
              disabled={imageBusy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) applyImageLookup(f);
                e.target.value = "";
              }}
            />
            {imageBusy ? "분석 중... 잠시만요" : "📷 등록증 사진 선택/촬영"}
          </label>
          <p className="text-[11px] text-muted">
            ⚠️ 사진은 Google AI 처리 과정에서만 사용되고 서버에 저장되지 않습니다.
            소유자 이름·주소가 우려되면 그 부분을 가리고 촬영해도 됩니다.
          </p>
          {imageMsg && (
            <p
              className={
                imageMsg.tone === "error"
                  ? "text-xs text-danger"
                  : imageMsg.tone === "warn"
                    ? "text-xs text-warning"
                    : "text-xs text-success"
              }
            >
              {imageMsg.text}
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
          <NumberInput
            name="mileage"
            control={control}
            label="주행거리 (km)"
            placeholder="40,000"
            error={errors.mileage?.message}
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
            <NumberInput
              name="displacement_cc"
              control={control}
              label="배기량 (cc)"
              placeholder="2,497"
              error={errors.displacement_cc?.message}
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
              label="외장 색상"
              placeholder="예) 어비스 블랙 펄"
              {...register("color")}
            />
            <Input
              label="내장 색상"
              placeholder="예) 블랙 모노톤, 베이지 투톤"
              {...register("interior_color")}
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
            <NumberInput
              name="loan_principal"
              control={control}
              label="대출 원금 (원)"
              placeholder="20,000,000"
              error={errors.loan_principal?.message}
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

type NumberInputProps = {
  name: "mileage" | "displacement_cc" | "loan_principal";
  control: Control<FormValues>;
  label: string;
  placeholder?: string;
  error?: string;
};

function NumberInput({
  name,
  control,
  label,
  placeholder,
  error,
}: NumberInputProps) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => {
        const digits = String(field.value ?? "").replace(/[^0-9]/g, "");
        const display = digits
          ? new Intl.NumberFormat("ko-KR").format(Number(digits))
          : "";
        return (
          <Input
            label={label}
            placeholder={placeholder}
            inputMode="numeric"
            value={display}
            onChange={(e) =>
              field.onChange(e.target.value.replace(/[^0-9]/g, ""))
            }
            onBlur={field.onBlur}
            name={field.name}
            ref={field.ref}
            error={error}
          />
        );
      }}
    />
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
