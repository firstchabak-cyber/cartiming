"use client";

import { useEffect, useState } from "react";
import { Download, X, Share } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "cartiming_install_dismissed";

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [show, setShow] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 이미 홈화면 앱(standalone)으로 실행 중이면 숨김
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone ===
        true;
    if (standalone) return;

    // 사용자가 닫은 적 있으면 숨김
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    const ua = window.navigator.userAgent;
    const ios = /iPhone|iPad|iPod/i.test(ua);
    setIsIos(ios);

    if (ios) {
      // 아이폰은 beforeinstallprompt 없음 → 안내 배너 표시
      setShow(true);
      return;
    }

    // 안드로이드/크롬: 설치 가능 이벤트 캡처
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = () => {
    setShow(false);
    setShowIosGuide(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // 무시
    }
  };

  const install = async () => {
    if (isIos) {
      setShowIosGuide(true);
      return;
    }
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") {
      setShow(false);
    }
    setDeferred(null);
  };

  if (!show) return null;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icons/icon-192.png"
          alt="카타이밍"
          className="h-10 w-10 rounded-lg"
        />
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">
            홈 화면에 카타이밍 추가하기
          </p>
          <p className="text-xs text-muted">
            앱 설치 없이 아이콘만 추가돼요. 매각 적기 알림을 놓치지 마세요!
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="닫기"
          className="text-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {!showIosGuide ? (
        <>
          <button
            type="button"
            onClick={install}
            className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            <Download className="h-4 w-4" />
            {isIos ? "추가 방법 보기" : "홈 화면에 추가"}
          </button>
          <p className="text-[11px] text-muted">
            ※ 설치 중 &quot;안전하지 않은 앱&quot; 같은 구글 안내가 떠도
            일시적인 현상이에요. 정식 앱은 추후 플레이스토어에 등록될
            예정입니다. 안심하고 &quot;무시하고 설치&quot; 또는
            &quot;추가&quot;를 눌러주세요.
          </p>
        </>
      ) : (
        <div className="flex flex-col gap-1.5 rounded-lg bg-background p-3 text-xs text-foreground">
          <p className="font-semibold">아이폰 추가 방법 (3초)</p>
          <p className="flex items-center gap-1">
            1. 사파리 하단의 <Share className="inline h-3.5 w-3.5" /> (공유)
            버튼을 누르세요
          </p>
          <p>2. &quot;홈 화면에 추가&quot;를 누르세요</p>
          <p>3. 오른쪽 위 &quot;추가&quot;를 누르면 끝!</p>
        </div>
      )}
    </div>
  );
}
