import { useState } from "react";
import { Search, Trash2, PlusCircle, Minus, Plus } from "lucide-react";
import { useFoods, useDeleteFood } from "@/hooks/useFoods";
import { useQuickLogMeal } from "@/hooks/useMeals";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/useToast";
import type { FoodItem, Macros } from "@/lib/api";

function FoodDetailDialog({ food, onClose, onAdd, onDelete }: {
  food: FoodItem | null;
  onClose: () => void;
  onAdd: (food: FoodItem, qty: number) => void;
  onDelete: (id: string) => void;
}) {
  const [qty, setQty] = useState(1);

  function handleOpenChange(o: boolean) {
    if (!o) { setQty(1); onClose(); }
  }

  return (
    <Dialog open={!!food} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm p-0 overflow-hidden">
        {food && (
          <>
            <div className="w-full h-40 bg-secondary flex items-center justify-center text-7xl">
              {food.emoji}
            </div>
            <div className="px-5 py-4">
              <div className="flex items-start justify-between gap-2 mb-1">
                <DialogHeader className="flex-1 min-w-0">
                  <DialogTitle className="text-base">{food.name}</DialogTitle>
                </DialogHeader>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                {qty > 1 ? `${qty} × ${food.serving_size}` : food.serving_size}
              </p>

              <div className="grid grid-cols-4 gap-2 text-center mb-4">
                {[
                  { label: "Cal", value: Math.round(food.macros.calories * qty) },
                  { label: "Protein", value: `${Math.round(food.macros.protein_g * qty)}g` },
                  { label: "Carbs", value: `${Math.round(food.macros.carbs_g * qty)}g` },
                  { label: "Fat", value: `${Math.round(food.macros.fat_g * qty)}g` },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-secondary rounded-lg py-2">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-sm font-semibold">{value}</p>
                  </div>
                ))}
              </div>

              {food.use_count > 1 && (
                <p className="text-xs text-muted-foreground mb-3">Logged {food.use_count} times</p>
              )}

              <div className="flex gap-2 items-center">
                <div className="flex items-center gap-1 rounded-lg border border-border bg-secondary px-1 shrink-0">
                  <button
                    className="h-8 w-8 flex items-center justify-center text-muted-foreground disabled:opacity-30"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    disabled={qty <= 1}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-6 text-center text-sm font-semibold">{qty}</span>
                  <button
                    className="h-8 w-8 flex items-center justify-center text-muted-foreground"
                    onClick={() => setQty((q) => q + 1)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                <Button className="flex-1" onClick={() => { onAdd(food, qty); setQty(1); onClose(); }}>
                  <PlusCircle className="h-4 w-4 mr-2" /> Add to today
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="text-destructive hover:text-destructive border-destructive/30"
                  onClick={() => { onDelete(food.id!); onClose(); }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function FoodCard({ food, onSelect }: {
  food: FoodItem;
  onSelect: (food: FoodItem) => void;
}) {
  return (
    <button
      className="flex items-center gap-3 w-full rounded-xl border border-border/60 bg-card px-4 py-3 text-left"
      onClick={() => onSelect(food)}
    >
      <span className="text-2xl shrink-0">{food.emoji}</span>
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <p className="font-medium text-sm leading-tight truncate">{food.name}</p>
        <p className="text-xs text-muted-foreground">{food.serving_size}</p>
        <div className="flex gap-2 flex-wrap mt-0.5 text-xs text-muted-foreground">
          <span><span className="font-medium text-foreground">{Math.round(food.macros.calories)}</span> cal</span>
          <span><span className="font-medium text-foreground">{Math.round(food.macros.protein_g)}</span>g P</span>
          <span><span className="font-medium text-foreground">{Math.round(food.macros.carbs_g)}</span>g C</span>
          <span><span className="font-medium text-foreground">{Math.round(food.macros.fat_g)}</span>g F</span>
        </div>
      </div>
      {food.use_count > 1 && (
        <span className="text-[10px] text-muted-foreground shrink-0">×{food.use_count}</span>
      )}
    </button>
  );
}

export default function HistoryPage() {
  const [tab, setTab] = useState<"foods" | "meals">("foods");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<FoodItem | null>(null);

  const { data: allFoods = [], isLoading } = useFoods();
  const { mutate: deleteFoodMutation } = useDeleteFood();
  const { mutate: quickLogMealMutation } = useQuickLogMeal();

  const q = query.toLowerCase();
  const filteredFoods = allFoods.filter(
    (f) => f.is_food_item !== false && (f.name.toLowerCase().includes(q) || f.serving_size.toLowerCase().includes(q))
  );
  const filteredMeals = allFoods.filter(
    (f) => f.is_food_item === false && (f.name.toLowerCase().includes(q) || f.serving_size.toLowerCase().includes(q))
  );

  function handleDelete(id: string) {
    deleteFoodMutation(id, {
      onSuccess: () => toast({ title: "Removed from library" }),
      onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
    });
  }

  function handleAdd(food: FoodItem, qty: number) {
    const macros: Macros = qty === 1 ? food.macros : {
      calories: food.macros.calories * qty,
      protein_g: food.macros.protein_g * qty,
      carbs_g: food.macros.carbs_g * qty,
      fat_g: food.macros.fat_g * qty,
    };
    const description = qty > 1 ? `${qty}× ${food.name}` : food.name;
    quickLogMealMutation(
      { description, emoji: food.emoji, macros, meal_type: "snack", image_url: null },
      {
        onSuccess: () => toast({ title: `${description} added to today` }),
        onError: () => toast({ title: "Failed to add", variant: "destructive" }),
      }
    );
  }

  const items = tab === "foods" ? filteredFoods : filteredMeals;

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold">Library</h1>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="search"
          placeholder="Search…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </div>

      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {(["foods", "meals"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors capitalize ${
              tab === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : items.length ? (
          items.map((food) => (
            <FoodCard key={food.id} food={food} onSelect={setSelected} />
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            {query
              ? `No ${tab} match your search.`
              : tab === "foods"
              ? "No foods saved yet — log something to build your library."
              : "No meals saved yet — log a composed meal to see it here."}
          </p>
        )}
      </div>

      <FoodDetailDialog
        food={selected}
        onClose={() => setSelected(null)}
        onAdd={handleAdd}
        onDelete={handleDelete}
      />
    </div>
  );
}
