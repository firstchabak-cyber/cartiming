import Link from "next/link";
import { BusinessFooter } from "@/components/layout/BusinessFooter";

export const metadata = {
  title: "이용약관 | 카타이밍",
};

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col">
    <div className="mx-auto w-full max-w-3xl px-4 py-8 text-sm text-foreground">
      <Link href="/" className="text-xs text-primary hover:underline">
        ← 카타이밍 홈
      </Link>
      <h1 className="mt-3 text-2xl font-bold">이용약관</h1>
      <p className="mt-1 text-xs text-muted">최종 개정일: 2026년 5월 28일</p>

      <div className="mt-6 flex flex-col gap-6">
        <Section title="제1조 (목적)">
          본 약관은 카타이밍(이하 &quot;회사&quot;)이 제공하는 차량 시세 분석 및
          매각 매칭 서비스(이하 &quot;서비스&quot;)의 이용과 관련하여 회사와
          이용자(이하 &quot;회원&quot;)의 권리, 의무 및 책임 사항을 규정함을 목적으로 합니다.
        </Section>

        <Section title="제2조 (정의)">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>서비스</strong>: 회원의 차량 정보를 기반으로 AI(Google Gemini)를
              활용한 시세 분석, 매각 적기 알림, 매각 신청 매칭 등을 제공하는 서비스
            </li>
            <li>
              <strong>회원</strong>: 본 약관에 동의하고 회사가 제공하는 서비스에 가입한 자
            </li>
            <li>
              <strong>캐시</strong>: 서비스 내에서 추가 시세 분석, 차량 추가 등록 등의 유료
              기능을 이용하기 위해 회원이 충전하거나 적립받는 서비스 전용 이용권. 환금성이
              없어 현금 인출·이체·양도가 불가능하며, 카타이밍 서비스 내에서 회원 본인만
              사용할 수 있습니다.
            </li>
          </ul>
        </Section>

        <Section title="제3조 (약관의 효력 및 변경)">
          <ol className="list-decimal space-y-1 pl-5">
            <li>본 약관은 서비스 화면에 게시함으로써 효력이 발생합니다.</li>
            <li>
              회사는 필요 시 약관을 변경할 수 있으며, 변경 사항은 적용일 7일 전부터 공지합니다.
              회원에게 불리한 변경의 경우 30일 전부터 공지하고 동의 절차를 거칩니다.
            </li>
          </ol>
        </Section>

        <Section title="제4조 (회원 가입 및 탈퇴)">
          <ol className="list-decimal space-y-1 pl-5">
            <li>네이버 또는 구글 소셜 로그인으로 회원 가입을 진행합니다.</li>
            <li>회원은 언제든지 마이페이지에서 회원 탈퇴를 요청할 수 있습니다.</li>
            <li>
              회원 탈퇴 시 회원의 차량 정보·시세 분석 이력·잔여 캐시는 모두 즉시 삭제되며
              복구되지 않습니다. (결제 기록은 전자상거래법에 따라 5년간 별도 보관)
            </li>
          </ol>
        </Section>

        <Section title="제5조 (서비스의 제공 및 이용)">
          <ol className="list-decimal space-y-1 pl-5">
            <li>회사는 회원에게 다음의 서비스를 제공합니다:
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                <li>차량 등록 및 관리 (가입 시 1대 무료, 추가 1대당 캐시 차감)</li>
                <li>AI 시세 분석 (가입 시 1회 무료, 이후 1회당 캐시 차감)</li>
                <li>
                  휴대폰 푸시·이메일 매각 알림 (휴대폰 알림 최초 활성화 시 캐시
                  차감, 이후 추가 차감 없음)
                </li>
                <li>차량 매각 신청 매칭 (회원 무료, 매수 딜러에게 수수료 부과)</li>
                <li>기타 회사가 정하는 부가 서비스</li>
              </ul>
            </li>
            <li>
              서비스는 연중무휴 24시간 제공을 원칙으로 하나, 시스템 점검·장애·천재지변
              등의 사유로 일시 중단될 수 있습니다.
            </li>
          </ol>
        </Section>

        <Section title="제6조 (캐시 충전, 사용, 환불)">
          <ol className="list-decimal space-y-1 pl-5">
            <li>
              회원은 토스페이먼츠를 통해 캐시를 충전할 수 있습니다. 충전 금액에 따라 보너스 캐시가
              추가 지급될 수 있습니다.
            </li>
            <li>
              <strong>
                캐시는 카타이밍 서비스 내의 유료 기능(시세 분석 추가, 차량 추가 등록 등)
                이용에만 사용할 수 있습니다.
              </strong>{" "}
              캐시는 현금이 아니며, 현금으로의 인출·이체·환전, 제3자에게의 양도·매매,
              외부 서비스에서의 사용이 일절 불가능합니다.
            </li>
            <li>
              <strong>캐시는 딜러 매각 수수료의 결제 수단으로 사용할 수 없습니다.</strong>{" "}
              딜러 매각 수수료는 제7조에 따라 계좌 이체로만 납부합니다.
            </li>
            <li>
              충전한 캐시 중 <strong>사용하지 않은 잔액</strong>은 관련 법령(전자상거래법
              등)에 따라 결제일로부터 7일 이내에 환불 요청 시 결제 수단으로 100%
              환불됩니다. 이미 <strong>사용된 캐시는 환불되지 않습니다.</strong>
            </li>
            <li>
              보너스로 지급된 캐시(가입 보너스, 친구 초대 보상, 충전 보너스 등)는 무상
              제공분으로, <strong>환불·현금 전환 대상이 아닙니다.</strong>
            </li>
            <li>캐시는 회원 본인만 사용 가능하며 양도할 수 없습니다.</li>
            <li>최종 사용일로부터 5년이 경과한 캐시는 소멸될 수 있습니다.</li>
          </ol>
        </Section>

        <Section title="제6조의2 (딜러 매각 수수료)">
          <ol className="list-decimal space-y-1 pl-5">
            <li>
              카타이밍을 통해 차량을 매입한 딜러는 거래 완료 시 회사가 정한 매각
              수수료(매각가 1,000만원 미만 15만원 고정, 1,000만원 이상 매각가의
              1.5%)를 회사에 납부합니다.
            </li>
            <li>
              <strong>
                매각 수수료는 회사가 지정한 계좌로의 이체(현금)로만 납부할 수 있으며,
                회원 캐시·포인트 등 다른 수단으로 대체 납부할 수 없습니다.
              </strong>
            </li>
            <li>
              수수료는 거래 완료 후 청구되며, 딜러는 청구일로부터 회사가 정한 기한
              내에 납부해야 합니다.
            </li>
          </ol>
        </Section>

        <Section title="제7조 (시세 분석의 한계와 책임 제한)">
          <ol className="list-decimal space-y-1 pl-5">
            <li>
              본 서비스의 시세 분석은 AI(Google Gemini)가 제공된 차량 정보를 기반으로
              추정한 <strong>참고용 가격 정보</strong>이며, 실제 시장 거래가를 보장하지
              않습니다.
            </li>
            <li>
              실제 매각 금액은 매각 시기, 매수자, 차량의 실제 상태, 시장 동향, 협상 등에
              따라 본 서비스의 추정치와 차이가 발생할 수 있습니다.
            </li>
            <li>
              회사는 본 서비스의 시세 분석에 의존하여 발생한 회원의 매매 손실, 거래
              불성사 등에 대해 책임지지 않습니다.
            </li>
            <li>
              실제 매각 전에는 반드시 다수의 딜러로부터 견적을 받아 비교하시기를 권장합니다.
            </li>
          </ol>
        </Section>

        <Section title="제8조 (회원의 의무)">
          <ol className="list-decimal space-y-1 pl-5">
            <li>회원은 정확한 차량 정보를 입력해야 합니다.</li>
            <li>회원은 타인의 정보를 도용하거나 허위 정보를 등록하면 안 됩니다.</li>
            <li>
              회원은 서비스를 영업, 광고, 정치 목적 등 본래 목적 외로 사용해서는 안 됩니다.
            </li>
            <li>회원이 본 약관을 위반할 경우 회사는 사전 통지 없이 서비스 이용을 제한할 수 있습니다.</li>
          </ol>
        </Section>

        <Section title="제9조 (서비스의 변경 및 중단)">
          회사는 운영상·기술상의 필요에 따라 제공하는 서비스의 전부 또는 일부를 변경하거나
          중단할 수 있으며, 이 경우 변경 또는 중단 7일 전부터 공지합니다. 중단 시점에 사용되지
          않은 충전 캐시는 100% 환불됩니다.
        </Section>

        <Section title="제10조 (개인정보 보호)">
          회원의 개인정보 보호에 관한 사항은 별도의{" "}
          <Link href="/privacy" className="text-primary underline">
            개인정보처리방침
          </Link>
          에 따릅니다.
        </Section>

        <Section title="제11조 (분쟁 해결)">
          <ol className="list-decimal space-y-1 pl-5">
            <li>본 약관은 대한민국 법률에 따라 해석됩니다.</li>
            <li>
              서비스 이용과 관련하여 발생한 분쟁은 회사와 회원 간 상호 협의로 해결함을
              원칙으로 하며, 협의가 이루어지지 않을 경우 민사소송법상의 관할 법원에 제소합니다.
            </li>
          </ol>
        </Section>

        <Section title="제12조 (부칙)">
          본 약관은 2026년 5월 28일부터 시행됩니다.
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
