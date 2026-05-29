import Link from "next/link";
import { APP_NAME } from "@/lib/constants/app";

export const metadata = {
  title: `페이지를 찾을 수 없습니다 | ${APP_NAME}`,
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <p className="text-5xl">🚗💨</p>
      <h1 className="text-2xl font-bold text-foreground">
        페이지를 찾을 수 없어요
      </h1>
      <p className="max-w-xs text-sm text-muted">
        주소가 바뀌었거나 삭제된 페이지일 수 있어요. 홈으로 돌아가 다시
        시도해 주세요.
      </p>
      <Link
        href="/"
        className="mt-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
      >
        홈으로 가기
      </Link>
    </div>
  );
}
