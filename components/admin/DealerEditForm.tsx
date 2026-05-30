"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type D = {
  user_id: string;
  business_name: string;
  business_reg_number: string;
  contact_phone: string;
  location: string | null;
};

export function DealerEditForm({ dealer }: { dealer: D }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [name, setName] = useState(dealer.business_name);
  const [reg, setReg] = useState(dealer.business_reg_number);
  const [phone, setPhone] = useState(dealer.contact_phone);
  const [location, setLocation] = useState(dealer.location ?? "");

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/dealers/${dealer.user_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: name.trim(),
          business_reg_number: reg.trim(),
          contact_phone: phone.trim(),
          location: location.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data?.error ?? "수정 실패");
        return;
      }
      router.refresh();
      setOpen(false);
    } catch {
      setMsg("네트워크 오류");
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start text-xs font-semibold text-primary hover:underline"
      >
        ✏️ 정보 수정
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-primary/40 bg-primary/5 p-3">
      <Input label="상호" value={name} onChange={(e) => setName(e.target.value)} />
      <Input label="사업자번호" value={reg} onChange={(e) => setReg(e.target.value)} />
      <Input label="연락처" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <Input label="위치" value={location} onChange={(e) => setLocation(e.target.value)} />
      <div className="flex gap-2">
        <Button size="sm" onClick={save} disabled={busy} fullWidth>
          {busy ? "저장 중..." : "저장"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setOpen(false)} disabled={busy} fullWidth>
          취소
        </Button>
      </div>
      {msg && <p className="text-xs text-danger">{msg}</p>}
    </div>
  );
}
