import Link from "next/link";
import { BusinessFooter } from "@/components/layout/BusinessFooter";

export const metadata = {
  title: "개인정보처리방침 | 카타이밍",
};

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col">
    <div className="mx-auto w-full max-w-3xl px-4 py-8 text-sm text-foreground">
      <Link href="/" className="text-xs text-primary hover:underline">
        ← 카타이밍 홈
      </Link>
      <h1 className="mt-3 text-2xl font-bold">개인정보처리방침</h1>
      <p className="mt-1 text-xs text-muted">최종 개정일: 2026년 5월 28일</p>

      <div className="mt-6 flex flex-col gap-6">
        <Section title="1. 개인정보의 수집 항목 및 수집 방법">
          <p>
            카타이밍(이하 &quot;회사&quot;)은 서비스 제공을 위해 다음 정보를 수집합니다.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong>회원가입 시 (소셜 로그인)</strong>: 이메일 주소, 이름,
              프로필 이미지(선택), 네이버/구글 고유 식별자
            </li>
            <li>
              <strong>차량 등록 시</strong>: 차량번호, 제조사, 모델, 연식, 주행거리,
              연료, 변속기, 차대번호(VIN), 색상, 옵션, 등록일, 차량 사진,
              차량등록증 사진(추출 후 폐기)
            </li>
            <li>
              <strong>대출 정보 (선택 입력)</strong>: 원금, 실행일, 기간, 금리
            </li>
            <li>
              <strong>결제 시</strong>: 결제 금액, 결제 수단, 토스페이먼츠 발급 결제 키
              (카드번호 등 결제수단 상세는 회사가 직접 저장하지 않음)
            </li>
            <li>
              <strong>서비스 이용 과정에서 자동 수집</strong>: 접속 IP, 브라우저 종류, 쿠키,
              방문 기록
            </li>
          </ul>
        </Section>

        <Section title="2. 개인정보의 수집 및 이용 목적">
          <ul className="list-disc space-y-1 pl-5">
            <li>회원 가입·관리, 본인 확인, 부정 이용 방지</li>
            <li>AI 시세 분석 서비스 제공 (Google Gemini API 활용)</li>
            <li>매각 적기 알림 발송</li>
            <li>캐시 충전·사용 내역 관리</li>
            <li>고객 문의 응대, 공지사항 전달</li>
            <li>통계 분석을 통한 서비스 개선</li>
          </ul>
        </Section>

        <Section title="3. 개인정보의 보유 및 이용 기간">
          <ul className="list-disc space-y-1 pl-5">
            <li>회원 정보: 회원 탈퇴 시까지 (탈퇴 즉시 파기)</li>
            <li>
              결제 기록: 전자상거래법에 따라 5년간 보관
            </li>
            <li>
              차량등록증 사진: AI 분석 완료 직후 즉시 폐기 (DB 또는 스토리지에 저장하지 않음)
            </li>
            <li>접속 로그: 통신비밀보호법에 따라 3개월간 보관</li>
          </ul>
        </Section>

        <Section title="4. 개인정보의 제3자 제공">
          <p>
            회사는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다.
            다만, 다음의 경우는 예외로 합니다:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>이용자가 사전에 동의한 경우 (매각 신청 시 차량 정보를 매수 딜러에게 전달하는 경우 등)</li>
            <li>법령의 규정에 의거하거나 수사 목적으로 법정 절차에 따라 요구된 경우</li>
          </ul>
        </Section>

        <Section title="5. 개인정보 처리 위탁">
          <p>회사는 서비스 제공을 위해 다음과 같이 개인정보 처리를 위탁하고 있습니다:</p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead className="bg-surface">
                <tr>
                  <th className="border border-border px-2 py-2 text-left">수탁업체</th>
                  <th className="border border-border px-2 py-2 text-left">위탁 업무</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-border px-2 py-2">Supabase Inc. (미국)</td>
                  <td className="border border-border px-2 py-2">회원 정보·차량 정보 저장 및 인증</td>
                </tr>
                <tr>
                  <td className="border border-border px-2 py-2">Google LLC (미국, Gemini API)</td>
                  <td className="border border-border px-2 py-2">AI 시세 분석, 차량등록증 사진 OCR</td>
                </tr>
                <tr>
                  <td className="border border-border px-2 py-2">네이버(주)</td>
                  <td className="border border-border px-2 py-2">소셜 로그인 인증</td>
                </tr>
                <tr>
                  <td className="border border-border px-2 py-2">토스페이먼츠(주)</td>
                  <td className="border border-border px-2 py-2">결제 처리</td>
                </tr>
                <tr>
                  <td className="border border-border px-2 py-2">Vercel Inc. (미국)</td>
                  <td className="border border-border px-2 py-2">웹 호스팅 및 서버 운영</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="6. 이용자의 권리와 행사 방법">
          <p>이용자는 언제든지 다음 권리를 행사할 수 있습니다:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>개인정보 열람 (마이페이지에서 직접 확인)</li>
            <li>개인정보 정정 (마이페이지에서 직접 수정)</li>
            <li>개인정보 삭제 (회원 탈퇴 시 자동 삭제)</li>
            <li>개인정보 처리 정지 요청 (아래 책임자 연락처)</li>
          </ul>
        </Section>

        <Section title="7. 개인정보 보호책임자">
          <ul className="list-none space-y-1">
            <li>성명: 장문성</li>
            <li>직책: 대표 (개인정보 보호책임자)</li>
            <li>이메일: help@cartiming.app</li>
            <li>전화: 010-4487-4972</li>
          </ul>
          <p className="mt-2">
            개인정보 침해에 대한 신고·상담이 필요하신 경우 개인정보침해신고센터
            (privacy.kisa.or.kr / 국번없이 118), 대검찰청 사이버수사과(1301),
            경찰청 사이버수사국(182)으로 문의하실 수 있습니다.
          </p>
        </Section>

        <Section title="8. 개정 이력">
          <ul className="list-disc space-y-1 pl-5">
            <li>2026-05-28: 최초 제정</li>
          </ul>
        </Section>
      </div>
    </div>
      <BusinessFooter />
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <div className="mt-2 text-sm leading-relaxed text-muted">{children}</div>
    </section>
  );
}
