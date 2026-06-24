import { getPriorityLevel } from "@/lib/types";
import { cn } from "@/lib/utils";

const STYLES: Record<string, string> = {
  Critical: "bg-critical text-critical-foreground",
  High: "bg-high text-high-foreground",
  Medium: "bg-medium text-medium-foreground",
  Low: "bg-low text-low-foreground",
};

const DOT: Record<string, string> = {
  Critical: "🔴",
  High: "🟠",
  Medium: "🟡",
  Low: "🟢",
};

export function PriorityBadge({
  score,
  showScore = true,
  className,
}: {
  score: number;
  showScore?: boolean;
  className?: string;
}) {
  const level = getPriorityLevel(score);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap",
        STYLES[level],
        className,
      )}
    >
      <span aria-hidden>{DOT[level]}</span>
      {level}
      {showScore && <span className="opacity-80">· {score}/100</span>}
    </span>
  );
}
