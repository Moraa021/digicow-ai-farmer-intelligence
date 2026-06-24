import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { getPriorityLevel, type Farmer, type PriorityLevel } from "@/lib/types";
import { FarmerCard } from "@/components/FarmerCard";
import { EditFarmerDialog } from "@/components/EditFarmerDialog";
import { exportFarmersCSV, exportFarmersPDF } from "@/lib/export";
import { effectivePriority } from "@/lib/local-store";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard · DigiCow AI" },
      {
        name: "description",
        content:
          "Browse, filter, and triage smallholder dairy farmers by priority.",
      },
    ],
  }),
  component: Dashboard,
});

const FILTERS: ("All" | PriorityLevel)[] = [
  "All",
  "Critical",
  "High",
  "Medium",
  "Low",
];

function Dashboard() {
  const { t } = useT();
  const qc = useQueryClient();
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["farmers"],
    queryFn: api.listFarmers,
    staleTime: 30_000,
  });

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [editing, setEditing] = useState<Farmer | null>(null);

  const farmers: Farmer[] = data ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return farmers
      .filter((f) =>
        filter === "All"
          ? true
          : getPriorityLevel(effectivePriority(f.name, f.priority)) === filter,
      )
      .filter(
        (f) =>
          !q ||
          f.name.toLowerCase().includes(q) ||
          (f.location || "").toLowerCase().includes(q) ||
          f.cows.some((c) => c.toLowerCase().includes(q)) ||
          f.diseases.some((d) => d.toLowerCase().includes(q)),
      )
      .sort(
        (a, b) =>
          effectivePriority(b.name, b.priority) -
          effectivePriority(a.name, a.priority),
      );
  }, [farmers, filter, search]);

  const stats = useMemo(() => {
    const total = farmers.length;
    const critical = farmers.filter(
      (f) => effectivePriority(f.name, f.priority) >= 75,
    ).length;
    const withDisease = farmers.filter((f) => f.diseases.length > 0).length;
    return { total, critical, withDisease };
  }, [farmers]);

  const deleteM = useMutation({
    mutationFn: (name: string) => api.deleteFarmer(name),
    onSuccess: (_d, name) => {
      toast.success(`${name} removed`);
      qc.invalidateQueries({ queryKey: ["farmers"] });
    },
    onError: (e: Error) => toast.error(e.message || "Delete failed"),
  });

  const handleDelete = (name: string) => {
    if (confirm(`Delete farmer "${name}"? This cannot be undone.`)) {
      deleteM.mutate(name);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
      {/* Hero */}
      <section className="mb-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              {t("dash.eyebrow")}
            </p>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
              {t("dash.headline.a")}{" "}
              <span className="brand-text">{t("dash.headline.b")}</span>.
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {t("dash.subtitle")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => exportFarmersCSV(farmers)}
              disabled={!farmers.length}
              className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-secondary transition disabled:opacity-50"
            >
              📥 {t("dash.exportCsv")}
            </button>
            <button
              onClick={() => exportFarmersPDF(farmers)}
              disabled={!farmers.length}
              className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-secondary transition disabled:opacity-50"
            >
              📥 {t("dash.exportPdf")}
            </button>
            <button
              onClick={() => refetch()}
              className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-secondary transition"
            >
              {isFetching ? t("dash.refreshing") : `↻ ${t("dash.refresh")}`}
            </button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard label={t("dash.totalFarmers")} value={stats.total} accent="primary" />
        <StatCard
          label={t("dash.critical")}
          value={stats.critical}
          accent="critical"
        />
        <StatCard
          label={t("dash.withDisease")}
          value={stats.withDisease}
          accent="high"
        />
      </section>

      {/* Controls */}
      <section className="card-surface mb-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            🔍
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("dash.searchPlaceholder")}
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/40"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                filter === f
                  ? "brand-gradient text-primary-foreground shadow-sm"
                  : "bg-secondary text-secondary-foreground hover:bg-accent"
              }`}
            >
              {t(`filter.${f}`)}
            </button>
          ))}
        </div>
      </section>

      {/* Results */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="card-surface h-64 animate-pulse bg-muted/40"
            />
          ))}
        </div>
      ) : isError ? (
        <div className="card-surface p-8 text-center">
          <p className="font-semibold text-destructive">Couldn't load farmers</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {(error as Error)?.message}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-4 rounded-lg brand-gradient px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card-surface p-10 text-center">
          <div className="text-4xl">🌾</div>
          <h3 className="mt-3 text-lg font-semibold">{t("dash.empty")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("dash.emptyHint")}
          </p>
          <Link
            to="/farmers/add"
            className="mt-4 inline-flex rounded-lg brand-gradient px-4 py-2 text-sm font-semibold text-primary-foreground shadow-brand"
          >
            ＋ {t("nav.addFarmer")}
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((f) => (
            <FarmerCard
              key={f.name}
              farmer={f}
              onDelete={handleDelete}
              onEdit={setEditing}
              deleting={deleteM.isPending && deleteM.variables === f.name}
            />
          ))}
        </div>
      )}

      <EditFarmerDialog
        farmer={editing}
        open={!!editing}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "primary" | "critical" | "high";
}) {
  const border =
    accent === "critical"
      ? "border-l-critical"
      : accent === "high"
        ? "border-l-high"
        : "border-l-primary";
  return (
    <div className={`card-surface border-l-4 p-5 ${border}`}>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-3xl font-bold tracking-tight">{value}</div>
    </div>
  );
}
