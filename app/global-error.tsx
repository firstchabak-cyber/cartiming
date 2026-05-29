"use client";

/**
 * 루트 레이아웃 자체가 깨지는 최악의 경우 표시되는 최종 안전망.
 * 자체 <html>/<body> 를 가져야 한다.
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ko">
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: "1.5rem",
        }}
      >
        <p style={{ fontSize: "3rem" }}>😵</p>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700 }}>
          일시적인 오류가 발생했어요
        </h1>
        <p style={{ color: "#666", maxWidth: "20rem", fontSize: "0.875rem" }}>
          잠시 후 다시 시도해 주세요. 문제가 계속되면 help@cartiming.app 으로
          알려주세요.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: "0.5rem",
            borderRadius: "0.75rem",
            background: "#2563EB",
            color: "#fff",
            border: "none",
            padding: "0.625rem 1.25rem",
            fontSize: "0.875rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          다시 시도
        </button>
      </body>
    </html>
  );
}
