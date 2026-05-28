import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DealerIndexPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 딜러 등록 여부에 따라 분기
  const { data: dealer } = await supabase
    .from("dealers")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!dealer) {
    redirect("/dealer/register");
  }
  redirect("/dealer/listings");
}
