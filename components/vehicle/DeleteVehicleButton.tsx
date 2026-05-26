"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function DeleteVehicleButton({
  vehicleId,
  label,
}: {
  vehicleId: string;
  label: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const onClick = async () => {
    const ok = window.confirm(
      `${label} 차량을 정말 삭제하시겠어요?\n관련된 시세 분석 이력과 알림도 함께 삭제됩니다.`,
    );
    if (!ok) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        window.alert(data?.error ?? "삭제에 실패했습니다");
        return;
      }
      router.push("/garage");
      router.refresh();
    } catch {
      window.alert("네트워크 오류로 삭제에 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={loading}
      className="text-danger"
    >
      <Trash2 className="h-4 w-4" />
      {loading ? "삭제 중..." : "삭제"}
    </Button>
  );
}
