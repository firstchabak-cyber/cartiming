// 캐시 충전 패키지 정의 (모든 가격은 원화 정수, 보너스는 결제 금액에 가산되어 적립되는 캐시)

export type ChargePackage = {
  id: string;
  amountKrw: number;
  baseCredits: number;
  bonusCredits: number;
  bonusLabel?: string;
};

export const CHARGE_PACKAGES: ChargePackage[] = [
  { id: "p3k", amountKrw: 3000, baseCredits: 3000, bonusCredits: 0 },
  { id: "p5k", amountKrw: 5000, baseCredits: 5000, bonusCredits: 0 },
  {
    id: "p10k",
    amountKrw: 10000,
    baseCredits: 10000,
    bonusCredits: 1000,
    bonusLabel: "+10%",
  },
  {
    id: "p20k",
    amountKrw: 20000,
    baseCredits: 20000,
    bonusCredits: 3000,
    bonusLabel: "+15%",
  },
  {
    id: "p30k",
    amountKrw: 30000,
    baseCredits: 30000,
    bonusCredits: 5000,
    bonusLabel: "+17%",
  },
];

export function totalCredits(p: ChargePackage): number {
  return p.baseCredits + p.bonusCredits;
}

export function findPackage(id: string): ChargePackage | undefined {
  return CHARGE_PACKAGES.find((p) => p.id === id);
}
