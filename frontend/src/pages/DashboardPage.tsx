import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useDailySummary, useDeleteMeal } from "@/hooks/useMeals";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import MacroRings from "@/components/meals/MacroRings";
import MealCard from "@/components/meals/MealCard";
import { toast } from "@/hooks/useToast";
import { useTargets } from "@/hooks/useTargets";

function offsetDate(base: string, days: number): string {
  const d = new Date(base + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-CA");
}

export default function DashboardPage() {
  const today = new Date().toLocaleDateString("en-CA");
  const [selectedDate, setSelectedDate] = useState(today);
  const { data, isLoading } = useDailySummary(selectedDate);
  const { data: targets } = useTargets();
  const { mutate: deleteMeal } = useDeleteMeal();

  const isToday = selectedDate === today;

  const displayDate = new Date(selectedDate + "T00:00:00").toLocaleDateString([], {
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
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => setSelectedDate((d) => offsetDate(d, -1))}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 text-center">
          <h1 className="text-2xl font-bold">{isToday ? "Today" : displayDate}</h1>
          {!isToday && (
            <p className="text-xs text-muted-foreground">{selectedDate}</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => setSelectedDate((d) => offsetDate(d, 1))}
          disabled={isToday}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
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
            <p className="text-sm text-muted-foreground">
              {isToday ? "No meals logged yet." : "No meals logged this day."}
            </p>
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
