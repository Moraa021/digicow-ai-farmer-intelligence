import { Link } from "@tanstack/react-router";
import type { Farmer } from "@/lib/types";
import { PriorityBadge } from "./PriorityBadge";
import { effectivePriority } from "@/lib/local-store";
import { useT } from "@/lib/i18n";

export function FarmerCard({
  farmer,
  onDelete,
  onEdit,
  deleting,
}: {
  farmer: Farmer;
  onDelete: (name: string) => void;
  onEdit: (farmer: Farmer) => void;
  deleting?: boolean;
}) {
  const { t } = useT();
  const income =
    typeof farmer.income === "number" && farmer.income > 0
      ? `KES ${farmer.income.toLocaleString()}`
      : "—";
  const priority = effectivePriority(farmer.name, farmer.priority);

  return (
    <article className="card-surface card-hover group flex flex-col p-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent text-lg font-bold text-accent-foreground">
            {farmer.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold">{farmer.name}</h3>
            <p className="truncate text-xs text-muted-foreground">
              📍 {farmer.location || "Unknown location"}
            </p>
          </div>
        </div>
        <PriorityBadge score={priority} />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="min-w-0">
          <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {t("card.income")}
          </dt>
          <dd className="truncate font-medium">{income}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {t("card.phone")}
          </dt>
          <dd className="truncate font-medium">{farmer.phone || "—"}</dd>
        </div>
      </dl>

      <div className="mt-4 space-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground mr-1">
            🐮 {t("card.cows")}
          </span>
          {farmer.cows.length ? (
            farmer.cows.map((c) => (
              <span
                key={c}
                className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground"
              >
                {c}
              </span>
            ))
          ) : (
            <span className="text-xs text-muted-foreground">{t("card.noLivestock")}</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground mr-1">
            🦠 {t("card.diseases")}
          </span>
          {farmer.diseases.length ? (
            farmer.diseases.map((d) => (
              <span
                key={d}
                className="rounded-full bg-critical/10 px-2.5 py-0.5 text-xs font-medium text-critical"
              >
                {d}
              </span>
            ))
          ) : (
            <span className="rounded-full bg-low/15 px-2.5 py-0.5 text-xs font-medium text-low">
              ✅ {t("card.healthy")}
            </span>
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <Link
          to="/farmers/$name"
          params={{ name: farmer.name }}
          className="rounded-lg border border-border bg-background px-3 py-2 text-center text-xs font-semibold text-foreground hover:bg-secondary transition"
        >
          {t("card.view")}
        </Link>
        <button
          type="button"
          onClick={() => onEdit(farmer)}
          className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition"
        >
          ✏️ {t("card.edit")}
        </button>
        <Link
          to="/farmers/$name"
          params={{ name: farmer.name }}
          search={{ recommend: true }}
          className="rounded-lg brand-gradient px-3 py-2 text-center text-xs font-semibold text-primary-foreground shadow-sm hover:shadow-brand transition"
        >
          🤖 {t("card.ai")}
        </Link>
        <button
          type="button"
          disabled={deleting}
          onClick={() => onDelete(farmer.name)}
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive hover:text-destructive-foreground transition disabled:opacity-50"
        >
          {deleting ? "…" : t("card.delete")}
        </button>
      </div>
    </article>
  );
}
