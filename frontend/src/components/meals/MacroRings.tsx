import type { Macros } from "@/lib/api";

interface MacroRingsProps {
  macros: Macros;
  targets?: Macros;
}

const RING_DEFS = [
  { key: "calories" as const, label: "Calories", unit: "cal", stroke: "#facc15" },
  { key: "protein_g" as const, label: "Protein", unit: "g", stroke: "#60a5fa" },
  { key: "carbs_g" as const, label: "Carbs", unit: "g", stroke: "#4ade80" },
  { key: "fat_g" as const, label: "Fat", unit: "g", stroke: "#fb923c" },
];

const R = 30;
const CIRC = 2 * Math.PI * R;

function DonutRing({
  value,
  goal,
  label,
  unit,
  stroke,
}: {
  value: number;
  goal?: number;
  label: string;
  unit: string;
  stroke: string;
}) {
  const pct = goal && goal > 0 ? Math.min(value / goal, 1) : 0;
  const dashOffset = CIRC * (1 - pct);
  const over = goal ? value > goal : false;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-[76px] h-[76px]">
        <svg viewBox="0 0 76 76" className="w-full h-full -rotate-90">
          {/* Track */}
          <circle
            cx="38"
            cy="38"
            r={R}
            fill="none"
            strokeWidth="7"
            style={{ stroke: "hsl(var(--muted))" }}
          />
          {/* Progress */}
          {goal && (
            <circle
              cx="38"
              cy="38"
              r={R}
              fill="none"
              stroke={over ? "#f87171" : stroke}
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={CIRC}
              strokeDashoffset={dashOffset}
              style={{ transition: "stroke-dashoffset 0.5s ease" }}
            />
          )}
        </svg>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-bold leading-tight tabular-nums">
            {Math.round(value)}
          </span>
          <span className="text-[9px] text-muted-foreground">{unit}</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-xs font-medium leading-none">{label}</p>
        {goal ? (
          <p className="text-[10px] text-muted-foreground mt-0.5">
            / {Math.round(goal)}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default function MacroRings({ macros, targets }: MacroRingsProps) {
  return (
    <div className="grid grid-cols-4 gap-1">
      {RING_DEFS.map(({ key, label, unit, stroke }) => (
        <DonutRing
          key={key}
          value={macros[key]}
          goal={targets?.[key]}
          label={label}
          unit={unit}
          stroke={stroke}
        />
      ))}
    </div>
  );
}
