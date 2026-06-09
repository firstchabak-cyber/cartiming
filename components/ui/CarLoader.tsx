"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * 카타임 공용 로딩 캐릭터 — 도로 위를 달리는 자동차.
 * 시세 분석 대기, 로그인 대기 등 "조금 기다려야 하는" 모든 곳에서 재사용.
 *
 * - messages: 1.8초마다 순환하며 바뀌는 진행 문구(있으면). 진행되는 느낌을 줌.
 * - size: 자동차 크기. "sm"(로그인 등 작게) / "md"(시세 분석 기본).
 */
export function CarLoader({
  messages,
  className,
  interval = 1800,
  size = "md",
}: {
  messages?: string[];
  className?: string;
  interval?: number;
  size?: "sm" | "md";
}) {
  const [i, setI] = useState(0);
  const list = messages ?? [];

  useEffect(() => {
    if (list.length < 2) return;
    const t = setInterval(() => {
      setI((prev) => (prev + 1) % list.length);
    }, interval);
    return () => clearInterval(t);
  }, [list.length, interval]);

  const dims =
    size === "sm"
      ? { wrap: "max-w-[180px]", car: "h-11 w-[64px]", road: "h-[3px]", shadow: "h-1 w-11" }
      : { wrap: "max-w-[240px]", car: "h-14 w-[88px]", road: "h-1", shadow: "h-1.5 w-16" };

  return (
    <div
      className={cn("flex flex-col items-center gap-3", className)}
      role="status"
      aria-live="polite"
    >
      <div className={cn("relative w-full", dims.wrap)}>
        {/* 자동차 (통통 튀며 달림) */}
        <div className={cn("ct-car relative mx-auto", dims.car)}>
          <CarSvg />
        </div>
        {/* 그림자 */}
        <div
          className={cn(
            "ct-shadow mx-auto rounded-full bg-foreground",
            dims.shadow,
          )}
        />
        {/* 도로 (차선이 뒤로 흐름) */}
        <div className={cn("ct-road mt-1.5 w-full rounded-full", dims.road)} />
      </div>

      {list.length > 0 && (
        <p
          key={i}
          className="ct-fade text-center text-sm font-medium text-muted"
        >
          {list[i]}
        </p>
      )}
    </div>
  );
}

/**
 * 전체화면 로딩 오버레이. `show`가 true가 되고 `delayMs`(기본 2초)가 지나야
 * 비로소 나타난다 — 빠르게 끝나면 깜빡임 없이 안 보이고, 느릴 때만 등장.
 * 로그인 등 페이지 전환 대기에 사용.
 */
export function CarLoaderOverlay({
  show,
  delayMs = 2000,
  title = "로그인 중…",
  messages,
}: {
  show: boolean;
  delayMs?: number;
  title?: string;
  messages?: string[];
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!show) {
      setVisible(false);
      return;
    }
    const t = setTimeout(() => setVisible(true), delayMs);
    return () => clearTimeout(t);
  }, [show, delayMs]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-background/92 px-6 backdrop-blur-sm">
      <p className="text-lg font-semibold text-foreground">{title}</p>
      <CarLoader messages={messages} />
    </div>
  );
}

/** 파란 세단 SVG. 바퀴 두 개가 회전한다. */
function CarSvg() {
  const wheelStyle = {
    transformBox: "fill-box" as const,
    transformOrigin: "center" as const,
  };
  return (
    <svg
      viewBox="0 0 88 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-full w-full"
      aria-hidden="true"
    >
      {/* 캐빈(지붕) */}
      <path
        d="M25 30 L33 17 Q35 14 39 14 L55 14 Q59 14 61 17 L69 30 Z"
        fill="#1D4ED8"
      />
      {/* 차체 */}
      <rect x="6" y="28" width="76" height="16" rx="7" fill="#2563EB" />
      {/* 유리창 */}
      <path
        d="M35 28 L40 18 L53 18 L58 28 Z"
        fill="#DBEAFE"
      />
      {/* 헤드라이트 */}
      <circle cx="79" cy="33" r="2.5" fill="#FDE68A" />
      {/* 앞 바퀴 */}
      <g className="ct-wheel" style={wheelStyle}>
        <circle cx="63" cy="44" r="9" fill="#1F2937" />
        <circle cx="63" cy="44" r="3.4" fill="#9CA3AF" />
        <rect x="62.1" y="36" width="1.8" height="16" fill="#9CA3AF" />
        <rect x="55" y="43.1" width="16" height="1.8" fill="#9CA3AF" />
      </g>
      {/* 뒷 바퀴 */}
      <g className="ct-wheel" style={wheelStyle}>
        <circle cx="25" cy="44" r="9" fill="#1F2937" />
        <circle cx="25" cy="44" r="3.4" fill="#9CA3AF" />
        <rect x="24.1" y="36" width="1.8" height="16" fill="#9CA3AF" />
        <rect x="17" y="43.1" width="16" height="1.8" fill="#9CA3AF" />
      </g>
    </svg>
  );
}
