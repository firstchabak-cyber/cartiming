import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export function Container({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-mobile px-4",
        className,
      )}
      {...props}
    />
  );
}
