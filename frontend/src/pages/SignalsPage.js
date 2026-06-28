import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useWorkspace } from "@/context/WorkspaceContext";
import { IntelligenceSheet } from "@/components/workspace/IntelligenceSheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { SEVERITY, convictionColor, LEVEL_LABEL } from "@/lib/format";
import { Radar, MapPin } from "lucide-react";

const CONV = [{ v: 0, l: "Tous" }, { v: 40, l: "40%+" }, { v: 55, l: "55%+" }, { v: 70, l: "70%+" }, { v: 85, l: "85%+" }];

export default function SignalsPage() {
  const { setSelectedRef } = useWorkspace();
  const [minConv, setMinConv] = useState(40);
  const [level, setLevel] = useState("all");
  const [items, setItems] = useState(null);

  useEffect(() => {
    setItems(null);
    const params = { min_conviction: minConv, limit: 90 };
    if (level !== "all") params.level = level;
    api.get("/signals", { params }).then(({ data }) => setItems(data.signals || [])).catch(() => setItems([]));
  }, [minConv, level]);

  return (
    <div className="h-full flex flex-col p-3 md:p-4" data-testid="signals-page">
      <div className="rounded-[18px] bg-white border border-[var(--ps-border)] flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-[var(--ps-border)] flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-lg font-bold flex items-center gap-2"><Radar className="h-5 w-5 text-[#6366F1]" />Signaux vendeurs</h1>
            <p className="text-xs text-[var(--ps-muted)] mt-0.5">Parcelles classées par score de conviction · données réelles Métropole de Lyon</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-1.5">
              {CONV.map((c) => (
                <button key={c.v} data-testid={`signals-conv-${c.v}`} onClick={() => setMinConv(c.v)}
                  className={`h-8 rounded-full border px-3 text-xs font-medium transition-colors ${minConv === c.v ? "bg-[#111827] text-white border-[#111827]" : "bg-white border-[var(--ps-border)] hover:bg-[var(--ps-surface-3)]"}`}>{c.l}</button>
              ))}
            </div>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger className="h-8 w-[150px] text-xs" data-testid="signals-level-select"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous niveaux</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High conviction</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="monitoring">Watch list</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <ScrollArea className="flex-1 ps-scroll">
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3">
            {items === null && [0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} data-testid="loading-skeleton" className="h-[128px] rounded-[16px]" />)}
            {items && items.map((s) => {
              const sev = SEVERITY[s.severity] || SEVERITY.new_signal;
              return (
                <button key={s.ref_cadastrale} data-testid="signal-card" onClick={() => setSelectedRef(s.ref_cadastrale)}
                  className="text-left rounded-[16px] bg-white border border-[var(--ps-border)] px-3 py-3 hover:shadow-[var(--ps-shadow-soft)] hover:border-[#6366F1] transition-shadow">
                  <div className="flex items-start justify-between gap-2">
                    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold" style={{ color: sev.color, background: sev.bg, borderColor: sev.border }}>{sev.label}</span>
                    <div className="text-xl font-bold tabular-nums" style={{ color: convictionColor(s.conviction_score) }}>{s.conviction_score}%</div>
                  </div>
                  <div className="mt-2 text-sm font-semibold flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-[var(--ps-muted)]" />{s.commune_nom}</div>
                  <div className="text-xs text-[var(--ps-muted)] font-mono-ps">{s.ref_cadastrale}</div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(s.chips || []).map((c, i) => <span key={i} className="inline-flex items-center rounded-full border border-[var(--ps-border)] bg-[var(--ps-surface-2)] px-2 py-0.5 text-[11px]">{c}</span>)}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--ps-muted)]">
                    <span>{s.nb_signaux_actifs} signaux actifs</span>
                    <span className="font-medium">{LEVEL_LABEL[s.conviction_level] || s.conviction_level}</span>
                  </div>
                </button>
              );
            })}
          </div>
          {items && items.length === 0 && <div className="text-center py-16 text-sm text-[var(--ps-muted)]" data-testid="signals-empty">Aucun signal pour ces filtres.</div>}
        </ScrollArea>
      </div>
      <IntelligenceSheet />
    </div>
  );
}
