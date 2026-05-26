"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export function DeleteMaintenanceButton({
  maintenanceId,
  label,
}: {
  maintenanceId: string;
  label: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const onClick = async () => {
    const ok = window.confirm(`"${label}" 이력을 삭제하시겠어요?`);
    if (!ok) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/maintenance/${maintenanceId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        window.alert(data?.error ?? "삭제에 실패했습니다");
        return;
      }
      router.refresh();
    } catch {
      window.alert("네트워크 오류로 삭제에 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      aria-label="이력 삭제"
      className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-danger disabled:opacity-50"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
