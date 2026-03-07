import { useDailySummary, useDeleteMeal } from "@/hooks/useMeals";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import MacroRings from "@/components/meals/MacroRings";
import MealCard from "@/components/meals/MealCard";
import { toast } from "@/hooks/useToast";
import { useTargets } from "@/hooks/useTargets";

export default function DashboardPage() {
  const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in local timezone
  const { data, isLoading } = useDailySummary(today);
  const { data: targets } = useTargets();
  const { mutate: deleteMeal } = useDeleteMeal();

  const displayDate = new Date().toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  function handleDelete(id: string) {
    deleteMeal(id, {
      onSuccess: () => toast({ title: "Meal removed" }),
      onError: () =>
        toast({ title: "Failed to delete", variant: "destructive" }),
    });
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <h1 className="text-2xl font-bold">Today</h1>
        <p className="text-sm text-muted-foreground">{displayDate}</p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Daily Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : data ? (
            <MacroRings macros={data.totals} targets={targets} />
          ) : (
            <p className="text-sm text-muted-foreground">No meals logged yet.</p>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Meals
        </h2>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : data?.meals.length ? (
          data.meals.map((meal) => (
            <MealCard key={meal.id} meal={meal} onDelete={handleDelete} />
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            No meals yet — tap Log to add one.
          </p>
        )}
      </div>
    </div>
  );
}
