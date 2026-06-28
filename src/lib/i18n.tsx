import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Lang = "en" | "sw";

type Dict = Record<string, { en: string; sw: string }>;

const DICT: Dict = {
  "app.title": { en: "Extension Agent Dashboard", sw: "Dashibodi ya Afisa Ugani" },
  "nav.dashboard": { en: "Dashboard", sw: "Dashibodi" },
  "nav.addFarmer": { en: "Add Farmer", sw: "Ongeza Mkulima" },
  "nav.language": { en: "Language", sw: "Lugha" },

  "dash.eyebrow": { en: "Farmer Intelligence", sw: "Akili ya Mkulima" },
  "dash.headline.a": { en: "Triage your farmers,", sw: "Panga wakulima wako," },
  "dash.headline.b": { en: "act with confidence", sw: "tenda kwa ujasiri" },
  "dash.subtitle": {
    en: "Evidence-based recommendations from KALRO Dairy TIMPs and ILRI Good Dairy Practices — reviewed by you, the extension agent.",
    sw: "Mapendekezo ya kisayansi kutoka KALRO na ILRI — yaliyokaguliwa nawe, afisa ugani.",
  },
  "dash.exportCsv": { en: "Export CSV", sw: "Hamisha CSV" },
  "dash.exportPdf": { en: "Export PDF", sw: "Hamisha PDF" },
  "dash.refresh": { en: "Refresh", sw: "Onyesha upya" },
  "dash.refreshing": { en: "Refreshing…", sw: "Inaonyesha upya…" },
  "dash.totalFarmers": { en: "Total Farmers", sw: "Wakulima Wote" },
  "dash.critical": { en: "Critical Priority", sw: "Kipaumbele cha Dharura" },
  "dash.withDisease": { en: "With Active Disease", sw: "Wenye Ugonjwa" },
  "dash.searchPlaceholder": {
    en: "Search by name, location, breed, or disease…",
    sw: "Tafuta kwa jina, eneo, aina au ugonjwa…",
  },
  "dash.empty": { en: "No farmers match", sw: "Hakuna mkulima aliyepatikana" },
  "dash.emptyHint": {
    en: "Try a different search or filter, or add a new farmer.",
    sw: "Jaribu utafutaji mwingine au ongeza mkulima mpya.",
  },
  "filter.All": { en: "All", sw: "Zote" },
  "filter.Critical": { en: "Critical", sw: "Dharura" },
  "filter.High": { en: "High", sw: "Juu" },
  "filter.Medium": { en: "Medium", sw: "Wastani" },
  "filter.Low": { en: "Low", sw: "Chini" },

  "card.view": { en: "View", sw: "Tazama" },
  "card.edit": { en: "Edit", sw: "Hariri" },
  "card.ai": { en: "AI Advice", sw: "Ushauri wa AI" },
  "card.delete": { en: "Delete", sw: "Futa" },
  "card.income": { en: "Income", sw: "Mapato" },
  "card.phone": { en: "Phone", sw: "Simu" },
  "card.cows": { en: "Cows", sw: "Ng'ombe" },
  "card.diseases": { en: "Diseases", sw: "Magonjwa" },
  "card.healthy": { en: "Healthy", sw: "Mzima" },
  "card.noLivestock": { en: "No livestock", sw: "Hakuna ng'ombe" },
  "card.milkProduction": { en: "Milk production", sw: "Uzalishaji wa maziwa" },
  "card.totalCows": { en: "Total cows", sw: "Idadi ya ng'ombe" },

  "profile.back": { en: "← Back to dashboard", sw: "← Rudi dashibodi" },
  "profile.annualIncome": { en: "Annual Income", sw: "Mapato ya Mwaka" },
  "profile.totalCows": { en: "Total cows", sw: "Idadi ya ng'ombe" },
  "profile.breedCount": { en: "Breeds", sw: "Aina" },
  "profile.milkProduction": { en: "Milk production", sw: "Uzalishaji wa maziwa" },
  "profile.activeDiseases": { en: "Active Diseases", sw: "Magonjwa Hai" },
  "profile.aiTitle": { en: "AI-Powered Recommendation", sw: "Mapendekezo ya AI" },
  "profile.aiSubtitle": {
    en: "Personalized, evidence-based advice.",
    sw: "Ushauri uliobinafsishwa, wa kisayansi.",
  },
  "profile.generate": { en: "Generate Recommendation", sw: "Tengeneza Pendekezo" },
  "profile.regenerate": { en: "Regenerate", sw: "Tengeneza tena" },
  "profile.analyzing": { en: "Analyzing…", sw: "Inachanganua…" },
  "profile.aiHint": {
    en: "Click Generate Recommendation to receive personalized advice.",
    sw: "Bofya Tengeneza Pendekezo kupata ushauri uliobinafsishwa.",
  },
  "profile.dangerZone": { en: "Danger zone", sw: "Eneo la Hatari" },
  "profile.dangerHint": {
    en: "Permanently delete this farmer and all related records.",
    sw: "Futa mkulima huyu kabisa pamoja na rekodi zake.",
  },
  "profile.deleteBtn": { en: "Delete Farmer", sw: "Futa Mkulima" },
  "profile.deleting": { en: "Deleting…", sw: "Inafuta…" },

  "symptom.title": { en: "Symptom-based Disease Identifier", sw: "Kitambulisho cha Ugonjwa kwa Dalili" },
  "symptom.subtitle": {
    en: "Describe what you observed — the system infers the likely disease.",
    sw: "Eleza ulichoona — mfumo unakisia ugonjwa unaowezekana.",
  },
  "symptom.placeholder": {
    en: "e.g. swollen udder, blood in milk, fever, loss of appetite…",
    sw: "mfano: kiwele kimevimba, damu kwenye maziwa, homa, kukosa hamu…",
  },
  "symptom.analyze": { en: "Identify Disease", sw: "Tambua Ugonjwa" },
  "symptom.match": { en: "Most likely", sw: "Inayowezekana zaidi" },
  "symptom.confidence": { en: "confidence", sw: "uhakika" },
  "symptom.alsoConsider": { en: "Also consider", sw: "Pia fikiria" },
  "symptom.addToProfile": { en: "Add to farmer profile", sw: "Ongeza kwenye wasifu" },
  "symptom.noMatch": {
    en: "No clear match. Try adding more specific symptoms.",
    sw: "Hakuna matokeo wazi. Ongeza dalili maalum zaidi.",
  },

  "complaint.title": { en: "Farmer Complaint & Advice", sw: "Malalamiko ya Mkulima & Ushauri" },
  "complaint.subtitle": {
    en: "Log a complaint (e.g. low milk, infertility, weight loss) and get instant guidance.",
    sw: "Ingiza lalamiko (mf. maziwa kidogo, ugumba) na pata ushauri papo hapo.",
  },
  "complaint.placeholder": {
    en: "e.g. The milk production is low this week…",
    sw: "mf. Uzalishaji wa maziwa ni mdogo wiki hii…",
  },
  "complaint.getAdvice": { en: "Get Advice", sw: "Pata Ushauri" },
  "complaint.category": { en: "Category", sw: "Kategoria" },

  "advice.title": { en: "Advice Log", sw: "Kumbukumbu ya Ushauri" },
  "advice.subtitle": {
    en: "Record every advice you give to this farmer.",
    sw: "Hifadhi kila ushauri unaompa mkulima huyu.",
  },
  "advice.topic": { en: "Topic", sw: "Mada" },
  "advice.note": { en: "Advice given", sw: "Ushauri uliotolewa" },
  "advice.save": { en: "Log advice", sw: "Hifadhi ushauri" },
  "advice.empty": { en: "No advice logged yet.", sw: "Hakuna ushauri uliohifadhiwa." },
  "advice.delete": { en: "Remove", sw: "Ondoa" },

  "priority.title": { en: "Adjust Criticality", sw: "Rekebisha Dharura" },
  "priority.subtitle": {
    en: "Override the score after a follow-up visit.",
    sw: "Badilisha alama baada ya ufuatiliaji.",
  },
  "priority.current": { en: "Current score", sw: "Alama ya sasa" },
  "priority.new": { en: "New score (0–100)", sw: "Alama mpya (0–100)" },
  "priority.reason": { en: "Reason for adjustment", sw: "Sababu ya mabadiliko" },
  "priority.save": { en: "Save override", sw: "Hifadhi mabadiliko" },
  "priority.reset": { en: "Reset to API value", sw: "Rudisha thamani ya API" },
  "priority.overridden": { en: "Adjusted by you", sw: "Imerekebishwa nawe" },

  "vet.title": { en: "Nearest Veterinary Clinics", sw: "Kliniki za Mifugo Karibu" },
  "vet.subtitle": {
    en: "Based on the farmer's location.",
    sw: "Kulingana na eneo la mkulima.",
  },
  "vet.noResults": {
    en: "No clinics indexed for this location. Showing all.",
    sw: "Hakuna kliniki kwa eneo hili. Onyesha zote.",
  },
  "vet.call": { en: "Call", sw: "Piga simu" },
  "vet.directions": { en: "Directions", sw: "Maelekezo" },
};

const I18nCtx = createContext<{
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: keyof typeof DICT | string) => string;
}>({ lang: "en", setLang: () => {}, t: (k) => String(k) });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("digicow.lang") as Lang | null;
    if (saved === "en" || saved === "sw") setLangState(saved);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") window.localStorage.setItem("digicow.lang", l);
  }, []);

  const t = useCallback(
    (key: string) => {
      const entry = (DICT as Dict)[key];
      if (!entry) return key;
      return entry[lang] ?? entry.en;
    },
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export function useT() {
  return useContext(I18nCtx);
}
