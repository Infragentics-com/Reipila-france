import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useWorkspace } from "@/context/WorkspaceContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { SEVERITY, convictionColor, timeAgo } from "@/lib/format";
import { MapPin } from "lucide-react";

const EVENTS = [
  { id: "all", label: "Tout" },
  { id: "high_conviction", label: "Conviction" },
  { id: "convergence_event", label: "Convergence" },
  { id: "new_signal", label: "Nouveaux" },
  { id: "market_anomaly", label: "Marché" },
];

export function LiveFeed() {
  const { selectedRef, setSelectedRef, setFlyTarget } = useWorkspace();
  const [event, setEvent] = useState("all");
  const [items, setItems] = useState(null);

  useEffect(() => {
    setItems(null);
    api.get("/feed", { params: { event, limit: 40 } })
      .then(({ data }) => setItems(data.feed || []))
      .catch(() => setItems([]));
  }, [event]);

  const pick = (it) => {
    setSelectedRef(it.ref_cadastrale);
    if (it.longitude && it.latitude) setFlyTarget({ lon: it.longitude, lat: it.latitude, zoom: 16.5 });
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex flex-wrap gap-1.5 px-1 pb-2">
        {EVENTS.map((e) => (
          <button key={e.id} data-testid={`feed-filter-${e.id}`} onClick={() => setEvent(e.id)}
            className={`h-7 rounded-full border px-2.5 text-[11px] font-medium transition-colors ${event === e.id ? "bg-[#111827] text-white border-[#111827]" : "bg-white text-[var(--ps-text)] border-[var(--ps-border)] hover:bg-[var(--ps-surface-3)]"}`}>
            {e.label}
          </button>
        ))}
      </div>
      <ScrollArea className="flex-1 ps-scroll -mx-1 px-1">
        {items === null && (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} data-testid="loading-skeleton" className="h-[96px] rounded-[16px]" />)}
          </div>
        )}
        {items && items.length === 0 && (
          <div data-testid="empty-live-feed" className="text-center py-12 px-6">
            <div className="text-sm font-medium">Aucun signal récent</div>
            <div className="text-xs text-[var(--ps-muted)] mt-1">Aucun nouveau signal sur ce filtre. Élargissez la sélection.</div>
          </div>
        )}
        <div className="space-y-2 pb-3">
          {(items || []).map((it) => {
            const sev = SEVERITY[it.severity] || SEVERITY.new_signal;
            const active = selectedRef === it.ref_cadastrale;
            return (
              <button key={it.ref_cadastrale} data-testid="live-feed-intelligence-block" onClick={() => pick(it)}
                className={`w-full text-left rounded-[16px] bg-white border px-3 py-3 transition-shadow hover:shadow-[var(--ps-shadow-soft)] ${active ? "border-[#6366F1] ring-1 ring-[#6366F1]" : "border-[var(--ps-border)]"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide" style={{ color: sev.color, background: sev.bg, borderColor: sev.border }}>{sev.label}</span>
                    <div className="mt-1.5 text-sm font-semibold leading-tight">{it.title}</div>
                    <div className="text-xs text-[var(--ps-muted)] flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{it.commune_nom} · <span className="font-mono-ps">{it.ref_cadastrale}</span></span></div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-semibold tabular-nums" style={{ color: convictionColor(it.conviction_score) }}>{it.conviction_score}%</div>
                    <div className="text-[10px] text-[var(--ps-muted)]">{timeAgo(it.detected_at)}</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {(it.chips || []).map((c, i) => (
                    <span key={i} className="inline-flex items-center rounded-full border border-[var(--ps-border)] bg-[var(--ps-surface-2)] px-2 py-0.5 text-[11px]">{c}</span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
