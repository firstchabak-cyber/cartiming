import { createAdminClient } from "@/lib/supabase/server";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatKRW } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function AdminTransactionsPage() {
  const admin = createAdminClient();
  const { data: txns } = await admin
    .from("sale_transactions")
    .select(
      "id, channel, sold_price, sold_at, buyer_type, snapshot_manufacturer, snapshot_model, snapshot_year, snapshot_mileage, snapshot_damage_count, snapshot_plate_category, created_at",
    )
    .order("sold_at", { ascending: false })
    .limit(200);

  type TxRow = {
    id: string;
    channel: "cartiming" | "external";
    sold_price: number;
    sold_at: string;
    buyer_type: string | null;
    snapshot_manufacturer: string;
    snapshot_model: string;
    snapshot_year: number;
    snapshot_mileage: number;
    snapshot_damage_count: number;
    snapshot_plate_category: string | null;
    created_at: string;
  };
  const list = (txns as TxRow[]) ?? [];

  const totalCartiming = list.filter((t) => t.channel === "cartiming").length;
  const totalExternal = list.filter((t) => t.channel === "external").length;

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-bold text-foreground">실거래 매각 데이터</h1>
        <p className="text-sm text-muted">
          AI 시세분석 학습 데이터 · 누적 {list.length}건 (카타임 {totalCartiming} · 외부{" "}
          {totalExternal})
        </p>
      </header>

      {list.length === 0 ? (
        <Card className="py-10 text-center">
          <CardDescription>
            아직 거래 기록이 없습니다. 매각 신청 완료 또는 외부 매각 신고가 누적되면
            여기에 표시됩니다.
          </CardDescription>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="border-b border-border bg-surface text-xs text-muted">
              <tr>
                <th className="p-2 text-left">매각일</th>
                <th className="p-2 text-left">차종</th>
                <th className="p-2 text-right">연식</th>
                <th className="p-2 text-right">주행</th>
                <th className="p-2 text-right">손상</th>
                <th className="p-2 text-left">번호판</th>
                <th className="p-2 text-left">매수자</th>
                <th className="p-2 text-left">채널</th>
                <th className="p-2 text-right">매각가</th>
              </tr>
            </thead>
            <tbody>
              {list.map((t) => (
                <tr
                  key={t.id}
                  className="border-b border-border hover:bg-surface"
                >
                  <td className="p-2 text-xs">{t.sold_at}</td>
                  <td className="p-2">
                    {t.snapshot_manufacturer} {t.snapshot_model}
                  </td>
                  <td className="p-2 text-right text-xs">
                    {t.snapshot_year}
                  </td>
                  <td className="p-2 text-right text-xs">
                    {t.snapshot_mileage.toLocaleString("ko-KR")}km
                  </td>
                  <td className="p-2 text-right text-xs">
                    {t.snapshot_damage_count > 0
                      ? `${t.snapshot_damage_count}곳`
                      : "—"}
                  </td>
                  <td className="p-2 text-xs">
                    {t.snapshot_plate_category === "rental"
                      ? "렌터"
                      : t.snapshot_plate_category === "commercial"
                        ? "영업"
                        : t.snapshot_plate_category === "private"
                          ? "자가용"
                          : "—"}
                  </td>
                  <td className="p-2 text-xs">
                    {t.buyer_type === "dealer"
                      ? "딜러"
                      : t.buyer_type === "individual"
                        ? "개인"
                        : "—"}
                  </td>
                  <td className="p-2">
                    <Badge
                      tone={t.channel === "cartiming" ? "success" : "neutral"}
                    >
                      {t.channel === "cartiming" ? "카타임" : "외부"}
                    </Badge>
                  </td>
                  <td className="p-2 text-right font-semibold">
                    {formatKRW(t.sold_price)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
