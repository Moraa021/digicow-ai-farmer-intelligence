import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  addAdvice,
  listAdvice,
  removeAdvice,
  type AdviceEntry,
} from "@/lib/local-store";
import { useT } from "@/lib/i18n";

export function AdviceLogger({
  farmerName,
  refreshKey = 0,
}: {
  farmerName: string;
  refreshKey?: number;
}) {
  const { t, lang } = useT();
  const [topic, setTopic] = useState("");
  const [note, setNote] = useState("");
  const [entries, setEntries] = useState<AdviceEntry[]>([]);

  const reload = () => setEntries(listAdvice(farmerName));
  useEffect(reload, [farmerName, refreshKey]);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || !note.trim()) {
      toast.error("Topic and advice are required");
      return;
    }
    addAdvice(farmerName, topic.trim(), note.trim());
    setTopic("");
    setNote("");
    reload();
    toast.success("Advice logged");
  };

  const fmt = (ts: number) =>
    new Date(ts).toLocaleString(lang === "sw" ? "sw-KE" : "en-KE", {
      dateStyle: "medium",
      timeStyle: "short",
    });

  return (
    <section className="card-surface p-6">
      <h2 className="text-lg font-semibold">📒 {t("advice.title")}</h2>
      <p className="text-sm text-muted-foreground">{t("advice.subtitle")}</p>

      <form onSubmit={save} className="mt-4 grid gap-3 sm:grid-cols-[1fr_2fr_auto]">
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder={t("advice.topic")}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/40"
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t("advice.note")}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/40"
        />
        <button
          type="submit"
          className="rounded-lg brand-gradient px-4 py-2 text-sm font-semibold text-primary-foreground shadow-brand"
        >
          ＋ {t("advice.save")}
        </button>
      </form>

      <ul className="mt-5 space-y-2">
        {entries.length === 0 ? (
          <li className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
            {t("advice.empty")}
          </li>
        ) : (
          entries.map((e) => (
            <li
              key={e.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-border bg-background p-3"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                    {e.topic}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {fmt(e.createdAt)}
                  </span>
                </div>
                <p className="mt-1.5 whitespace-pre-wrap text-sm">{e.note}</p>
              </div>
              <button
                onClick={() => {
                  removeAdvice(farmerName, e.id);
                  reload();
                }}
                className="shrink-0 rounded-lg border border-destructive/30 bg-destructive/5 px-2 py-1 text-xs font-semibold text-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                {t("advice.delete")}
              </button>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
