// Local knowledge base for symptom matching, complaints advice, and vet directory.
// Keeps the front-end useful even when the backend lacks specialised endpoints.

export interface DiseaseProfile {
  name: string;
  symptoms: string[];
  treatment: string;
  prevention: string;
}

export const DISEASES: DiseaseProfile[] = [
  {
    name: "Mastitis",
    symptoms: [
      "swollen udder",
      "udder",
      "hot udder",
      "blood in milk",
      "clots in milk",
      "watery milk",
      "yellow milk",
      "painful udder",
      "reduced milk",
    ],
    treatment:
      "Strip the affected quarter, administer intramammary antibiotics (e.g. cloxacillin) for 3–5 days, NSAIDs for pain.",
    prevention:
      "Pre/post-dip teats, dry-cow therapy, clean bedding, and proper milking hygiene.",
  },
  {
    name: "East Coast Fever",
    symptoms: [
      "high fever",
      "fever",
      "swollen lymph",
      "swollen glands",
      "tick",
      "ticks",
      "coughing",
      "labored breathing",
      "loss of appetite",
      "weakness",
    ],
    treatment:
      "Buparvaquone injection early in the course; supportive fluids and anti-inflammatories.",
    prevention:
      "Weekly tick control (acaricide spray/dip), ITM vaccination of calves, fencing from infested pastures.",
  },
  {
    name: "Foot-and-Mouth Disease",
    symptoms: [
      "blisters",
      "mouth blisters",
      "drooling",
      "lameness",
      "limping",
      "vesicles",
      "smacking lips",
      "hoof sores",
    ],
    treatment:
      "Notifiable — report to the county vet office. Supportive care, soft feed, antiseptic foot baths.",
    prevention:
      "Biannual FMD vaccination, movement control, disinfect visitors and vehicles.",
  },
  {
    name: "Lumpy Skin Disease",
    symptoms: [
      "skin nodules",
      "nodules",
      "skin lumps",
      "lumps on skin",
      "fever",
      "nasal discharge",
      "swollen legs",
    ],
    treatment:
      "Supportive care, antibiotics for secondary infection, fly control.",
    prevention: "Annual LSD vaccination, vector (fly/mosquito) control.",
  },
  {
    name: "Brucellosis",
    symptoms: [
      "abortion",
      "miscarriage",
      "retained placenta",
      "infertility",
      "swollen joints",
      "weak calf",
    ],
    treatment:
      "No cure — cull positive animals; zoonotic. Test herd and isolate reactors.",
    prevention:
      "S19 vaccination of heifers (4–8 months), buy only tested replacements, pasteurise milk.",
  },
  {
    name: "Anaplasmosis",
    symptoms: [
      "pale gums",
      "anaemia",
      "anemia",
      "weakness",
      "yellow eyes",
      "jaundice",
      "weight loss",
      "tick",
    ],
    treatment: "Long-acting oxytetracycline, supportive iron, transfusion in severe cases.",
    prevention: "Tick control, screen incoming cattle, separate sick animals.",
  },
  {
    name: "Milk Fever",
    symptoms: [
      "down cow",
      "cannot stand",
      "cold ears",
      "muscle tremor",
      "tremor",
      "recently calved",
      "after calving",
    ],
    treatment: "IV calcium borogluconate slowly under veterinary supervision.",
    prevention:
      "Low-calcium dry-cow ration, anionic salts pre-calving, vitamin D3 boost.",
  },
  {
    name: "Ketosis",
    symptoms: [
      "weight loss",
      "drop in milk",
      "sweet breath",
      "acetone breath",
      "dull",
      "loss of appetite",
      "early lactation",
    ],
    treatment:
      "Oral propylene glycol 300 ml twice daily for 3 days, dextrose IV in severe cases.",
    prevention:
      "Body-condition score 3.0–3.5 at calving, gradual concentrate increase, monitor early lactation.",
  },
  {
    name: "Pneumonia",
    symptoms: [
      "coughing",
      "nasal discharge",
      "labored breathing",
      "fever",
      "calf cough",
      "rapid breathing",
    ],
    treatment: "Broad-spectrum antibiotic (e.g. florfenicol) + NSAID; isolate calf.",
    prevention: "Ventilated housing, dry bedding, colostrum at birth, vaccinate IBR/BRSV.",
  },
  {
    name: "Internal Parasites (Worms)",
    symptoms: [
      "diarrhea",
      "diarrhoea",
      "weight loss",
      "rough coat",
      "bottle jaw",
      "pot belly",
      "poor growth",
    ],
    treatment: "Broad-spectrum dewormer (albendazole/ivermectin) per weight.",
    prevention: "Quarterly deworming, pasture rotation, FEC monitoring.",
  },
];

export interface DiseaseMatch {
  name: string;
  score: number; // 0..1
  treatment: string;
  prevention: string;
  matched: string[];
}

export function matchDiseases(input: string): DiseaseMatch[] {
  const text = input.toLowerCase();
  if (!text.trim()) return [];
  const results: DiseaseMatch[] = DISEASES.map((d) => {
    const matched = d.symptoms.filter((s) => text.includes(s));
    const score = matched.length / Math.min(d.symptoms.length, 5);
    return {
      name: d.name,
      treatment: d.treatment,
      prevention: d.prevention,
      matched,
      score: Math.min(1, score),
    };
  })
    .filter((r) => r.matched.length > 0)
    .sort((a, b) => b.score - a.score);
  return results.slice(0, 4);
}

// ---------- Complaint Advisor ----------
export interface ComplaintAdvice {
  category: string;
  advice: string;
}

const COMPLAINT_RULES: Array<{ keywords: string[]; advice: ComplaintAdvice }> = [
  {
    keywords: ["milk", "production", "low milk", "yield", "less milk"],
    advice: {
      category: "Low milk production",
      advice:
        "Check feed quality and quantity (Napier + dairy meal at 1 kg per 1.5 L milk). Provide 60–80 L clean water/day. Rule out subclinical mastitis with CMT. Confirm 2× daily milking, balance Ca/P minerals, deworm if overdue, and reduce heat stress with shade.",
    },
  },
  {
    keywords: ["breed", "cross", "crossbreed", "ai ", "artificial insemination", "semen"],
    advice: {
      category: "Cross-breeding",
      advice:
        "For zebu base cows, target 50% exotic blood with Sahiwal or Ayrshire AI for hardiness; push to 75% Friesian only where feed and water are reliable. Maintain calving interval 12–13 months, body condition 3.0 at AI, and record sire IDs to avoid inbreeding.",
    },
  },
  {
    keywords: ["heat", "estrus", "oestrus", "not on heat", "silent heat"],
    advice: {
      category: "Heat detection / fertility",
      advice:
        "Observe 3× daily for 20 min (mounting, mucus, restlessness). Use a teaser/CIDR programme for silent heats. Check body condition (>2.75) and minerals (P, Cu, Se). AI 12 h after standing heat.",
    },
  },
  {
    keywords: ["infertile", "infertility", "not conceiving", "repeat breeder"],
    advice: {
      category: "Infertility",
      advice:
        "Screen for brucellosis and trichomoniasis. Check uterine health (PGF2α if cystic). Improve energy and protein 30 days pre-AI. Avoid AI before 60 days post-calving.",
    },
  },
  {
    keywords: ["feed", "fodder", "napier", "silage", "hay"],
    advice: {
      category: "Feeding",
      advice:
        "Conserve Napier as silage at 1.2 m height. Supplement with 2 kg dairy meal at milking + mineral lick. Ensure 10% body weight in green forage daily and constant clean water.",
    },
  },
  {
    keywords: ["weight loss", "thin", "losing weight", "emaciated"],
    advice: {
      category: "Weight loss",
      advice:
        "Deworm and check for liver fluke. Raise energy density (dairy meal, molasses). Rule out chronic mastitis, ketosis, and Johne's disease.",
    },
  },
  {
    keywords: ["calf", "calves", "scour", "diarr"],
    advice: {
      category: "Calf health",
      advice:
        "Give 4 L colostrum within 6 h of birth. For scours, rehydrate with ORS every 2 h, withhold milk only 12 h, restart half-strength milk. Keep pen dry and disinfected.",
    },
  },
  {
    keywords: ["tick", "ticks", "ectoparasite"],
    advice: {
      category: "Tick control",
      advice:
        "Spray with amitraz or deltamethrin every 7 days. Rotate active ingredient every 2 years to prevent resistance. Combine with pasture spelling.",
    },
  },
];

export function adviseComplaint(text: string): ComplaintAdvice | null {
  const t = text.toLowerCase();
  if (!t.trim()) return null;
  for (const rule of COMPLAINT_RULES) {
    if (rule.keywords.some((k) => t.includes(k))) return rule.advice;
  }
  return {
    category: "General",
    advice:
      "Capture more details (animal age, lactation stage, recent changes, body condition). Then re-run the advisor or generate an AI recommendation for the farmer profile.",
  };
}

// ---------- Vet clinic directory ----------
export interface VetClinic {
  name: string;
  county: string;
  town: string;
  phone: string;
}

export const VET_CLINICS: VetClinic[] = [
  { name: "Uasin Gishu County Vet Office", county: "Uasin Gishu", town: "Eldoret", phone: "+254 53 203 3000" },
  { name: "Eldoret Animal Health Centre", county: "Uasin Gishu", town: "Eldoret", phone: "+254 722 412 800" },
  { name: "Kisumu Veterinary Clinic", county: "Kisumu", town: "Kisumu", phone: "+254 720 654 321" },
  { name: "Maseno Livestock Services", county: "Kisumu", town: "Maseno", phone: "+254 712 998 110" },
  { name: "Nyeri Dairy Vet Hub", county: "Nyeri", town: "Nyeri", phone: "+254 733 220 110" },
  { name: "Othaya Animal Clinic", county: "Nyeri", town: "Othaya", phone: "+254 711 445 678" },
  { name: "Meru Highlands Vet Services", county: "Meru", town: "Meru", phone: "+254 729 884 552" },
  { name: "Kiambu County Vet Lab", county: "Kiambu", town: "Kiambu", phone: "+254 20 207 3300" },
  { name: "Limuru Dairy Clinic", county: "Kiambu", town: "Limuru", phone: "+254 722 113 998" },
  { name: "Nakuru Livestock Clinic", county: "Nakuru", town: "Nakuru", phone: "+254 51 221 5000" },
  { name: "Naivasha Animal Health", county: "Nakuru", town: "Naivasha", phone: "+254 717 660 110" },
  { name: "Bomet Dairy Vet Office", county: "Bomet", town: "Bomet", phone: "+254 728 332 110" },
  { name: "Kericho Tea-Belt Vet Clinic", county: "Kericho", town: "Kericho", phone: "+254 705 661 220" },
  { name: "Kakamega Western Vet Hub", county: "Kakamega", town: "Kakamega", phone: "+254 733 776 110" },
  { name: "Bungoma County Vet Office", county: "Bungoma", town: "Bungoma", phone: "+254 711 220 998" },
  { name: "Machakos Dairy Vet Clinic", county: "Machakos", town: "Machakos", phone: "+254 720 887 663" },
  { name: "Kitui Livestock Office", county: "Kitui", town: "Kitui", phone: "+254 729 110 220" },
  { name: "Nyandarua Highland Vet", county: "Nyandarua", town: "Ol Kalou", phone: "+254 714 558 220" },
  { name: "Embu County Vet Services", county: "Embu", town: "Embu", phone: "+254 723 990 110" },
  { name: "Trans Nzoia Dairy Clinic", county: "Trans Nzoia", town: "Kitale", phone: "+254 715 332 776" },
];

export function findClinics(location: string): VetClinic[] {
  const loc = (location || "").toLowerCase().trim();
  if (!loc) return VET_CLINICS.slice(0, 6);
  const matches = VET_CLINICS.filter(
    (c) =>
      c.county.toLowerCase().includes(loc) ||
      c.town.toLowerCase().includes(loc) ||
      loc.includes(c.county.toLowerCase()) ||
      loc.includes(c.town.toLowerCase()),
  );
  return matches.length ? matches : [];
}
