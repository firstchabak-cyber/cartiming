"use client";

import { cn } from "@/lib/utils/cn";

type Region = {
  part: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
};

// viewBox 200 × 350, top view: 앞(위) ↓ 뒤(아래)
const REGIONS: Region[] = [
  { part: "앞범퍼", x: 20, y: 10, width: 160, height: 18, label: "앞범퍼" },
  { part: "앞펜더(좌)", x: 8, y: 28, width: 42, height: 65, label: "L펜더" },
  { part: "본넷", x: 50, y: 28, width: 100, height: 65, label: "본넷" },
  { part: "앞펜더(우)", x: 150, y: 28, width: 42, height: 65, label: "R펜더" },
  { part: "사이드미러(좌)", x: 0, y: 96, width: 8, height: 14 },
  { part: "사이드미러(우)", x: 192, y: 96, width: 8, height: 14 },
  { part: "앞도어(좌)", x: 8, y: 93, width: 42, height: 80, label: "L앞" },
  { part: "루프", x: 50, y: 93, width: 100, height: 160, label: "루프" },
  { part: "앞도어(우)", x: 150, y: 93, width: 42, height: 80, label: "R앞" },
  { part: "뒷도어(좌)", x: 8, y: 173, width: 42, height: 80, label: "L뒤" },
  { part: "뒷도어(우)", x: 150, y: 173, width: 42, height: 80, label: "R뒤" },
  { part: "뒷펜더(좌)", x: 8, y: 253, width: 42, height: 65, label: "L펜더" },
  { part: "트렁크", x: 50, y: 253, width: 100, height: 65, label: "트렁크" },
  { part: "뒷펜더(우)", x: 150, y: 253, width: 42, height: 65, label: "R펜더" },
  { part: "뒷범퍼", x: 20, y: 318, width: 160, height: 18, label: "뒷범퍼" },
];

export function CarDiagram({
  value,
  onChange,
}: {
  value: string;
  onChange: (part: string) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-xs text-muted">
        도면에서 외판 부위를 탭하면 자동 선택됩니다
      </p>
      <svg
        viewBox="0 0 200 350"
        className="h-72 w-full max-w-[260px]"
        aria-label="차량 외판 도면"
      >
        <text
          x="100"
          y="6"
          textAnchor="middle"
          className="fill-muted text-[7px]"
        >
          ▲ 앞
        </text>
        <text
          x="100"
          y="346"
          textAnchor="middle"
          className="fill-muted text-[7px]"
        >
          ▼ 뒤
        </text>

        {REGIONS.map((r) => {
          const selected = r.part === value;
          return (
            <g
              key={r.part}
              role="button"
              tabIndex={0}
              aria-label={r.part}
              aria-pressed={selected}
              onClick={() => onChange(r.part)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onChange(r.part);
                }
              }}
              className="cursor-pointer outline-none focus:outline-none"
            >
              <rect
                x={r.x}
                y={r.y}
                width={r.width}
                height={r.height}
                rx={3}
                ry={3}
                strokeWidth={1.2}
                className={cn(
                  "transition-colors",
                  selected
                    ? "fill-primary stroke-primary-hover"
                    : "fill-surface stroke-border hover:fill-[#dbeafe]",
                )}
              />
              {r.label && (
                <text
                  x={r.x + r.width / 2}
                  y={r.y + r.height / 2 + 3}
                  textAnchor="middle"
                  className={cn(
                    "pointer-events-none select-none text-[8px] font-medium",
                    selected ? "fill-white" : "fill-muted",
                  )}
                >
                  {r.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <p className="text-xs">
        {value ? (
          <span className="text-foreground">
            선택: <span className="font-semibold">{value}</span>
          </span>
        ) : (
          <span className="text-muted">선택된 부위 없음</span>
        )}
      </p>
    </div>
  );
}
