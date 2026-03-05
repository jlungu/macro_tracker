import { useEffect, useState } from "react";
import { useTargets, useUpdateTargets } from "@/hooks/useTargets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/useToast";
import type { Targets } from "@/lib/api";

const FIELDS: { key: keyof Targets; label: string; unit: string }[] = [
  { key: "calories", label: "Calories", unit: "kcal" },
  { key: "protein_g", label: "Protein", unit: "g" },
  { key: "carbs_g", label: "Carbs", unit: "g" },
  { key: "fat_g", label: "Fat", unit: "g" },
];

export default function SettingsPage() {
  const { data: targets, isLoading } = useTargets();
  const { mutate: saveTargets, isPending } = useUpdateTargets();

  const [form, setForm] = useState<Targets>({
    calories: 2000,
    protein_g: 150,
    carbs_g: 200,
    fat_g: 65,
  });

  useEffect(() => {
    if (targets) setForm(targets);
  }, [targets]);

  function handleChange(key: keyof Targets, value: string) {
    setForm((prev) => ({ ...prev, [key]: Number(value) }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    saveTargets(form, {
      onSuccess: () => toast({ title: "Targets saved!" }),
      onError: () => toast({ title: "Failed to save", variant: "destructive" }),
    });
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Set your daily macro targets</p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Daily Targets</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {FIELDS.map(({ key, label, unit }) => (
                <div key={key} className="flex items-center justify-between gap-4">
                  <label className="text-sm font-medium w-20">{label}</label>
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="number"
                      min={0}
                      value={form[key]}
                      onChange={(e) => handleChange(key, e.target.value)}
                      className="flex-1 bg-secondary rounded-lg px-3 py-2 text-base outline-none text-right"
                    />
                    <span className="text-sm text-muted-foreground w-8">{unit}</span>
                  </div>
                </div>
              ))}
              <Button type="submit" disabled={isPending} className="mt-2">
                {isPending ? "Saving…" : "Save"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
