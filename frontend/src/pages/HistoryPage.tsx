import { useState } from "react";
import { useMealHistory, useDeleteMeal } from "@/hooks/useMeals";
import MealCard from "@/components/meals/MealCard";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/useToast";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function HistoryPage() {
  const [page, setPage] = useState(0);
  const { data: meals, isLoading } = useMealHistory(page);
  const { mutate: deleteMeal } = useDeleteMeal();

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
        <h1 className="text-2xl font-bold">History</h1>
        <p className="text-sm text-muted-foreground">All logged meals</p>
      </div>

      <div className="flex flex-col gap-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : meals?.length ? (
          meals.map((meal) => (
            <MealCard key={meal.id} meal={meal} onDelete={handleDelete} />
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No meals found.</p>
        )}
      </div>

      <div className="flex items-center justify-between pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Newer
        </Button>
        <span className="text-sm text-muted-foreground">Page {page + 1}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((p) => p + 1)}
          disabled={!meals?.length || meals.length < 20}
        >
          Older <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
