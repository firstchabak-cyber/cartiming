import Link from "next/link";
import { BUSINESS_INFO } from "@/lib/constants/business";

/**
 * 전자상거래법 의무 표기 푸터.
 * 모든 페이지(인증/일반/관리자/딜러) 하단에 표시.
 */
export function BusinessFooter() {
  return (
    <footer className="mt-8 border-t border-border bg-surface/50 px-4 py-6 text-[11px] leading-relaxed text-muted">
      <div className="mx-auto max-w-4xl space-y-2">
        <p className="font-semibold text-foreground">
          {BUSINESS_INFO.companyName}
        </p>
        <p>
          대표자 {BUSINESS_INFO.representativeName} ㅣ 사업자등록번호{" "}
          {BUSINESS_INFO.businessRegNumber}
          <br />
          통신판매업 신고번호 {BUSINESS_INFO.mailOrderRegNumber}
        </p>
        <p>주소: {BUSINESS_INFO.address}</p>
        {/* 이메일을 주 문의 창구로 안내 (전화는 보조) */}
        <p>
          <span className="font-semibold text-foreground">문의(이메일)</span>:{" "}
          <a
            href={`mailto:${BUSINESS_INFO.email}`}
            className="font-medium text-foreground hover:underline"
          >
            {BUSINESS_INFO.email}
          </a>
          <br />
          <span className="text-[10px]">
            이메일로 문의 주시면 가장 빠르게 도와드려요.
          </span>
        </p>
        <p>
          고객센터:{" "}
          <a
            href={`tel:${BUSINESS_INFO.phone.replace(/-/g, "")}`}
            className="hover:text-foreground hover:underline"
          >
            {BUSINESS_INFO.phone}
          </a>{" "}
          ({BUSINESS_INFO.phoneHours})
        </p>
        <p className="pt-2">
          <Link href="/terms" className="hover:text-foreground hover:underline">
            이용약관
          </Link>
          {" ㅣ "}
          <Link href="/privacy" className="hover:text-foreground hover:underline">
            개인정보처리방침
          </Link>
        </p>
        <p className="pt-1 text-[10px]">
          호스팅 제공: {BUSINESS_INFO.hostingProvider}
        </p>
      </div>
    </footer>
  );
}
