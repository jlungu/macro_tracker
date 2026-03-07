import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import MacroBar from "./MacroBar";
import type { Meal } from "@/lib/api";

interface MealCardProps {
  meal: Meal;
  onDelete?: (id: string) => void;
}

export default function MealCard({ meal, onDelete }: MealCardProps) {
  const [open, setOpen] = useState(false);

  const time = new Date(meal.created_at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <>
      <Card
        className="overflow-hidden cursor-pointer active:opacity-80 transition-opacity"
        onClick={() => setOpen(true)}
      >
        <CardContent className="pt-3 pb-3">
          <div className="flex items-center gap-3">
            {/* Emoji badge */}
            <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center text-2xl shrink-0">
              {meal.emoji || "🍽️"}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm leading-snug truncate">{meal.description}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{time}</p>
              <div className="mt-2">
                <MacroBar macros={meal.macros} />
              </div>
            </div>

            {/* Delete */}
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm p-0 overflow-hidden">
          {meal.image_url ? (
            <img
              src={meal.image_url}
              alt={meal.description}
              className="w-full max-h-72 object-cover"
            />
          ) : (
            <div className="w-full h-40 bg-secondary flex items-center justify-center text-7xl">
              {meal.emoji || "🍽️"}
            </div>
          )}
          <div className="px-5 py-4">
            <DialogHeader>
              <DialogTitle className="text-base">{meal.description}</DialogTitle>
            </DialogHeader>
            <p className="text-xs text-muted-foreground mt-1 mb-3">{time}</p>
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
            {meal.notes && (
              <p className="text-xs text-muted-foreground leading-relaxed">{meal.notes}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
