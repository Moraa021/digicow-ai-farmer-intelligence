import {
  createFileRoute,
  Link,
  useNavigate,
} from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { api } from "@/lib/api";
import { PriorityBadge } from "@/components/PriorityBadge";
import { SymptomChecker } from "@/components/SymptomChecker";
import { ComplaintAdvisor } from "@/components/ComplaintAdvisor";
import { AdviceLogger } from "@/components/AdviceLogger";
import { PriorityAdjuster } from "@/components/PriorityAdjuster";
import { VetClinics } from "@/components/VetClinics";
import { EditFarmerDialog } from "@/components/EditFarmerDialog";
import { effectivePriority, addAdvice } from "@/lib/local-store";
import { useT } from "@/lib/i18n";

const searchSchema = z.object({
  recommend: z.boolean().optional(),
});

export const Route = createFileRoute("/farmers/$name")({
  validateSearch: searchSchema,
  head: ({ params }) => ({
    meta: [
      { title: `${params.name} · DigiCow AI` },
      {
        name: "description",
        content: `Farmer profile and AI recommendations for ${params.name}.`,
      },
    ],
  }),
  component: FarmerProfile,
});

function FarmerProfile() {
  const { name } = Route.useParams();
  const { recommend: autoRecommend } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { t } = useT();

  const { data: farmer, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["farmer", name],
    queryFn: () => api.getFarmer(name),
  });

  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [adviceVersion, setAdviceVersion] = useState(0);
  const [editing, setEditing] = useState(false);

  const recM = useMutation({
    mutationFn: () => api.recommend(name),
    onSuccess: (data) => {
      setRecommendation(data.recommendation);
      toast.success("AI recommendation generated");
    },
    onError: (e: Error) => toast.error(e.message || "AI request failed"),
  });

  const delM = useMutation({
    mutationFn: () => api.deleteFarmer(name),
    onSuccess: () => {
      toast.success(`${name} deleted`);
      qc.invalidateQueries({ queryKey: ["farmers"] });
      navigate({ to: "/" });
    },
    onError: (e: Error) => toast.error(e.message || "Delete failed"),
  });

  useEffect(() => {
    if (autoRecommend && farmer && !recommendation && !recM.isPending) {
      recM.mutate();
      // clear the query param
      navigate({
        to: "/farmers/$name",
        params: { name },
        search: {},
        replace: true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRecommend, farmer]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="card-surface h-40 animate-pulse bg-muted/40" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="card-surface h-32 animate-pulse bg-muted/40" />
          <div className="card-surface h-32 animate-pulse bg-muted/40" />
        </div>
      </div>
    );
  }

  if (isError || !farmer) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <h1 className="text-xl font-semibold text-destructive">
          Couldn't load this farmer
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {(error as Error)?.message ?? "Not found."}
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => refetch()}
            className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-secondary"
          >
            Retry
          </button>
          <Link
            to="/"
            className="rounded-lg brand-gradient px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            ← Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const income =
    typeof farmer.income === "number" && farmer.income > 0
      ? `KES ${farmer.income.toLocaleString()}`
      : "—";

  const handleDelete = () => {
    if (confirm(`Delete farmer "${name}"? This cannot be undone.`)) {
      delM.mutate();
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
      <Link
        to="/"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        {t("profile.back")}
      </Link>

      {/* Header card */}
      <section className="card-surface mt-3 overflow-hidden">
        <div className="brand-gradient h-2 w-full" />
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 p-6 sm:p-8">
          <div className="flex min-w-0 items-center gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl brand-gradient text-2xl font-bold text-primary-foreground shadow-brand">
              {farmer.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold sm:text-3xl">
                {farmer.name}
              </h1>
              <p className="truncate text-sm text-muted-foreground">
                📍 {farmer.location || "Unknown location"} · 📱{" "}
                {farmer.phone || "—"}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <PriorityBadge score={effectivePriority(farmer.name, farmer.priority)} />
            <button
              onClick={() => setEditing(true)}
              className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground"
            >
              ✏️ {t("card.edit")}
            </button>
          </div>
        </div>

        <div className="grid gap-4 border-t border-border p-6 sm:grid-cols-3 sm:p-8">
          <Metric label={t("profile.annualIncome")} value={income} />
          <Metric label={t("profile.livestock")} value={`${farmer.cows.length} cow(s)`} />
          <Metric
            label={t("profile.activeDiseases")}
            value={`${farmer.diseases.length}`}
            tone={farmer.diseases.length ? "critical" : "low"}
          />
        </div>
      </section>

      {/* Cows + Diseases */}
      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="card-surface p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            🐮 Livestock
          </h2>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {farmer.cows.length ? (
              farmer.cows.map((c) => (
                <span
                  key={c}
                  className="rounded-full bg-secondary px-3 py-1 text-sm font-medium text-secondary-foreground"
                >
                  {c}
                </span>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">
                No livestock recorded.
              </span>
            )}
          </div>
        </div>
        <div className="card-surface p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            🦠 Diseases
          </h2>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {farmer.diseases.length ? (
              farmer.diseases.map((d) => (
                <span
                  key={d}
                  className="rounded-full bg-critical/10 px-3 py-1 text-sm font-medium text-critical"
                >
                  {d}
                </span>
              ))
            ) : (
              <span className="rounded-full bg-low/15 px-3 py-1 text-sm font-medium text-low">
                ✅ Healthy
              </span>
            )}
          </div>
        </div>
      </section>

      {/* AI Recommendation */}
      <section className="card-surface mt-6 p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">
              🤖 {t("profile.aiTitle")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("profile.aiSubtitle")}
            </p>
          </div>
          <button
            onClick={() => recM.mutate()}
            disabled={recM.isPending}
            className="rounded-lg brand-gradient px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-brand transition hover:scale-[1.02] disabled:opacity-60"
          >
            {recM.isPending
              ? `🧠 ${t("profile.analyzing")}`
              : recommendation
                ? `↻ ${t("profile.regenerate")}`
                : `✨ ${t("profile.generate")}`}
          </button>
        </div>

        {recM.isPending && (
          <div className="mt-5 space-y-2">
            <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-3 w-full animate-pulse rounded bg-muted" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
          </div>
        )}

        {recommendation && !recM.isPending && (
          <article className="mt-5 rounded-xl border border-primary/15 bg-gradient-to-br from-secondary/40 to-accent/40 p-5">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {recommendation}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-primary/15 pt-3 text-xs text-muted-foreground">
              <span className="font-semibold text-primary">📚 Sources:</span>
              <span>ILRI Dairy Manual</span>
              <span>·</span>
              <span>KALRO Dairy TIMPs</span>
              <button
                type="button"
                onClick={() => {
                  addAdvice(farmer.name, "AI recommendation", recommendation);
                  setAdviceVersion((v) => v + 1);
                  toast.success("Saved to advice log");
                }}
                className="ml-auto rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary hover:text-primary-foreground"
              >
                📒 Log to advice
              </button>
            </div>
          </article>
        )}

        {!recommendation && !recM.isPending && (
          <p className="mt-4 rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
            {t("profile.aiHint")}
          </p>
        )}
      </section>

      {/* New feature stack */}
      <div className="mt-6 grid gap-6">
        <SymptomChecker farmer={farmer} />
        <ComplaintAdvisor
          farmerName={farmer.name}
          onLogged={() => setAdviceVersion((v) => v + 1)}
        />
        <PriorityAdjuster farmerName={farmer.name} apiScore={farmer.priority ?? 0} />
        <VetClinics location={farmer.location} />
        <AdviceLogger farmerName={farmer.name} refreshKey={adviceVersion} />
      </div>

      {/* Danger zone */}
      <section className="card-surface mt-6 border-destructive/30 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-destructive">
              {t("profile.dangerZone")}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t("profile.dangerHint")}
            </p>
          </div>
          <button
            onClick={handleDelete}
            disabled={delM.isPending}
            className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-2 text-sm font-semibold text-destructive transition hover:bg-destructive hover:text-destructive-foreground disabled:opacity-60"
          >
            {delM.isPending ? t("profile.deleting") : `🗑️ ${t("profile.deleteBtn")}`}
          </button>
        </div>
      </section>

      <EditFarmerDialog
        farmer={editing ? farmer : null}
        open={editing}
        onClose={() => setEditing(false)}
      />
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "critical" | "low";
}) {
  const color =
    tone === "critical"
      ? "text-critical"
      : tone === "low"
        ? "text-low"
        : "text-foreground";
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={`mt-1 text-xl font-bold tracking-tight ${color}`}>
        {value}
      </div>
    </div>
  );
}
