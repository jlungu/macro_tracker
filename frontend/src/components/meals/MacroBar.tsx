import { cn } from "@/lib/utils";
import type { Macros } from "@/lib/api";

interface MacroBarProps {
  macros: Macros;
  goal?: Macros;
  className?: string;
}

function MacroStat({
  label,
  value,
  goal,
  unit,
  color,
}: {
  label: string;
  value: number;
  goal?: number;
  unit: string;
  color: string;
}) {
  const pct = goal ? Math.min((value / goal) * 100, 100) : null;
  return (
    <div className="flex flex-col gap-1 flex-1">
      <div className="flex justify-between items-baseline">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-sm font-semibold">
          {Math.round(value)}
          <span className="text-xs font-normal text-muted-foreground ml-0.5">{unit}</span>
        </span>
      </div>
      {pct !== null && (
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", color)}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

export default function MacroBar({ macros, goal, className }: MacroBarProps) {
  return (
    <div className={cn("flex gap-4", className)}>
      <MacroStat
        label="Calories"
        value={macros.calories}
        goal={goal?.calories}
        unit="kcal"
        color="bg-yellow-400"
      />
      <MacroStat
        label="Protein"
        value={macros.protein_g}
        goal={goal?.protein_g}
        unit="g"
        color="bg-blue-400"
      />
      <MacroStat
        label="Carbs"
        value={macros.carbs_g}
        goal={goal?.carbs_g}
        unit="g"
        color="bg-green-400"
      />
      <MacroStat
        label="Fat"
        value={macros.fat_g}
        goal={goal?.fat_g}
        unit="g"
        color="bg-orange-400"
      />
    </div>
  );
}
