"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

type Initial = {
  business_name: string;
  business_reg_number: string;
  contact_phone: string;
  location: string | null;
  business_reg_doc_path?: string | null;
  dealer_card_doc_path?: string | null;
} | null;

const ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
];
const MAX_BYTES = 10 * 1024 * 1024; // 10MB

type DocKind = "businessReg" | "dealerCard";

export function DealerRegisterForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [name, setName] = useState(initial?.business_name ?? "");
  const [reg, setReg] = useState(initial?.business_reg_number ?? "");
  const [phone, setPhone] = useState(initial?.contact_phone ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 서류 파일 (새로 선택한 것). 기존 등록 여부는 initial 경로로 판단.
  const [regFile, setRegFile] = useState<File | null>(null);
  const [cardFile, setCardFile] = useState<File | null>(null);
  const hasRegDoc = !!initial?.business_reg_doc_path || !!regFile;
  const hasCardDoc = !!initial?.dealer_card_doc_path || !!cardFile;

  const pickFile = (kind: DocKind, file: File | null) => {
    setError(null);
    if (!file) return;
    if (!ALLOWED_MIME.includes(file.type)) {
      setError("서류는 사진(JPG/PNG) 또는 PDF 파일만 업로드할 수 있어요");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("파일 1개당 10MB 이하만 업로드할 수 있어요");
      return;
    }
    if (kind === "businessReg") setRegFile(file);
    else setCardFile(file);
  };

  const uploadDoc = async (
    userId: string,
    kind: DocKind,
    file: File,
  ): Promise<string> => {
    const supabase = createClient();
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}`;
    const path = `${userId}/${kind}-${id}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("dealer-docs")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (upErr) throw new Error(`서류 업로드 실패: ${upErr.message}`);
    return path;
  };

  const submit = async () => {
    if (!name.trim() || !reg.trim() || !phone.trim()) {
      setError("상호·사업자번호·연락처는 필수입니다");
      return;
    }
    if (!hasRegDoc) {
      setError("사업자등록증을 첨부해주세요");
      return;
    }
    if (!hasCardDoc) {
      setError("매매사원증을 첨부해주세요");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // 업로드는 본인 폴더(user_id/...) 경로 사용 — 로그인 사용자 id 확보
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) {
        setError("로그인 세션을 확인하지 못했습니다. 다시 로그인해주세요.");
        return;
      }

      let regPath: string | undefined;
      let cardPath: string | undefined;
      if (regFile) regPath = await uploadDoc(userId, "businessReg", regFile);
      if (cardFile) cardPath = await uploadDoc(userId, "dealerCard", cardFile);

      const res = await fetch("/api/dealers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: name.trim(),
          businessRegNumber: reg.trim(),
          contactPhone: phone.trim(),
          location: location.trim() || undefined,
          businessRegDocPath: regPath,
          dealerCardDocPath: cardPath,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? `등록 실패 (HTTP ${res.status})`);
        return;
      }
      setRegFile(null);
      setCardFile(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "네트워크 오류");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <div className="rounded-lg border border-danger bg-danger/10 px-3 py-2 text-sm text-danger">
          ⚠️ {error}
        </div>
      )}
      <Card className="flex flex-col gap-3">
        <Input
          label="상호 (사업자명)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="○○ 모터스"
        />
        <Input
          label="사업자등록번호"
          value={reg}
          onChange={(e) => setReg(e.target.value)}
          placeholder="123-45-67890"
        />
        <Input
          label="연락처 (휴대폰)"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="010-1234-5678"
        />
        <Input
          label="위치 (선택)"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="서울 강남구"
        />
      </Card>

      <Card className="flex flex-col gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">인증 서류</p>
          <p className="mt-0.5 text-xs text-muted">
            운영자가 서류를 확인한 뒤 승인합니다. 사진 또는 PDF, 1개당 10MB 이하.
          </p>
        </div>

        <DocField
          label="사업자등록증 (필수)"
          file={regFile}
          existing={!!initial?.business_reg_doc_path}
          onPick={(f) => pickFile("businessReg", f)}
          onClear={() => setRegFile(null)}
          disabled={busy}
        />
        <DocField
          label="매매사원증 (필수)"
          file={cardFile}
          existing={!!initial?.dealer_card_doc_path}
          onPick={(f) => pickFile("dealerCard", f)}
          onClear={() => setCardFile(null)}
          disabled={busy}
        />
      </Card>

      <Button type="button" size="lg" fullWidth onClick={submit} disabled={busy}>
        {busy ? "등록 중..." : initial ? "정보 수정" : "딜러 등록 신청"}
      </Button>
      <p className="text-[11px] text-muted">
        등록 후 운영자가 사업자등록증·매매사원증 진위를 확인한 뒤 승인합니다
        (영업일 1~2일). 승인 전에는 매물 조회만 가능하며 입찰은 불가합니다.
        매각가의 1.5% 수수료가 발생합니다.
      </p>
    </div>
  );
}

function DocField({
  label,
  file,
  existing,
  onPick,
  onClear,
  disabled,
}: {
  label: string;
  file: File | null;
  existing: boolean;
  onPick: (f: File | null) => void;
  onClear: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <label className="flex h-11 cursor-pointer items-center justify-center rounded-xl border border-dashed border-primary/40 bg-background px-3 text-sm font-medium text-primary hover:bg-primary/5">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            onPick(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
        />
        📎 파일 선택 / 촬영
      </label>
      {file ? (
        <div className="flex items-center justify-between rounded-lg bg-surface px-3 py-1.5 text-xs">
          <span className="truncate text-foreground">📄 {file.name}</span>
          <button
            type="button"
            onClick={onClear}
            disabled={disabled}
            className="ml-2 shrink-0 text-danger hover:underline"
          >
            제거
          </button>
        </div>
      ) : existing ? (
        <p className="text-xs text-success">
          ✅ 등록됨 — 변경하려면 새 파일을 선택하세요
        </p>
      ) : (
        <p className="text-xs text-muted">아직 첨부 안 됨</p>
      )}
    </div>
  );
}
