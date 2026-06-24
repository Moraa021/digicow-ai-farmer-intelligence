import { useT } from "@/lib/i18n";

export function LanguageToggle() {
  const { lang, setLang } = useT();
  return (
    <div
      role="group"
      aria-label="Language"
      className="inline-flex items-center rounded-lg border border-border bg-card p-0.5 text-xs font-semibold"
    >
      <button
        type="button"
        onClick={() => setLang("en")}
        aria-pressed={lang === "en"}
        className={`rounded-md px-2.5 py-1 transition ${
          lang === "en"
            ? "brand-gradient text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLang("sw")}
        aria-pressed={lang === "sw"}
        className={`rounded-md px-2.5 py-1 transition ${
          lang === "sw"
            ? "brand-gradient text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        SW
      </button>
    </div>
  );
}
