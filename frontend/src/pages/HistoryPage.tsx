import { useState } from "react";
import { Search, Trash2 } from "lucide-react";
import { useFoods, useDeleteFood } from "@/hooks/useFoods";
import { useMealHistory, useDeleteMeal } from "@/hooks/useMeals";
import MealCard from "@/components/meals/MealCard";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/useToast";
import type { FoodItem } from "@/lib/api";

function FoodCard({ food, onDelete }: { food: FoodItem; onDelete: (id: string) => void }) {
  return (
    <div className="flex items-start justify-between gap-2 rounded-xl border border-border/60 bg-card px-4 py-3">
      <div className="flex flex-col gap-1 min-w-0">
        <p className="font-medium text-sm leading-tight truncate">{food.name}</p>
        <p className="text-xs text-muted-foreground">{food.serving_size}</p>
        <div className="flex gap-2 flex-wrap mt-0.5 text-xs text-muted-foreground">
          <span><span className="font-medium text-foreground">{Math.round(food.macros.calories)}</span> cal</span>
          <span><span className="font-medium text-foreground">{Math.round(food.macros.protein_g)}</span>g P</span>
          <span><span className="font-medium text-foreground">{Math.round(food.macros.carbs_g)}</span>g C</span>
          <span><span className="font-medium text-foreground">{Math.round(food.macros.fat_g)}</span>g F</span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        {food.use_count > 1 && (
          <span className="text-[10px] text-muted-foreground">×{food.use_count}</span>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(food.id!)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const [tab, setTab] = useState<"foods" | "meals">("foods");
  const [query, setQuery] = useState("");

  const { data: foods = [], isLoading: foodsLoading } = useFoods();
  const { data: meals = [], isLoading: mealsLoading } = useMealHistory(0);
  const { mutate: deleteFoodMutation } = useDeleteFood();
  const { mutate: deleteMealMutation } = useDeleteMeal();

  const q = query.toLowerCase();
  const filteredFoods = foods.filter(
    (f) => f.name.toLowerCase().includes(q) || f.serving_size.toLowerCase().includes(q)
  );
  const filteredMeals = meals.filter(
    (m) => m.description.toLowerCase().includes(q) || m.raw_input.toLowerCase().includes(q)
  );

  function handleDeleteFood(id: string) {
    deleteFoodMutation(id, {
      onSuccess: () => toast({ title: "Food removed" }),
      onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
    });
  }

  function handleDeleteMeal(id: string) {
    deleteMealMutation(id, {
      onSuccess: () => toast({ title: "Meal removed" }),
      onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
    });
  }

  const isLoading = tab === "foods" ? foodsLoading : mealsLoading;

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold">Library</h1>

      {/* Search */}
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

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {(["foods", "meals"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors capitalize ${
              tab === t
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex flex-col gap-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : tab === "foods" ? (
          filteredFoods.length ? (
            filteredFoods.map((food) => (
              <FoodCard key={food.id} food={food} onDelete={handleDeleteFood} />
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              {query ? "No foods match your search." : "No foods saved yet — log a meal to build your library."}
            </p>
          )
        ) : filteredMeals.length ? (
          filteredMeals.map((meal) => (
            <MealCard key={meal.id} meal={meal} onDelete={handleDeleteMeal} />
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            {query ? "No meals match your search." : "No meals logged yet."}
          </p>
        )}
      </div>
    </div>
  );
}
