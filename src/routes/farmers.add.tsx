import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type KeyboardEvent } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { api } from "@/lib/api";

export const Route = createFileRoute("/farmers/add")({
  head: () => ({
    meta: [
      { title: "Add Farmer · DigiCow AI" },
      {
        name: "description",
        content: "Register a new smallholder dairy farmer in DigiCow AI.",
      },
    ],
  }),
  component: AddFarmer,
});

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  location: z.string().trim().max(80).optional(),
  phone: z
    .string()
    .trim()
    .max(20)
    .regex(/^[0-9+\s-]*$/, "Invalid phone")
    .optional(),
  income: z.number().min(0).max(100_000_000).optional(),
});

function AddFarmer() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [income, setIncome] = useState<string>("");
  const [cows, setCows] = useState<string[]>([]);
  const [cowInput, setCowInput] = useState("");
  const [diseasesInput, setDiseasesInput] = useState("");
  const [diseases, setDiseases] = useState<string[]>([]);
  const [milkProduction, setMilkProduction] = useState<string>("");

  const m = useMutation({
    mutationFn: api.addFarmer,
    onSuccess: (farmer) => {
      toast.success(`Farmer ${farmer?.name ?? name} added`);
      qc.invalidateQueries({ queryKey: ["farmers"] });
      navigate({
        to: "/farmers/$name",
        params: { name: farmer?.name ?? name },
      });
    },
    onError: (e: Error) => toast.error(e.message || "Could not add farmer"),
  });

  const addCow = () => {
    const v = cowInput.trim();
    if (!v) return;
    if (!cows.includes(v)) setCows([...cows, v]);
    setCowInput("");
  };

  const addDisease = () => {
    const v = diseasesInput.trim();
    if (!v) return;
    if (!diseases.includes(v)) setDiseases([...diseases, v]);
    setDiseasesInput("");
  };

  const removeDisease = (c: string) => setDiseases(diseases.filter((x) => x !== c));

  const removeCow = (c: string) => setCows(cows.filter((x) => x !== c));

  const onCowKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addCow();
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({
      name,
      location,
      phone,
      income: income ? Number(income) : undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    const finalCows = cowInput.trim()
      ? Array.from(new Set([...cows, cowInput.trim()]))
      : cows;
    const finalDiseases = diseasesInput.trim()
      ? Array.from(new Set([...diseases, diseasesInput.trim()]))
      : diseases;

    m.mutate({
      name: parsed.data.name,
      location: parsed.data.location,
      phone: parsed.data.phone,
      income: parsed.data.income ?? 0,
      cows: finalCows,
      diseases: finalDiseases,
      milk_production: milkProduction ? Number(milkProduction) : 0,
    });
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        to="/"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to dashboard
      </Link>
      <h1 className="mt-3 text-3xl font-bold">
        Add a <span className="brand-text">farmer</span>
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Only the farmer's name is required. You can enrich the profile later.
      </p>

      <form onSubmit={submit} className="card-surface mt-6 space-y-5 p-6">
        <Field label="Farmer Name" required>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., John Kamau"
            className="input"
            maxLength={80}
            required
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Location">
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Uasin Gishu"
              className="input"
              maxLength={80}
            />
          </Field>
          <Field label="Phone">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g., 0712345678"
              className="input"
              maxLength={20}
            />
          </Field>
        </div>

        <Field label="Annual Income (KES)">
          <input
            type="number"
            min={0}
            value={income}
            onChange={(e) => setIncome(e.target.value)}
            placeholder="e.g., 45000"
            className="input"
          />
        </Field>

        <Field label="Cow Breeds">
          <div className="rounded-lg border border-border bg-background p-2">
            {cows.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {cows.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground"
                  >
                    🐮 {c}
                    <button
                      type="button"
                      onClick={() => removeCow(c)}
                      className="rounded-full text-muted-foreground hover:text-destructive"
                      aria-label={`Remove ${c}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                value={cowInput}
                onChange={(e) => setCowInput(e.target.value)}
                onKeyDown={onCowKey}
                placeholder="Type a breed and press Enter (e.g., Friesian)"
                className="w-full bg-transparent px-2 py-1.5 text-sm outline-none"
              />
              <button
                type="button"
                onClick={addCow}
                className="rounded-md bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-accent"
              >
                Add
              </button>
            </div>
          </div>
        </Field>

        <Field label="Diseases">
          <div className="rounded-lg border border-border bg-background p-2">
            {diseases.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {diseases.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground"
                  >
                    {c}
                    <button
                      type="button"
                      onClick={() => removeDisease(c)}
                      className="rounded-full text-muted-foreground hover:text-destructive"
                      aria-label={`Remove ${c}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                value={diseasesInput}
                onChange={(e) => setDiseasesInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addDisease(); }
                }}
                placeholder="Type a disease and press Enter (e.g., Mastitis)"
                className="w-full bg-transparent px-2 py-1.5 text-sm outline-none"
              />
              <button
                type="button"
                onClick={addDisease}
                className="rounded-md bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-accent"
              >
                Add
              </button>
            </div>
          </div>
        </Field>

        <Field label="Milk Production (litres/day)">
          <input
            type="number"
            min={0}
            value={milkProduction}
            onChange={(e) => setMilkProduction(e.target.value)}
            placeholder="e.g., 12"
            className="input"
          />
        </Field>

        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <Link
            to="/"
            className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-secondary"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={m.isPending}
            className="rounded-lg brand-gradient px-5 py-2 text-sm font-semibold text-primary-foreground shadow-brand transition hover:scale-[1.02] disabled:opacity-60"
          >
            {m.isPending ? "Adding…" : "＋ Add Farmer"}
          </button>
        </div>
      </form>

      <style>{`
        .input {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid var(--color-border);
          background: var(--color-background);
          padding: 0.55rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
          transition: border-color .15s, box-shadow .15s;
        }
        .input:focus {
          border-color: var(--color-ring);
          box-shadow: 0 0 0 3px color-mix(in oklab, var(--color-ring) 30%, transparent);
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </span>
      {children}
    </label>
  );
}
