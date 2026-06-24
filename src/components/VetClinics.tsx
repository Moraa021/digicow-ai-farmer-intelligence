import { findClinics } from "@/lib/knowledge";
import { useT } from "@/lib/i18n";

export function VetClinics({ location }: { location: string }) {
  const { t } = useT();
  const clinics = findClinics(location);
  const showing = clinics.length ? clinics : findClinics("");

  return (
    <section className="card-surface p-6">
      <h2 className="text-lg font-semibold">🏥 {t("vet.title")}</h2>
      <p className="text-sm text-muted-foreground">
        {t("vet.subtitle")} {location ? `· ${location}` : ""}
      </p>
      {!clinics.length && (
        <p className="mt-3 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
          {t("vet.noResults")}
        </p>
      )}
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {showing.map((c) => {
          const q = encodeURIComponent(`${c.name}, ${c.town}, Kenya`);
          return (
            <li
              key={c.name}
              className="rounded-xl border border-border bg-background p-4"
            >
              <div className="font-semibold">{c.name}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                📍 {c.town}, {c.county}
              </div>
              <div className="mt-1 text-sm">📞 {c.phone}</div>
              <div className="mt-3 flex gap-2">
                <a
                  href={`tel:${c.phone.replace(/\s+/g, "")}`}
                  className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  {t("vet.call")}
                </a>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${q}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-secondary"
                >
                  🗺️ {t("vet.directions")}
                </a>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
