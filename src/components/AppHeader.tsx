import { Link } from "@tanstack/react-router";
import { LanguageToggle } from "./LanguageToggle";
import { useT } from "@/lib/i18n";

export function AppHeader() {
  const { t } = useT();
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-3 group min-w-0">
          <div className="grid h-10 w-10 place-items-center rounded-xl brand-gradient text-xl shadow-brand transition-transform group-hover:scale-105">
            🐄
          </div>
          <div className="min-w-0">
            <div className="text-base font-bold tracking-tight leading-tight">
              DigiCow <span className="brand-text">AI</span>
            </div>
            <div className="text-[11px] text-muted-foreground leading-tight truncate">
              {t("app.title")}
            </div>
          </div>
        </Link>

        <nav className="flex items-center gap-1.5 sm:gap-2">
          <LanguageToggle />
          <Link
            to="/"
            activeOptions={{ exact: true }}
            activeProps={{ className: "bg-secondary text-secondary-foreground" }}
            className="hidden sm:inline-flex rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary/70 hover:text-foreground transition"
          >
            {t("nav.dashboard")}
          </Link>
          <Link
            to="/farmers/add"
            activeProps={{ className: "shadow-brand" }}
            className="inline-flex items-center gap-1.5 rounded-lg brand-gradient px-3 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:shadow-brand transition"
          >
            <span>＋</span>
            <span className="hidden sm:inline">{t("nav.addFarmer")}</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
