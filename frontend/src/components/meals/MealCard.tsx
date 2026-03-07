import { useState } from "react";
import { Trash2, Pencil, Check, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import MacroBar from "./MacroBar";
import { useUpdateMeal } from "@/hooks/useMeals";
import { toast } from "@/hooks/useToast";
import type { Meal } from "@/lib/api";

interface MealCardProps {
  meal: Meal;
  onDelete?: (id: string) => void;
}

interface EditState {
  description: string;
  calories: string;
  protein_g: string;
  carbs_g: string;
  fat_g: string;
}

function MacroInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="bg-secondary rounded-lg py-2 px-1 flex flex-col items-center gap-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full text-center text-sm font-semibold bg-transparent border-b border-border/60 focus:border-primary outline-none pb-0.5"
        min={0}
      />
    </div>
  );
}

export default function MealCard({ meal, onDelete }: MealCardProps) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [edit, setEdit] = useState<EditState>({
    description: meal.description,
    calories: String(Math.round(meal.macros.calories)),
    protein_g: String(Math.round(meal.macros.protein_g)),
    carbs_g: String(Math.round(meal.macros.carbs_g)),
    fat_g: String(Math.round(meal.macros.fat_g)),
  });

  const { mutate: updateMeal, isPending: isSaving } = useUpdateMeal();

  const time = new Date(meal.created_at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  function startEdit() {
    setEdit({
      description: meal.description,
      calories: String(Math.round(meal.macros.calories)),
      protein_g: String(Math.round(meal.macros.protein_g)),
      carbs_g: String(Math.round(meal.macros.carbs_g)),
      fat_g: String(Math.round(meal.macros.fat_g)),
    });
    setEditing(true);
  }

  function saveEdit() {
    updateMeal(
      {
        id: meal.id,
        patch: {
          description: edit.description.trim() || meal.description,
          macros: {
            calories: Number(edit.calories) || 0,
            protein_g: Number(edit.protein_g) || 0,
            carbs_g: Number(edit.carbs_g) || 0,
            fat_g: Number(edit.fat_g) || 0,
          },
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Meal updated" });
          setEditing(false);
          setOpen(false);
        },
        onError: () => toast({ title: "Failed to update", variant: "destructive" }),
      }
    );
  }

  return (
    <>
      <Card
        className="overflow-hidden cursor-pointer active:opacity-80 transition-opacity"
        onClick={() => setOpen(true)}
      >
        <CardContent className="pt-3 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center text-2xl shrink-0">
              {meal.emoji || "🍽️"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm leading-snug truncate">{meal.description}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{time}</p>
              <div className="mt-2">
                <MacroBar macros={meal.macros} />
              </div>
            </div>
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(meal.id);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(false); }}>
        <DialogContent className="max-w-sm p-0 overflow-hidden">
          {meal.image_url ? (
            <img src={meal.image_url} alt={meal.description} className="w-full max-h-72 object-cover" />
          ) : (
            <div className="w-full h-40 bg-secondary flex items-center justify-center text-7xl">
              {meal.emoji || "🍽️"}
            </div>
          )}
          <div className="px-5 py-4">
            <div className="flex items-start justify-between gap-2">
              <DialogHeader className="flex-1 min-w-0">
                {editing ? (
                  <input
                    value={edit.description}
                    onChange={(e) => setEdit((s) => ({ ...s, description: e.target.value }))}
                    className="text-base font-semibold w-full bg-transparent border-b border-border focus:border-primary outline-none pb-0.5"
                  />
                ) : (
                  <DialogTitle className="text-base">{meal.description}</DialogTitle>
                )}
              </DialogHeader>
              {!editing ? (
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 mt-0.5" onClick={startEdit}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <div className="flex gap-1 shrink-0 mt-0.5">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(false)} disabled={isSaving}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={saveEdit} disabled={isSaving}>
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground mt-1 mb-3">{time}</p>

            {editing ? (
              <div className="grid grid-cols-4 gap-2 text-center mb-4">
                <MacroInput label="Cal" value={edit.calories} onChange={(v) => setEdit((s) => ({ ...s, calories: v }))} />
                <MacroInput label="Protein" value={edit.protein_g} onChange={(v) => setEdit((s) => ({ ...s, protein_g: v }))} />
                <MacroInput label="Carbs" value={edit.carbs_g} onChange={(v) => setEdit((s) => ({ ...s, carbs_g: v }))} />
                <MacroInput label="Fat" value={edit.fat_g} onChange={(v) => setEdit((s) => ({ ...s, fat_g: v }))} />
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2 text-center mb-4">
                {[
                  { label: "Cal", value: Math.round(meal.macros.calories) },
                  { label: "Protein", value: `${Math.round(meal.macros.protein_g)}g` },
                  { label: "Carbs", value: `${Math.round(meal.macros.carbs_g)}g` },
                  { label: "Fat", value: `${Math.round(meal.macros.fat_g)}g` },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-secondary rounded-lg py-2">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-sm font-semibold">{value}</p>
                  </div>
                ))}
              </div>
            )}

            {meal.notes && !editing && (
              <p className="text-xs text-muted-foreground leading-relaxed">{meal.notes}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
