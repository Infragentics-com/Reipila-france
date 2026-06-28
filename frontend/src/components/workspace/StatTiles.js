import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Flame, Layers3 } from "lucide-react";

const TILES = [
  { key: "new_signals_24h", label: "Nouveaux", sub: "24h", color: "#16A34A", icon: Sparkles },
  { key: "high_conviction", label: "Conviction", sub: "≥ 70%", color: "#EF4444", icon: Flame },
  { key: "convergence_events", label: "Convergences", sub: "≥ 3 sources", color: "#6366F1", icon: Layers3 },
];

export function StatTiles() {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    api.get("/stats/overview").then(({ data }) => setStats(data)).catch(() => setStats({}));
  }, []);

  if (!stats) {
    return (
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => <Skeleton key={i} data-testid="loading-skeleton" className="h-[64px] rounded-[14px]" />)}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-3 gap-2" data-testid="market-overview-stats">
      {TILES.map((t) => (
        <div key={t.key} data-testid={`market-overview-stat-tile-${t.key}`}
          className="rounded-[14px] bg-white border border-[var(--ps-border)] px-2.5 py-2 shadow-[0_1px_0_rgba(17,24,39,0.04)]">
          <div className="text-[10px] font-medium text-[var(--ps-muted)] flex items-center gap-1">
            <t.icon className="h-3 w-3" style={{ color: t.color }} />{t.label}
          </div>
          <div className="text-xl font-semibold tabular-nums leading-tight mt-0.5" style={{ color: t.color }}>{stats[t.key] ?? 0}</div>
          <div className="text-[10px] text-[var(--ps-subtle)]">{t.sub}</div>
        </div>
      ))}
    </div>
  );
}
