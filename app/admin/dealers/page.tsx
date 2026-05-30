import { createAdminClient } from "@/lib/supabase/server";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils/format";
import { DealerVerifyButton } from "@/components/admin/DealerVerifyButton";
import { DealerSuspendButton } from "@/components/admin/DealerSuspendButton";
import { DealerEditForm } from "@/components/admin/DealerEditForm";
import { AdminDeleteButton } from "@/components/admin/AdminDeleteButton";

type DealerRow = {
  user_id: string;
  business_name: string;
  business_reg_number: string;
  contact_phone: string;
  location: string | null;
  verified: boolean;
  verified_at: string | null;
  rating_avg: number | null;
  rating_count: number;
  created_at: string;
};

export default async function AdminDealersPage() {
  const admin = createAdminClient();
  const { data: dealers } = await admin
    .from("dealers")
    .select(
      "user_id, business_name, business_reg_number, contact_phone, location, verified, verified_at, rating_avg, rating_count, created_at",
    )
    .order("created_at", { ascending: false });

  const list = (dealers as DealerRow[]) ?? [];
  const pending = list.filter((d) => !d.verified);
  const approved = list.filter((d) => d.verified);

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-bold text-foreground">딜러 관리</h1>
        <p className="text-sm text-muted">
          전체 {list.length}명 · 대기 {pending.length}명 · 승인 {approved.length}명
        </p>
      </header>

      {pending.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-warning">⏳ 승인 대기</h2>
          <ul className="flex flex-col gap-2">
            {pending.map((d) => (
              <DealerCard key={d.user_id} d={d} />
            ))}
          </ul>
        </section>
      )}

      {approved.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-success">✅ 승인된 딜러</h2>
          <ul className="flex flex-col gap-2">
            {approved.map((d) => (
              <DealerCard key={d.user_id} d={d} />
            ))}
          </ul>
        </section>
      )}

      {list.length === 0 && (
        <Card className="py-10 text-center">
          <CardDescription>등록된 딜러가 없습니다.</CardDescription>
        </Card>
      )}
    </div>
  );
}

function DealerCard({ d }: { d: DealerRow }) {
  return (
    <li>
      <Card className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>{d.business_name}</CardTitle>
            {d.rating_count > 0 && (
              <span className="text-xs text-warning">
                ★ {d.rating_avg} ({d.rating_count})
              </span>
            )}
          </div>
          {d.verified ? (
            <Badge tone="success">승인됨</Badge>
          ) : (
            <Badge tone="warning">대기</Badge>
          )}
        </div>
        <dl className="grid grid-cols-2 gap-y-0.5 text-xs md:grid-cols-4">
          <dt className="text-muted">사업자번호</dt>
          <dd>{d.business_reg_number}</dd>
          <dt className="text-muted">연락처</dt>
          <dd>
            <a
              href={`tel:${d.contact_phone}`}
              className="text-primary hover:underline"
            >
              {d.contact_phone}
            </a>
          </dd>
          {d.location && (
            <>
              <dt className="text-muted">위치</dt>
              <dd>{d.location}</dd>
            </>
          )}
          <dt className="text-muted">신청일</dt>
          <dd>{formatDate(d.created_at)}</dd>
        </dl>
        {d.verified ? (
          <DealerSuspendButton dealerId={d.user_id} />
        ) : (
          <DealerVerifyButton dealerId={d.user_id} />
        )}
        <DealerEditForm
          dealer={{
            user_id: d.user_id,
            business_name: d.business_name,
            business_reg_number: d.business_reg_number,
            contact_phone: d.contact_phone,
            location: d.location,
          }}
        />
        <AdminDeleteButton
          endpoint={`/api/admin/dealers/${d.user_id}`}
          label="딜러 삭제"
        />
      </Card>
    </li>
  );
}
