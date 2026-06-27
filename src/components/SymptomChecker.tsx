import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { matchDiseases } from "@/lib/knowledge";
import type { Farmer } from "@/lib/types";
import { useT } from "@/lib/i18n";

export function SymptomChecker({ farmer }: { farmer: Farmer }) {
  const { t } = useT();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState("");

  const matches = useMemo(() => matchDiseases(submitted), [submitted]);
  const top = matches[0];

  const addM = useMutation({
    mutationFn: (disease: string) =>
      api.updateFarmer({
        name: farmer.name,
        location: farmer.location,
        phone: farmer.phone,
        income: farmer.income,
        cows: farmer.cows,
        soil: farmer.soil,
        diseases: Array.from(new Set([...(farmer.diseases || []), disease])),
        milk_production: farmer.milk_production ?? 0,
      }),
    onSuccess: (_d, disease) => {
      toast.success(`Added ${disease} to ${farmer.name}`);
      qc.invalidateQueries({ queryKey: ["farmer", farmer.name] });
      qc.invalidateQueries({ queryKey: ["farmers"] });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to update"),
  });

  return (
    <section className="card-surface p-6">
      <h2 className="text-lg font-semibold">🩺 {t("symptom.title")}</h2>
      <p className="text-sm text-muted-foreground">{t("symptom.subtitle")}</p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(text);
        }}
        className="mt-4 space-y-3"
      >
        <textarea
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("symptom.placeholder")}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/40"
        />
        <button
          type="submit"
          className="rounded-lg brand-gradient px-4 py-2 text-sm font-semibold text-primary-foreground shadow-brand"
        >
          🔎 {t("symptom.analyze")}
        </button>
      </form>

      {submitted && !top && (
        <p className="mt-4 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
          {t("symptom.noMatch")}
        </p>
      )}

      {top && (
        <div className="mt-5 rounded-xl border border-primary/15 bg-gradient-to-br from-secondary/40 to-accent/40 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("symptom.match")}
            </span>
            <span className="rounded-full brand-gradient px-3 py-1 text-sm font-bold text-primary-foreground">
              {top.name}
            </span>
            <span className="text-xs text-muted-foreground">
              {Math.round(top.score * 100)}% {t("symptom.confidence")}
            </span>
            <button
              onClick={() => addM.mutate(top.name)}
              disabled={addM.isPending}
              className="ml-auto rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
            >
              {addM.isPending ? "…" : `＋ ${t("symptom.addToProfile")}`}
            </button>
          </div>
          <div className="mt-3 grid gap-2 text-sm">
            <p>
              <strong className="text-primary">Treatment:</strong> {top.treatment}
            </p>
            <p>
              <strong className="text-primary">Prevention:</strong> {top.prevention}
            </p>
            <p className="text-xs text-muted-foreground">
              Matched cues: {top.matched.join(", ")}
            </p>
          </div>

          {matches.length > 1 && (
            <div className="mt-4 border-t border-primary/15 pt-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("symptom.alsoConsider")}
              </p>
              <ul className="mt-1 flex flex-wrap gap-1.5">
                {matches.slice(1).map((m) => (
                  <li
                    key={m.name}
                    className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground"
                  >
                    {m.name} · {Math.round(m.score * 100)}%
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
