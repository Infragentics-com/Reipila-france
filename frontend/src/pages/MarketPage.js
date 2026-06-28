import { useEffect, useState } from "react";
import api from "@/lib/api";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { num } from "@/lib/format";
import { BarChart3, TrendingUp, TrendingDown, Newspaper, ExternalLink } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, Cell } from "recharts";

const LEVELS = [
  { id: "critical", l: "Critical", c: "#DC2626" },
  { id: "high", l: "High", c: "#EF4444" },
  { id: "medium", l: "Medium", c: "#F59E0B" },
  { id: "low", l: "Low", c: "#6366F1" },
  { id: "monitoring", l: "Watch", c: "#9CA3AF" },
];

export default function MarketPage() {
  const [data, setData] = useState(null);
  const [news, setNews] = useState(null);
  useEffect(() => {
    api.get("/market").then(({ data }) => setData(data)).catch(() => setData({ communes: [], conviction_levels: {}, signal_breakdown: [] }));
    api.get("/news", { params: { q: "marché immobilier Lyon prix" } }).then(({ data }) => setNews(data.items || [])).catch(() => setNews([]));
  }, []);

  if (!data) {
    return (
      <div className="h-full p-3 md:p-4" data-testid="market-page">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} data-testid="loading-skeleton" className="h-[260px] rounded-[18px]" />)}
        </div>
      </div>
    );
  }

  const levels = data.conviction_levels || {};
  const maxLevel = Math.max(1, ...LEVELS.map((l) => levels[l.id] || 0));
  const breakdown = (data.signal_breakdown || []).map((b) => ({ ...b, name: b.label }));
  const communes = data.communes || [];

  return (
    <div className="h-full p-3 md:p-4" data-testid="market-page">
      <ScrollArea className="h-full ps-scroll">
        <div className="max-w-[1400px] space-y-4">
          <div>
            <h1 className="font-display text-lg font-bold flex items-center gap-2"><BarChart3 className="h-5 w-5 text-[#6366F1]" />Marché — Métropole de Lyon</h1>
            <p className="text-xs text-[var(--ps-muted)] mt-0.5">Distribution de conviction, signaux dominants et dynamique par commune</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Conviction distribution */}
            <div className="rounded-[18px] bg-white border border-[var(--ps-border)] p-4">
              <div className="text-sm font-semibold mb-3">Distribution de conviction</div>
              <div className="space-y-2.5">
                {LEVELS.map((lv) => {
                  const v = levels[lv.id] || 0;
                  return (
                    <div key={lv.id} data-testid={`market-level-${lv.id}`}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium">{lv.l}</span>
                        <span className="tabular-nums text-[var(--ps-muted)]">{v}</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-[var(--ps-surface-3)] overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(v / maxLevel) * 100}%`, background: lv.c }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Signal breakdown */}
            <div className="rounded-[18px] bg-white border border-[var(--ps-border)] p-4">
              <div className="text-sm font-semibold mb-3">Signaux les plus fréquents</div>
              {breakdown.length === 0 ? (
                <div className="text-xs text-[var(--ps-muted)] py-8 text-center">Aucune donnée.</div>
              ) : (
                <div className="h-[220px]" data-testid="market-signal-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={breakdown} margin={{ top: 8, right: 8, left: 8, bottom: 28 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#6B7280" }} angle={-30} textAnchor="end" interval={0} height={50} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill: "rgba(99,102,241,0.06)" }} contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB", fontSize: 12 }} />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                        {breakdown.map((_, i) => <Cell key={i} fill="#6366F1" />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* Communes ranking */}
          <div className="rounded-[18px] bg-white border border-[var(--ps-border)] overflow-hidden">
            <div className="p-4 border-b border-[var(--ps-border)] text-sm font-semibold">Communes ingestées · classement par activité</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="market-communes-table">
                <thead>
                  <tr className="text-left text-[11px] text-[var(--ps-muted)] border-b border-[var(--ps-border)]">
                    <th className="font-medium px-4 py-2">Commune</th>
                    <th className="font-medium px-4 py-2 text-right">Prix médian</th>
                    <th className="font-medium px-4 py-2 text-right">Variation 6m</th>
                    <th className="font-medium px-4 py-2 text-right">Parcelles</th>
                    <th className="font-medium px-4 py-2 text-right">Signaux actifs</th>
                  </tr>
                </thead>
                <tbody>
                  {communes.map((c) => (
                    <tr key={c.code_insee} className="border-b border-[var(--ps-border)] last:border-0 hover:bg-[var(--ps-surface-2)]">
                      <td className="px-4 py-2.5 font-medium">{c.nom}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{c.prix_m2_median_actuel ? `${num(c.prix_m2_median_actuel)} €/m²` : "—"}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {c.prix_m2_variation_6m != null ? (
                          <span className="inline-flex items-center gap-1" style={{ color: c.prix_m2_variation_6m >= 0 ? "#16A34A" : "#EF4444" }}>
                            {c.prix_m2_variation_6m >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}{c.prix_m2_variation_6m}%
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{c.nb_parcelles || 0}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-semibold">{c.nb_signals_actifs || 0}</td>
                    </tr>
                  ))}
                  {communes.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-10 text-center text-[var(--ps-muted)]">Aucune commune ingestée pour l'instant.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          {/* Neighborhood / market news */}
          <div className="rounded-[18px] bg-white border border-[var(--ps-border)] overflow-hidden" data-testid="market-news">
            <div className="p-4 border-b border-[var(--ps-border)] text-sm font-semibold flex items-center gap-2"><Newspaper className="h-4 w-4 text-[#6366F1]" />Actualité immobilière · Métropole de Lyon</div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {news === null && [0, 1, 2, 3].map((i) => <Skeleton key={i} data-testid="loading-skeleton" className="h-16 rounded-[12px]" />)}
              {news && news.length === 0 && <div className="text-xs text-[var(--ps-muted)] col-span-full py-6 text-center">Aucune actualité disponible.</div>}
              {(news || []).map((n, i) => (
                <a key={i} href={n.link} target="_blank" rel="noreferrer" data-testid="news-item" className="block rounded-[12px] border border-[var(--ps-border)] bg-[var(--ps-surface-2)] px-3 py-2 hover:border-[#6366F1] hover:shadow-[var(--ps-shadow-soft)] transition-shadow">
                  <div className="text-[13px] font-medium leading-snug flex items-start gap-1.5">{n.title}<ExternalLink className="h-3 w-3 mt-0.5 shrink-0 text-[var(--ps-subtle)]" /></div>
                  <div className="text-[11px] text-[var(--ps-muted)] mt-1 font-medium text-[#6366F1]">{n.source || "Source"}</div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
