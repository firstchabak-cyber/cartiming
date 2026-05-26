"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CarDiagram } from "@/components/vehicle/CarDiagram";
import {
  ALL_PARTS,
  MAINTENANCE_CATEGORIES,
  MAINTENANCE_PARTS,
} from "@/lib/constants/maintenance";

const schema = z.object({
  category: z.enum(MAINTENANCE_CATEGORIES),
  part: z.string().refine((v) => ALL_PARTS.includes(v), {
    message: "부위를 선택해주세요",
  }),
  performed_at: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 형식"),
  description: z.string().max(500).optional(),
  cost: z
    .string()
    .regex(/^\d*$/, "비용은 숫자만")
    .optional(),
});

type FormValues = z.infer<typeof schema>;

export function MaintenanceForm({ vehicleId }: { vehicleId: string }) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      category: "수리",
      part: "",
      performed_at: new Date().toISOString().slice(0, 10),
      description: "",
      cost: "",
    },
  });

  const selectedPart = watch("part");

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    const payload = {
      category: values.category,
      part: values.part,
      performed_at: values.performed_at,
      description: values.description?.trim() || null,
      cost:
        values.cost && values.cost.length > 0 ? Number(values.cost) : null,
    };

    try {
      const res = await fetch(`/api/vehicles/${vehicleId}/maintenance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSubmitError(data?.error ?? "저장에 실패했습니다");
        return;
      }
      router.push(`/vehicles/${vehicleId}`);
      router.refresh();
    } catch {
      setSubmitError("네트워크 오류로 저장에 실패했습니다");
    }
  });

  return (
    <Card>
      <div className="mb-3 rounded-lg border border-warning/30 bg-warning/5 p-3 text-xs text-foreground">
        <p className="font-semibold">감가 안내</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-4 text-muted">
          <li>앞범퍼·뒷범퍼·휠 교환/판금/수리는 시세 감가에 반영되지 않습니다.</li>
          <li>
            매각 전에 수리되지 않은 파손은 매수자 측 추정 수리비만큼 감가됩니다.
            정확한 시세를 위해 수리 완료 후 입력을 권장드립니다.
          </li>
        </ul>
      </div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">카테고리</label>
          <select
            {...register("category")}
            className="h-11 w-full rounded-xl border border-border bg-background px-3 text-base text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {MAINTENANCE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <CarDiagram
          value={selectedPart}
          onChange={(part) =>
            setValue("part", part, { shouldValidate: true })
          }
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">
            부위 (외판 외 항목은 아래에서 선택)
          </label>
          <select
            {...register("part")}
            className="h-11 w-full rounded-xl border border-border bg-background px-3 text-base text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">선택...</option>
            {Object.entries(MAINTENANCE_PARTS).map(([group, parts]) => (
              <optgroup key={group} label={group}>
                {parts.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {errors.part?.message && (
            <p className="text-xs text-danger">{errors.part.message}</p>
          )}
        </div>

        <Input
          label="작업 일자"
          placeholder="2026-05-20"
          error={errors.performed_at?.message}
          {...register("performed_at")}
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">
            상세 메모 (선택)
          </label>
          <textarea
            {...register("description")}
            rows={3}
            maxLength={500}
            placeholder="예) 좌회전 중 접촉사고, 좌측 앞범퍼 도색 + 흠집 제거"
            className="w-full rounded-xl border border-border bg-background p-3 text-base text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <Input
          label="비용 (원, 선택)"
          inputMode="numeric"
          placeholder="350000"
          error={errors.cost?.message}
          {...register("cost")}
        />

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
          <Button type="submit" fullWidth disabled={isSubmitting}>
            {isSubmitting ? "저장 중..." : "이력 저장"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
