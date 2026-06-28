import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useWorkspace } from "@/context/WorkspaceContext";
import { IntelligenceSheet } from "@/components/workspace/IntelligenceSheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { OPP_LABEL, convictionColor, money, num } from "@/lib/format";
import { Boxes, MapPin, TrendingDown, TrendingUp } from "lucide-react";

const TYPES = [
  { id: "", l: "Toutes" },
  { id: "market_discount", l: "Décote marché" },
  { id: "dpe_renovation", l: "Rénovation DPE" },
  { id: "land_division", l: "Division foncière" },
  { id: "distressed_seller", l: "Vendeur en difficulté" },
  { id: "pm_liquidation", l: "Liquidation PM" },
];

export default function OpportunitiesPage() {
  const { setSelectedRef } = useWorkspace();
  const [type, setType] = useState("");
  const [items, setItems] = useState(null);

  useEffect(() => {
    setItems(null);
    const params = { limit: 90 };
    if (type) params.type_opp = type;
    api.get("/opportunities", { params }).then(({ data }) => setItems(data.opportunities || [])).catch(() => setItems([]));
  }, [type]);

  return (
    <div className="h-full flex flex-col p-3 md:p-4" data-testid="opportunities-page">
      <div className="rounded-[18px] bg-white border border-[var(--ps-border)] flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-[var(--ps-border)] flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-lg font-bold flex items-center gap-2"><Boxes className="h-5 w-5 text-[#6366F1]" />Opportunités d'acquisition</h1>
            <p className="text-xs text-[var(--ps-muted)] mt-0.5">Décotes, rénovations DPE, divisions foncières — estimations basées sur DVF</p>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {TYPES.map((t) => (
              <button key={t.id || "all"} data-testid={`opp-filter-${t.id || "all"}`} onClick={() => setType(t.id)}
                className={`h-8 rounded-full border px-3 text-xs font-medium transition-colors ${type === t.id ? "bg-[#111827] text-white border-[#111827]" : "bg-white border-[var(--ps-border)] hover:bg-[var(--ps-surface-3)]"}`}>{t.l}</button>
            ))}
          </div>
        </div>
        <ScrollArea className="flex-1 ps-scroll">
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3">
            {items === null && [0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} data-testid="loading-skeleton" className="h-[150px] rounded-[16px]" />)}
            {items && items.map((o) => (
              <button key={o.ref_cadastrale} data-testid="opportunity-card" onClick={() => setSelectedRef(o.ref_cadastrale)}
                className="text-left rounded-[16px] bg-white border border-[var(--ps-border)] px-3 py-3 hover:shadow-[var(--ps-shadow-soft)] hover:border-[#6366F1] transition-shadow">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap gap-1">
                    {(o.types_opportunite || []).map((t) => (
                      <span key={t} className="inline-flex items-center rounded-full border border-[#6366F1]/30 bg-[#6366F1]/10 px-2 py-0.5 text-[10px] font-semibold text-[#6366F1]">{OPP_LABEL[t] || t}</span>
                    ))}
                  </div>
                  <div className="text-lg font-bold tabular-nums shrink-0" style={{ color: convictionColor(o.conviction_score) }}>{o.conviction_score}%</div>
                </div>
                <div className="mt-2 text-sm font-semibold flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-[var(--ps-muted)]" />{o.commune_nom}</div>
                <div className="text-xs text-[var(--ps-muted)] font-mono-ps">{o.ref_cadastrale}</div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div className="rounded-[10px] border border-[var(--ps-border)] bg-[var(--ps-surface-2)] px-2 py-1.5">
                    <div className="text-[10px] text-[var(--ps-muted)]">Valeur estimée</div>
                    <div className="text-xs font-semibold tabular-nums">{o.valeur_estimee_basse ? `${money(o.valeur_estimee_basse)} – ${money(o.valeur_estimee_haute)}` : "—"}</div>
                  </div>
                  <div className="rounded-[10px] border border-[var(--ps-border)] bg-[var(--ps-surface-2)] px-2 py-1.5">
                    <div className="text-[10px] text-[var(--ps-muted)] flex items-center gap-1"><TrendingDown className="h-3 w-3" />Décote</div>
                    <div className="text-xs font-semibold tabular-nums" style={{ color: o.decote_vs_median_pct > 0 ? "#16A34A" : "#6B7280" }}>{o.decote_vs_median_pct != null ? `${o.decote_vs_median_pct}%` : "—"}</div>
                  </div>
                </div>
                {o.plus_value_potentielle != null && (
                  <div data-testid="opportunity-plusvalue" className="mt-2 rounded-[10px] border border-[#16A34A]/25 bg-[#16A34A]/8 px-2.5 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#15803D]"><TrendingUp className="h-3.5 w-3.5" />Plus-value potentielle</div>
                    <div className="text-right">
                      <div className="text-sm font-bold tabular-nums text-[#15803D]">{money(o.plus_value_potentielle)}</div>
                      {o.marge_pct != null && <div className="text-[10px] text-[var(--ps-muted)]">marge {o.marge_pct}%</div>}
                    </div>
                  </div>
                )}
                <div className="mt-2 text-[11px] text-[var(--ps-muted)] flex flex-wrap gap-x-2">
                  <span>Travaux estimés {o.cout_travaux_estime != null ? money(o.cout_travaux_estime) : "—"}</span>
                  <span>· Après travaux {o.valeur_apres_travaux != null ? money(o.valeur_apres_travaux) : "—"}</span>
                  {o.dpe_classe && <span>· DPE {o.dpe_classe}</span>}
                </div>
              </button>
            ))}
          </div>
          {items && items.length === 0 && <div className="text-center py-16 text-sm text-[var(--ps-muted)]" data-testid="opportunities-empty">Aucune opportunité pour ce filtre.</div>}
        </ScrollArea>
      </div>
      <IntelligenceSheet />
    </div>
  );
}
