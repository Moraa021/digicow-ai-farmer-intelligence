import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  clearPriorityOverride,
  effectivePriority,
  getPriorityOverride,
  setPriorityOverride,
} from "@/lib/local-store";
import { useT } from "@/lib/i18n";
import { PriorityBadge } from "./PriorityBadge";
import { useQueryClient } from "@tanstack/react-query";

export function PriorityAdjuster({
  farmerName,
  apiScore,
}: {
  farmerName: string;
  apiScore: number;
}) {
  const { t } = useT();
  const qc = useQueryClient();
  const [score, setScore] = useState<number>(effectivePriority(farmerName, apiScore));
  const [reason, setReason] = useState("");
  const [override, setOverride] = useState(getPriorityOverride(farmerName));

  useEffect(() => {
    setScore(effectivePriority(farmerName, apiScore));
    setOverride(getPriorityOverride(farmerName));
  }, [farmerName, apiScore]);

  const save = () => {
    if (score < 0 || score > 100) {
      toast.error("Score must be 0–100");
      return;
    }
    setPriorityOverride(farmerName, Math.round(score), reason.trim());
    setOverride(getPriorityOverride(farmerName));
    qc.invalidateQueries({ queryKey: ["farmers"] });
    toast.success("Criticality adjusted");
  };

  const reset = () => {
    clearPriorityOverride(farmerName);
    setOverride(null);
    setScore(apiScore);
    setReason("");
    qc.invalidateQueries({ queryKey: ["farmers"] });
    toast.success("Reset to API value");
  };

  return (
    <section className="card-surface p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">🎚️ {t("priority.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("priority.subtitle")}</p>
        </div>
        <PriorityBadge score={effectivePriority(farmerName, apiScore)} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t("priority.current")}
          </label>
          <div className="mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm">
            {apiScore} (API)
          </div>
        </div>
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t("priority.new")}
          </label>
          <input
            type="number"
            min={0}
            max={100}
            value={score}
            onChange={(e) => setScore(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/40"
          />
          <input
            type="range"
            min={0}
            max={100}
            value={score}
            onChange={(e) => setScore(Number(e.target.value))}
            className="mt-2 w-full accent-[color:var(--color-primary)]"
          />
        </div>
        <div className="flex flex-col gap-2">
          <button
            onClick={save}
            className="rounded-lg brand-gradient px-4 py-2 text-sm font-semibold text-primary-foreground shadow-brand"
          >
            💾 {t("priority.save")}
          </button>
          {override && (
            <button
              onClick={reset}
              className="rounded-lg border border-border bg-background px-4 py-2 text-xs font-semibold hover:bg-secondary"
            >
              ↺ {t("priority.reset")}
            </button>
          )}
        </div>
      </div>

      <div className="mt-3">
        <label className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {t("priority.reason")}
        </label>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. follow-up visit showed recovery"
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/40"
        />
      </div>

      {override && (
        <p className="mt-3 rounded-lg bg-primary/5 p-3 text-xs text-muted-foreground">
          <span className="font-semibold text-primary">
            {t("priority.overridden")}:
          </span>{" "}
          {override.score} — {override.reason || "no reason given"} ·{" "}
          {new Date(override.updatedAt).toLocaleDateString()}
        </p>
      )}
    </section>
  );
}
