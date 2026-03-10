import { cn } from "@/lib/utils";
import type { Macros } from "@/lib/api";

interface MacroBarProps {
  macros: Macros;
  goal?: Macros;
  className?: string;
  compact?: boolean;
}

function MacroStat({
  label,
  value,
  goal,
  unit,
  color,
  compact,
}: {
  label: string;
  value: number;
  goal?: number;
  unit: string;
  color: string;
  compact?: boolean;
}) {
  const pct = goal ? Math.min((value / goal) * 100, 100) : null;

  if (compact) {
    return (
      <div className="flex items-baseline gap-1 shrink-0">
        {label && <span className="text-xs text-muted-foreground">{label}</span>}
        <span className="text-sm font-semibold">
          {Math.round(value)}
          <span className="text-xs font-normal text-muted-foreground ml-0.5">{unit}</span>
        </span>
      </div>
    );
  }

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

export default function MacroBar({ macros, goal, className, compact }: MacroBarProps) {
  return (
    <div className={cn("flex", compact ? "gap-3" : "gap-4", className)}>
      <MacroStat
        label={compact ? "" : "Calories"}
        value={macros.calories}
        goal={goal?.calories}
        unit="kcal"
        color="bg-yellow-400"
        compact={compact}
      />
      <MacroStat
        label={compact ? "P" : "Protein"}
        value={macros.protein_g}
        goal={goal?.protein_g}
        unit="g"
        color="bg-blue-400"
        compact={compact}
      />
      <MacroStat
        label={compact ? "C" : "Carbs"}
        value={macros.carbs_g}
        goal={goal?.carbs_g}
        unit="g"
        color="bg-green-400"
        compact={compact}
      />
      <MacroStat
        label={compact ? "F" : "Fat"}
        value={macros.fat_g}
        goal={goal?.fat_g}
        unit="g"
        color="bg-orange-400"
        compact={compact}
      />
    </div>
  );
}
