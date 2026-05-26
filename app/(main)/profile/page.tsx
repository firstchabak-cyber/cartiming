"use client";

import { useEffect, useRef, useState } from "react";
import { Check, LogOut, Pencil, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { useUser } from "@/hooks/useUser";
import { createClient } from "@/lib/supabase/client";

export default function ProfilePage() {
  const router = useRouter();
  const { profile, isLoading, refresh } = useUser();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  const startEdit = () => {
    setDraft(profile?.name ?? "");
    setError(null);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setError(null);
  };

  const saveName = async () => {
    const trimmed = draft.trim();
    if (trimmed.length === 0) {
      setError("이름을 입력해주세요");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "저장에 실패했습니다");
        return;
      }
      await refresh();
      setEditing(false);
    } catch {
      setError("네트워크 오류로 저장에 실패했습니다");
    } finally {
      setSaving(false);
    }
  };

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">마이페이지</h1>

      <Card className="flex flex-col gap-2">
        {editing ? (
          <div className="flex flex-col gap-2">
            <Input
              ref={inputRef}
              label="이름"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={40}
              error={error ?? undefined}
              placeholder="표시할 이름"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={saveName}
                disabled={saving}
                fullWidth
              >
                <Check className="h-4 w-4" />
                {saving ? "저장 중..." : "저장"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={cancelEdit}
                disabled={saving}
                fullWidth
              >
                <X className="h-4 w-4" />
                취소
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <CardTitle>
                {isLoading ? "..." : profile?.name ?? "이름 없음"}
              </CardTitle>
              <CardDescription>
                {profile?.email ?? "이메일 없음"}
              </CardDescription>
            </div>
            <button
              type="button"
              onClick={startEdit}
              aria-label="이름 수정"
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-foreground"
            >
              <Pencil className="h-4 w-4" />
            </button>
          </div>
        )}
      </Card>

      <Card className="flex items-center justify-between">
        <div>
          <CardTitle className="text-sm">화면 테마</CardTitle>
          <CardDescription>라이트 / 다크 모드 전환</CardDescription>
        </div>
        <ThemeToggle />
      </Card>

      <Button variant="outline" fullWidth onClick={logout}>
        <LogOut className="h-4 w-4" />
        로그아웃
      </Button>
    </div>
  );
}
