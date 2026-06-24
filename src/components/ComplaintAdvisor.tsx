import { useMemo, useState } from "react";
import { adviseComplaint } from "@/lib/knowledge";
import { addAdvice } from "@/lib/local-store";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";

export function ComplaintAdvisor({
  farmerName,
  onLogged,
}: {
  farmerName: string;
  onLogged?: () => void;
}) {
  const { t } = useT();
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState("");
  const advice = useMemo(() => adviseComplaint(submitted), [submitted]);

  return (
    <section className="card-surface p-6">
      <h2 className="text-lg font-semibold">💬 {t("complaint.title")}</h2>
      <p className="text-sm text-muted-foreground">{t("complaint.subtitle")}</p>

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
          placeholder={t("complaint.placeholder")}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/40"
        />
        <button
          type="submit"
          className="rounded-lg brand-gradient px-4 py-2 text-sm font-semibold text-primary-foreground shadow-brand"
        >
          ✨ {t("complaint.getAdvice")}
        </button>
      </form>

      {advice && submitted && (
        <div className="mt-5 rounded-xl border border-primary/15 bg-gradient-to-br from-secondary/40 to-accent/40 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("complaint.category")}
            </span>
            <span className="rounded-full brand-gradient px-3 py-1 text-xs font-bold text-primary-foreground">
              {advice.category}
            </span>
            <button
              type="button"
              onClick={() => {
                addAdvice(farmerName, advice.category, advice.advice);
                toast.success("Advice logged");
                onLogged?.();
              }}
              className="ml-auto rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground"
            >
              📒 Log to farmer
            </button>
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">
            {advice.advice}
          </p>
        </div>
      )}
    </section>
  );
}
