import { useState } from "react";
import MealLogger from "@/components/meals/MealLogger";
import { Card, CardContent } from "@/components/ui/card";

export default function LogPage() {
  const [lastResponse, setLastResponse] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <h1 className="text-2xl font-bold">Log a Meal</h1>
        <p className="text-sm text-muted-foreground">
          Describe what you ate or snap a photo
        </p>
      </div>

      {lastResponse && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm leading-relaxed">{lastResponse}</p>
          </CardContent>
        </Card>
      )}

      <MealLogger onSuccess={setLastResponse} />
    </div>
  );
}
