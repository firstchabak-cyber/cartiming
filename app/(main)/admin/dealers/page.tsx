import { redirect } from "next/navigation";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { isAdmin } from "@/lib/admin/check";
import { formatDate } from "@/lib/utils/format";
import { DealerVerifyButton } from "@/components/admin/DealerVerifyButton";

export default async function AdminDealersPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isAdmin(user.email)) {
    return (
      <Card className="p-8 text-center">
        <CardTitle>접근 권한이 없습니다</CardTitle>
      </Card>
    );
  }

  const admin = createAdminClient();
  const { data: dealers } = await admin
    .from("dealers")
    .select(
      "user_id, business_name, business_reg_number, contact_phone, location, verified, verified_at, created_at",
    )
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-xl font-bold">딜러 관리</h1>
        <p className="text-xs text-muted">사업자등록 진위 확인 후 승인</p>
      </header>

      {(dealers ?? []).length === 0 ? (
        <Card className="py-10 text-center">
          <CardDescription>등록된 딜러가 없습니다.</CardDescription>
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {(dealers as Array<{
            user_id: string;
            business_name: string;
            business_reg_number: string;
            contact_phone: string;
            location: string | null;
            verified: boolean;
            verified_at: string | null;
            created_at: string;
          }>).map((d) => (
            <li key={d.user_id}>
              <Card className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <CardTitle>{d.business_name}</CardTitle>
                  {d.verified ? (
                    <Badge tone="success">승인됨</Badge>
                  ) : (
                    <Badge tone="warning">대기</Badge>
                  )}
                </div>
                <dl className="grid grid-cols-2 gap-y-0.5 text-xs">
                  <dt className="text-muted">사업자번호</dt>
                  <dd className="text-right">{d.business_reg_number}</dd>
                  <dt className="text-muted">연락처</dt>
                  <dd className="text-right">{d.contact_phone}</dd>
                  {d.location && (
                    <>
                      <dt className="text-muted">위치</dt>
                      <dd className="text-right">{d.location}</dd>
                    </>
                  )}
                  <dt className="text-muted">신청일</dt>
                  <dd className="text-right">{formatDate(d.created_at)}</dd>
                </dl>
                {!d.verified && (
                  <DealerVerifyButton dealerId={d.user_id} />
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
