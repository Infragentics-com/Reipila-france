import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useWorkspace } from "@/context/WorkspaceContext";
import { toast } from "sonner";
import { X, Building2, Ruler, User2, CalendarClock, Sparkles, FileText, MoreHorizontal, CheckCircle2, GitBranch, Loader2, Newspaper, TrendingUp, Hammer, Coins, Info, ExternalLink } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { SEVERITY, SEVERITY_EXPLAIN, convictionColor, money, num, WEIGHT_LABEL_STYLE, OPP_LABEL } from "@/lib/format";

function Dot({ color }) { return <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />; }

export default function IntelligenceDrawer({ hideClose = false }) {
  const { selectedRef, setSelectedRef } = useWorkspace();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ai, setAi] = useState({});
  const [busy, setBusy] = useState(null);
  const [tab, setTab] = useState("overview");
  const [news, setNews] = useState(null);
  const [newsLoading, setNewsLoading] = useState(false);

  useEffect(() => {
    if (!selectedRef) { setData(null); return; }
    setLoading(true); setAi({}); setNews(null); setTab("overview");
    api.get(`/parcelles/${selectedRef}`).then(({ data }) => {
      setData(data);
      if (data.convergence_log?.claude_interpretation) setAi((a) => ({ ...a, interpret: data.convergence_log.claude_interpretation }));
    }).catch(() => toast.error("Parcelle introuvable")).finally(() => setLoading(false));
  }, [selectedRef]);

  useEffect(() => {
    if (tab !== "quartier" || news !== null || !data?.parcelle?.commune_nom) return;
    setNewsLoading(true);
    api.get("/news", { params: { commune: data.parcelle.commune_nom } })
      .then(({ data: d }) => setNews(d.items || []))
      .catch(() => setNews([]))
      .finally(() => setNewsLoading(false));
  }, [tab, news, data]);

  const runAI = async (kind) => {
    setBusy(kind);
    try {
      const { data: d } = await api.post(`/ai/${kind}`, { ref_cadastrale: selectedRef });
      setAi((a) => ({ ...a, [kind]: d.interpretation || d.pitch || d.memo }));
      toast.success("Génération IA terminée");
    } catch (e) { toast.error(e?.response?.data?.detail || "IA indisponible"); }
    finally { setBusy(null); }
  };

  const addToPipeline = async () => {
    try { await api.post("/pipeline", { ref_cadastrale: selectedRef }); toast.success("Ajouté à l'Execution Flow"); }
    catch (e) { toast.error(e?.response?.data?.detail || "Erreur"); }
  };

  if (!selectedRef) {
    return (
      <div data-testid="empty-intelligence-drawer" className="h-full flex flex-col items-center justify-center text-center px-8 text-[var(--ps-muted)]">
        <Building2 className="h-8 w-8 mb-3 text-[var(--ps-subtle)]" />
        <div className="text-sm font-medium text-[var(--ps-text)]">Aucune parcelle sélectionnée</div>
        <div className="text-xs mt-1">Sélectionnez une parcelle ou un signal sur la carte pour inspecter le raisonnement.</div>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="h-full p-4 space-y-3">
        <Skeleton className="h-36 w-full rounded-[14px]" />
        <Skeleton className="h-6 w-2/3" /><Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-24 w-full rounded-[14px]" /><Skeleton className="h-40 w-full rounded-[14px]" />
      </div>
    );
  }

  const p = data.parcelle;
  const log = data.convergence_log;
  const sev = SEVERITY[data.severity] || SEVERITY.new_signal;
  const conv = p.conviction_score;
  const rawInputs = buildRawInputs(p, data.signals);
  const acq = data.acquisition || null;
  const cstats = data.comparables_stats || null;
  const sevExplain = SEVERITY_EXPLAIN[data.severity];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="relative h-32 shrink-0" style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.16), rgba(245,245,247,0.4))" }}>
        <div className="absolute inset-0 flex items-center justify-center"><Building2 className="h-10 w-10 text-[#6366F1] opacity-40" /></div>
        {!hideClose && (
          <button data-testid="intelligence-drawer-close-button" onClick={() => setSelectedRef(null)} className="absolute top-2 right-2 h-8 w-8 rounded-[10px] bg-white border border-[var(--ps-border)] flex items-center justify-center shadow-sm hover:bg-[var(--ps-surface-3)]"><X className="h-4 w-4" /></button>
        )}
      </div>

      <div className="px-4 pt-3 pb-2 border-b border-[var(--ps-border)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide" style={{ color: sev.color, background: sev.bg, borderColor: sev.border }}>{sev.label}</span>
            <div className="mt-1.5 font-display text-base font-semibold">{p.commune_nom} • <span className="font-mono-ps text-sm">{p.ref_cadastrale}</span></div>
            <div className="text-xs text-[var(--ps-muted)]">{p.adresse_ban || "Adresse non géocodée"}</div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold tabular-nums" style={{ color: convictionColor(conv) }}>{conv}%</div>
            <div className="text-[11px] text-[var(--ps-muted)]">Conviction</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <Meta icon={Building2} label="Type" value={p.type_bien || "—"} />
          <Meta icon={Ruler} label="Surface" value={p.surface_bati_m2 ? `${num(p.surface_bati_m2)} m²` : (p.surface_parcelle_m2 ? `${num(p.surface_parcelle_m2)} m² (terrain)` : "—")} />
          <Meta icon={User2} label="Propriétaire" value={p.raison_sociale || (p.type_proprio || "inconnu")} />
          <Meta icon={CalendarClock} label="Dernière mut." value={p.dvf_date_derniere_mutation || "—"} />
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="flex-1 min-h-0 flex flex-col">
        <TabsList className="mx-4 mt-2 justify-start bg-[var(--ps-surface-3)] flex-wrap h-auto">
          {["overview", "signals", "analysis", "comparables", "quartier", "notes"].map((t) => (
            <TabsTrigger key={t} value={t} data-testid={`drawer-tab-${t}`} className="text-xs capitalize">{{ overview: "Aperçu", signals: "Signaux", analysis: "Analyse", comparables: "Comparables", quartier: "Quartier", notes: "Notes" }[t]}</TabsTrigger>
          ))}
        </TabsList>

        <ScrollArea className="flex-1 ps-scroll">
          {/* Overview */}
          <TabsContent value="overview" className="px-4 pb-4 mt-2 space-y-4">
            {sevExplain && (
              <div data-testid="severity-explanation" className="rounded-[12px] border px-3 py-2 flex items-start gap-2" style={{ background: sev.bg, borderColor: sev.border }}>
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: sev.color }} />
                <div className="text-[11px] leading-4"><span className="font-semibold" style={{ color: sev.color }}>{sev.label} — </span><span className="text-[var(--ps-text)]">{sevExplain}</span></div>
              </div>
            )}
            <div>
              <div className="text-[11px] font-semibold tracking-wide text-[var(--ps-muted)] mb-1">RAW SIGNAL INPUTS</div>
              <div data-testid="drawer-raw-signal-inputs" className="rounded-[14px] border border-[var(--ps-border)] bg-white divide-y divide-[var(--ps-border)]">
                {rawInputs.map((r, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 px-3 py-2">
                    <div className="flex items-center gap-2"><Dot color={r.color} /><span className="text-xs text-[var(--ps-muted)]">{r.label}</span></div>
                    <span className="text-xs font-medium text-right">{r.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="text-[11px] font-semibold tracking-wide text-[var(--ps-muted)] mb-1">SIGNAL CONVERGENCE LOG</div>
              <div data-testid="drawer-signal-convergence-log" className="rounded-[14px] border border-[var(--ps-border)] bg-[var(--ps-surface-2)] p-3 space-y-2">
                {(log?.steps || []).map((s) => {
                  const ws = WEIGHT_LABEL_STYLE[s.weight_label] || WEIGHT_LABEL_STYLE.STANDARD;
                  return (
                    <div key={s.step_number} className="font-mono-ps text-[12px] leading-5">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-[#16A34A] shrink-0" />
                        <div>
                          <span className="text-[var(--ps-muted)]">[STEP {s.step_number}]</span> <span className="font-semibold">{s.category}</span>
                          <div className="text-[var(--ps-text)]">→ {s.finding} <span className="px-1.5 py-0.5 rounded-full text-[10px]" style={{ color: ws.color, background: ws.bg }}>{s.weight_label} +{s.points_contributed}</span></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div className="border-t border-[var(--ps-border)] pt-2 mt-2 space-y-1 font-mono-ps text-[12px]">
                  <div className="flex justify-between"><span className="text-[var(--ps-muted)]">→ Score brut / bonus</span><span>{log?.score_brut_avant_bonus} • +{log?.bonus_convergence_pct}% • ×{log?.context_multiplier}</span></div>
                  <div className="flex justify-between"><span className="text-[var(--ps-muted)]">→ Final Conviction Score</span><span className="font-bold" style={{ color: convictionColor(conv) }}>{conv}%</span></div>
                  <div className="flex justify-between"><span className="text-[var(--ps-muted)]">→ Classification</span><span className="font-semibold" style={{ color: sev.color }}>{log?.classification}</span></div>
                  <div className="flex justify-between"><span className="text-[var(--ps-muted)]">→ Action recommandée</span><span className="text-[#6366F1] font-semibold">{log?.recommended_action}</span></div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Signals */}
          <TabsContent value="signals" className="px-4 pb-4 mt-2 space-y-2">
            {data.signals.map((s) => {
              const ws = WEIGHT_LABEL_STYLE[s.convergence_weight_label] || WEIGHT_LABEL_STYLE.STANDARD;
              return (
                <div key={s.id} className="rounded-[12px] border border-[var(--ps-border)] bg-white px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{s.convergence_label}</span>
                    <span className="text-xs font-semibold tabular-nums">+{Math.round(s.poids_effectif)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[11px] text-[var(--ps-muted)]">
                    <span>{s.categorie_signal} • {s.source_api}</span>
                    <span>{s.recency_days != null ? `${s.recency_days} j` : ""} • ×{s.recency_factor}</span>
                  </div>
                </div>
              );
            })}
          </TabsContent>

          {/* Analysis */}
          <TabsContent value="analysis" className="px-4 pb-4 mt-2 space-y-3">
            {acq && (
              <div data-testid="investor-analysis" className="rounded-[14px] border border-[var(--ps-border)] bg-white overflow-hidden">
                <div className="px-3 py-2 border-b border-[var(--ps-border)] flex items-center gap-1.5 text-[11px] font-semibold text-[var(--ps-muted)]"><Coins className="h-3.5 w-3.5 text-[#6366F1]" />ÉCONOMIE DE L'OPÉRATION (estimations)</div>
                <div className="grid grid-cols-2 divide-x divide-y divide-[var(--ps-border)]">
                  <Fin label="Décote vs marché" value={acq.decote_vs_median_pct != null ? `${acq.decote_vs_median_pct}%` : "—"} pos={acq.decote_vs_median_pct > 0} />
                  <Fin label="Valeur estimée (médiane)" value={money(acq.prix_acquisition_estime || acq.valeur_estimee_median)} />
                  <Fin label="Travaux estimés" value={acq.cout_travaux_estime != null ? money(acq.cout_travaux_estime) : "—"} icon={Hammer} sub={acq.travaux_eur_m2 ? `${acq.travaux_eur_m2} €/m² · DPE ${acq.dpe_classe || "?"}` : null} />
                  <Fin label="Valeur après travaux" value={acq.valeur_apres_travaux != null ? money(acq.valeur_apres_travaux) : "—"} sub="repositionné P75 secteur" />
                </div>
                <div className="px-3 py-2.5 border-t border-[var(--ps-border)] bg-[#16A34A]/8 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-[#15803D] flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5" />Plus-value potentielle</span>
                  <span className="text-base font-bold tabular-nums text-[#15803D]">{acq.plus_value_potentielle != null ? money(acq.plus_value_potentielle) : "—"}{acq.marge_pct != null && <span className="text-[11px] font-medium text-[var(--ps-muted)] ml-1.5">marge {acq.marge_pct}%</span>}</span>
                </div>
                {(acq.types_opportunite || []).length > 0 && (
                  <div className="px-3 py-2 flex flex-wrap gap-1 border-t border-[var(--ps-border)]">
                    {acq.types_opportunite.map((t) => <span key={t} className="inline-flex items-center rounded-full border border-[#6366F1]/30 bg-[#6366F1]/10 px-2 py-0.5 text-[10px] font-semibold text-[#6366F1]">{OPP_LABEL[t] || t}</span>)}
                  </div>
                )}
                <div className="px-3 py-1.5 text-[10px] text-[var(--ps-subtle)] border-t border-[var(--ps-border)]">Hypothèses : barème travaux par classe DPE (marché FR 2025) · valeur cible = P75 DVF du secteur après rénovation.</div>
              </div>
            )}
            <div className="flex gap-2">
              <Button data-testid="ai-interpret-button" size="sm" onClick={() => runAI("interpret")} disabled={busy} className="bg-[#6366F1] hover:bg-[#5457e0] text-white"><Sparkles className="h-4 w-4 mr-1.5" />{busy === "interpret" ? "Analyse…" : "Interprétation IA"}</Button>
              <Button data-testid="ai-pitch-button" size="sm" variant="outline" onClick={() => runAI("pitch")} disabled={busy}>{busy === "pitch" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Pitch d'approche"}</Button>
            </div>
            {ai.interpret && <AiBlock title="Interprétation analyste (Claude)" text={ai.interpret} />}
            {ai.pitch && <AiBlock title="Pitch d'approche" text={ai.pitch} />}
            {!ai.interpret && !ai.pitch && <div className="text-xs text-[var(--ps-muted)]">Générez une interprétation narrative et un pitch d'approche, ancrés sur le log de convergence.</div>}
          </TabsContent>

          {/* Comparables */}
          <TabsContent value="comparables" className="px-4 pb-4 mt-2 space-y-3" data-testid="drawer-comparables">
            {cstats ? (
              <div className="rounded-[14px] border border-[var(--ps-border)] bg-white overflow-hidden">
                <div className="px-3 py-2 border-b border-[var(--ps-border)] flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[var(--ps-muted)]">PRÉ-ESTIMATION ROBUSTE</span>
                  <span className="text-[10px] text-[var(--ps-subtle)]">{cstats.n_retenus} retenus · {cstats.n_aberrants} aberration(s) retirée(s)</span>
                </div>
                <div className="px-3 py-3">
                  <div className="text-xl font-bold tabular-nums">{cstats.pre_estimation_median != null ? money(cstats.pre_estimation_median) : "—"}</div>
                  <div className="text-[11px] text-[var(--ps-muted)]">fourchette {cstats.pre_estimation_basse != null ? money(cstats.pre_estimation_basse) : "—"} – {cstats.pre_estimation_haute != null ? money(cstats.pre_estimation_haute) : "—"}</div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-[10px] bg-[var(--ps-surface-2)] border border-[var(--ps-border)] py-1.5"><div className="text-[10px] text-[var(--ps-muted)]">P25</div><div className="text-xs font-semibold tabular-nums">{num(cstats.prix_m2_p25)} €/m²</div></div>
                    <div className="rounded-[10px] bg-[#6366F1]/10 border border-[#6366F1]/25 py-1.5"><div className="text-[10px] text-[#6366F1]">Médian</div><div className="text-xs font-semibold tabular-nums text-[#6366F1]">{num(cstats.prix_m2_median)} €/m²</div></div>
                    <div className="rounded-[10px] bg-[var(--ps-surface-2)] border border-[var(--ps-border)] py-1.5"><div className="text-[10px] text-[var(--ps-muted)]">P75</div><div className="text-xs font-semibold tabular-nums">{num(cstats.prix_m2_p75)} €/m²</div></div>
                  </div>
                  {cstats.decote_vs_comparables_pct != null && (
                    <div className="mt-2 text-[11px] text-[var(--ps-muted)]">Décote du bien vs comparables filtrés : <span className="font-semibold" style={{ color: cstats.decote_vs_comparables_pct > 0 ? "#16A34A" : "#6B7280" }}>{cstats.decote_vs_comparables_pct}%</span></div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-xs text-[var(--ps-muted)]">Prix médian secteur : <span className="font-semibold text-[var(--ps-text)]">{p.marche_prix_m2_median ? `${num(p.marche_prix_m2_median)} €/m²` : "—"}</span></div>
            )}
            <div className="text-[10px] font-semibold tracking-wide text-[var(--ps-muted)]">VENTES COMPARABLES (hors aberrations)</div>
            {(data.comparables || []).map((c) => (
              <div key={c.ref_cadastrale} className="flex items-center justify-between rounded-[12px] border border-[var(--ps-border)] bg-white px-3 py-2">
                <div><div className="font-mono-ps text-xs">{c.ref_cadastrale}</div><div className="text-[11px] text-[var(--ps-muted)]">{c.dvf_date_derniere_mutation} • {num(c.surface_bati_m2)} m²</div></div>
                <div className="text-sm font-semibold tabular-nums">{c.dvf_prix_m2 ? `${num(c.dvf_prix_m2)} €/m²` : "—"}</div>
              </div>
            ))}
            {(!data.comparables || data.comparables.length === 0) && <div className="text-xs text-[var(--ps-muted)]">Pas de comparables dans la zone ingestée.</div>}
          </TabsContent>

          {/* Quartier / News */}
          <TabsContent value="quartier" className="px-4 pb-4 mt-2 space-y-2" data-testid="drawer-quartier">
            <div className="text-[11px] text-[var(--ps-muted)] flex items-center gap-1.5"><Newspaper className="h-3.5 w-3.5 text-[#6366F1]" />Actualité immobilière · <span className="font-semibold text-[var(--ps-text)]">{p.commune_nom}</span></div>
            {newsLoading && <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-[12px]" />)}</div>}
            {news && news.length === 0 && !newsLoading && <div className="text-xs text-[var(--ps-muted)] py-6 text-center">Aucune actualité trouvée pour ce secteur.</div>}
            {(news || []).map((n, i) => (
              <a key={i} href={n.link} target="_blank" rel="noreferrer" data-testid="news-item" className="block rounded-[12px] border border-[var(--ps-border)] bg-white px-3 py-2 hover:border-[#6366F1] hover:shadow-[var(--ps-shadow-soft)] transition-shadow">
                <div className="text-[13px] font-medium leading-snug flex items-start gap-1.5">{n.title}<ExternalLink className="h-3 w-3 mt-0.5 shrink-0 text-[var(--ps-subtle)]" /></div>
                <div className="text-[11px] text-[var(--ps-muted)] mt-1 flex items-center justify-between"><span className="font-medium text-[#6366F1]">{n.source || "Source"}</span><span>{n.published ? n.published.replace(/\s*\d{2}:\d{2}:\d{2}.*$/, "") : ""}</span></div>
              </a>
            ))}
          </TabsContent>

          {/* Notes */}
          <TabsContent value="notes" className="px-4 pb-4 mt-2">
            <Textarea data-testid="drawer-notes" placeholder="Notes privées sur cette parcelle… (ajoutez-la à l'Execution Flow pour sauvegarder)" className="min-h-[120px]" />
          </TabsContent>
        </ScrollArea>
      </Tabs>

      {/* Action bar */}
      <div className="shrink-0 bg-white/90 backdrop-blur border-t border-[var(--ps-border)] p-3 flex items-center gap-2">
        <Button data-testid="drawer-add-to-pipeline-button" onClick={addToPipeline} className="h-10 flex-1 bg-[#6366F1] hover:bg-[#5457e0] text-white font-semibold"><GitBranch className="h-4 w-4 mr-1.5" />Ajouter au Pipeline</Button>
          <Button data-testid="drawer-create-memo-button" variant="outline" onClick={() => runAI("memo")} disabled={busy} className="h-10"><FileText className="h-4 w-4 mr-1.5" />{busy === "memo" ? "…" : "Mémo"}</Button>
        <Button variant="outline" size="icon" className="h-10 w-10" aria-label="Plus"><MoreHorizontal className="h-4 w-4" /></Button>
      </div>
      {ai.memo && (
        <div className="px-4 pb-4"><AiBlock title="Mémo d'apport" text={ai.memo} /></div>
      )}
    </div>
  );
}

function Meta({ icon: Icon, label, value }) {
  return (
    <div className="rounded-[12px] border border-[var(--ps-border)] bg-[var(--ps-surface-2)] px-2.5 py-2">
      <div className="flex items-center gap-1.5 text-[10px] text-[var(--ps-muted)]"><Icon className="h-3 w-3" />{label}</div>
      <div className="text-xs font-medium mt-0.5 truncate capitalize">{value}</div>
    </div>
  );
}

function Fin({ label, value, sub, icon: Icon, pos }) {
  return (
    <div className="px-3 py-2">
      <div className="text-[10px] text-[var(--ps-muted)] flex items-center gap-1">{Icon && <Icon className="h-3 w-3" />}{label}</div>
      <div className="text-sm font-semibold tabular-nums mt-0.5" style={pos ? { color: "#16A34A" } : undefined}>{value}</div>
      {sub && <div className="text-[10px] text-[var(--ps-subtle)] mt-0.5">{sub}</div>}
    </div>
  );
}

function AiBlock({ title, text }) {
  return (
    <div className="rounded-[14px] border border-[var(--ps-border)] bg-[var(--ps-surface-2)] p-3">
      <div className="text-[11px] font-semibold text-[var(--ps-muted)] mb-1 inline-flex items-center gap-1"><Sparkles className="h-3 w-3 text-[#6366F1]" />{title}</div>
      <div className="text-[13px] leading-6 whitespace-pre-line">{text}</div>
    </div>
  );
}

function buildRawInputs(p, signals) {
  const out = [];
  const red = "#EF4444", amber = "#F59E0B", gray = "#9CA3AF", green = "#16A34A";
  if (p.dvf_anciennete_ans != null) out.push({ label: "Durée de détention", value: `${p.dvf_anciennete_ans} ans`, color: p.dvf_anciennete_ans >= 20 ? red : p.dvf_anciennete_ans >= 10 ? amber : gray });
  if (p.dpe_classe) out.push({ label: "DPE", value: p.dpe_classe, color: ["F", "G"].includes(p.dpe_classe) ? red : p.dpe_classe === "E" ? amber : green });
  const legal = (signals || []).find((s) => (s.categorie_signal === "judiciaire") || s.type_signal?.startsWith("inpi"));
  if (legal) out.push({ label: "Événement légal", value: legal.convergence_label, color: red });
  if (p.dvf_prix_m2 && p.marche_prix_m2_median) {
    const dev = Math.round((p.dvf_prix_m2 / p.marche_prix_m2_median - 1) * 100);
    out.push({ label: "Écart de prix", value: `${dev > 0 ? "+" : ""}${dev}% vs marché`, color: dev <= -10 ? amber : gray });
  }
  if (p.plu_zone) out.push({ label: "Zone PLU", value: p.plu_zone, color: p.plu_zone_dense ? amber : gray });
  out.push({ label: "Dernière transaction", value: p.dvf_date_derniere_mutation || "—", color: gray });
  return out;
}
