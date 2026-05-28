import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { completeSale } from "@/lib/sales/complete";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const result = await completeSale({
    saleRequestId: params.id,
    callerId: user.id,
  });

  if (!result.ok) {
    const status =
      result.code === "not_found"
        ? 404
        : result.code === "forbidden"
          ? 403
          : 400;
    return NextResponse.json(
      { error: result.message, code: result.code },
      { status },
    );
  }

  return NextResponse.json({
    ok: true,
    transactionId: result.transactionId,
    finalPrice: result.finalPrice,
    feeAmount: result.feeAmount,
  });
}
