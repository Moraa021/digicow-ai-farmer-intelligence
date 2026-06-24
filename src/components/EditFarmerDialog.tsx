import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { SOIL_TYPES, type Farmer } from "@/lib/types";

export function EditFarmerDialog({
  farmer,
  open,
  onClose,
}: {
  farmer: Farmer | null;
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [income, setIncome] = useState("");
  const [soil, setSoil] = useState("");
  const [cows, setCows] = useState("");
  const [diseases, setDiseases] = useState("");

  useEffect(() => {
    if (farmer && open) {
      setName(farmer.name);
      setLocation(farmer.location || "");
      setPhone(farmer.phone || "");
      setIncome(String(farmer.income ?? ""));
      setSoil(farmer.soil || "");
      setCows((farmer.cows || []).join(", "));
      setDiseases((farmer.diseases || []).join(", "));
    }
  }, [farmer, open]);

  const m = useMutation({
    mutationFn: api.updateFarmer,
    onSuccess: () => {
      toast.success("✅ Farmer updated!");
      qc.invalidateQueries({ queryKey: ["farmers"] });
      qc.invalidateQueries({ queryKey: ["farmer", name] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message || "Update failed"),
  });

  if (!open || !farmer) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    m.mutate({
      name: name.trim(),
      location: location.trim(),
      phone: phone.trim(),
      income: income ? Number(income) : 0,
      soil: soil.trim(),
      cows: cows.split(",").map((s) => s.trim()).filter(Boolean),
      diseases: diseases.split(",").map((s) => s.trim()).filter(Boolean),
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="card-surface w-full max-w-lg max-h-[90vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">
              Edit <span className="brand-text">{farmer.name}</span>
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Update farmer profile and resave to DigiCow AI.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border bg-background px-2 py-1 text-sm hover:bg-secondary"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <EditField label="Name" required>
            <input
              className="edit-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </EditField>
          <div className="grid gap-4 sm:grid-cols-2">
            <EditField label="Location">
              <input
                className="edit-input"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </EditField>
            <EditField label="Phone">
              <input
                className="edit-input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </EditField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <EditField label="Income (KES)">
              <input
                type="number"
                min={0}
                className="edit-input"
                value={income}
                onChange={(e) => setIncome(e.target.value)}
              />
            </EditField>
            <EditField label="Soil Type">
              <select
                className="edit-input"
                value={soil}
                onChange={(e) => setSoil(e.target.value)}
              >
                <option value="">Select…</option>
                {SOIL_TYPES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </EditField>
          </div>
          <EditField label="Cows (comma-separated)">
            <input
              className="edit-input"
              value={cows}
              onChange={(e) => setCows(e.target.value)}
              placeholder="Friesian, Ayrshire"
            />
          </EditField>
          <EditField label="Diseases (comma-separated)">
            <input
              className="edit-input"
              value={diseases}
              onChange={(e) => setDiseases(e.target.value)}
              placeholder="Mastitis, ECF"
            />
          </EditField>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={m.isPending}
              className="rounded-lg brand-gradient px-5 py-2 text-sm font-semibold text-primary-foreground shadow-brand transition hover:scale-[1.02] disabled:opacity-60"
            >
              {m.isPending ? "Saving…" : "💾 Save changes"}
            </button>
          </div>
        </form>

        <style>{`
          .edit-input {
            width: 100%;
            border-radius: 0.5rem;
            border: 1px solid var(--color-border);
            background: var(--color-background);
            padding: 0.55rem 0.75rem;
            font-size: 0.875rem;
            outline: none;
            transition: border-color .15s, box-shadow .15s;
          }
          .edit-input:focus {
            border-color: var(--color-ring);
            box-shadow: 0 0 0 3px color-mix(in oklab, var(--color-ring) 30%, transparent);
          }
        `}</style>
      </div>
    </div>
  );
}

function EditField({
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
