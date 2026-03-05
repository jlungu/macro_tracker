import { Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import MacroBar from "./MacroBar";
import type { Meal } from "@/lib/api";

interface MealCardProps {
  meal: Meal;
  onDelete?: (id: string) => void;
}

export default function MealCard({ meal, onDelete }: MealCardProps) {
  const time = new Date(meal.created_at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Card className="overflow-hidden">
      {meal.image_url && (
        <img
          src={meal.image_url}
          alt={meal.description}
          className="w-full h-40 object-cover"
        />
      )}
      <CardContent className="pt-3 pb-3">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <p className="font-medium text-sm leading-snug">{meal.description}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{time}</p>
          </div>
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(meal.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
        <MacroBar macros={meal.macros} />
      </CardContent>
    </Card>
  );
}
