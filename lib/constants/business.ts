/**
 * 전자상거래법에 따라 푸터에 표시되는 사업자 정보.
 *
 * ⚠️ 모든 값을 실제 사업자등록 정보로 채워야 네이버 OAuth 검수 통과 가능.
 * 사업자 정보가 아직 없다면:
 *  - 통신판매업 신고: 정부24 (www.gov.kr) 또는 관할 시·군·구청
 *  - 사업자등록: 홈택스 (www.hometax.go.kr)
 * 면제 대상이면 정부24 "통신판매업 신고 면제 기준" 확인.
 */

export const BUSINESS_INFO = {
  /** 상호 (사업자 등록증의 사업장명) */
  companyName: "모토베이션 (서비스명: 카타이밍)",

  /** 대표자 성명 */
  representativeName: "장문성",

  /** 사업자등록번호 */
  businessRegNumber: "513-64-26319",

  /** 통신판매업 신고번호 */
  mailOrderRegNumber: "제 2020-성남수정-1193호",

  /** 영업소 소재지 주소 */
  address: "경기도 성남시 수정구 위례서일로3길 14-13, 1층 (창곡동)",

  /** 고객센터 전화번호 */
  phone: "010-4487-4972",

  /** 고객 응대 이메일 */
  email: "firstchabak@naver.com",

  /** 호스팅 제공자 */
  hostingProvider: "Vercel Inc.",
} as const;
