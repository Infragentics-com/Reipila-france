import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useWorkspace } from "@/context/WorkspaceContext";
import { toast } from "sonner";
import { X, Building2, Ruler, User2, CalendarClock, Sparkles, FileText, MoreHorizontal, CheckCircle2, GitBranch, Loader2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { SEVERITY, convictionColor, money, num, WEIGHT_LABEL_STYLE, OPP_LABEL } from "@/lib/format";

function Dot({ color }) { return <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />; }

export default function IntelligenceDrawer({ hideClose = false }) {
  const { selectedRef, setSelectedRef } = useWorkspace();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ai, setAi] = useState({});
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    if (!selectedRef) { setData(null); return; }
    setLoading(true); setAi({});
    api.get(`/parcelles/${selectedRef}`).then(({ data }) => {
      setData(data);
      if (data.convergence_log?.claude_interpretation) setAi((a) => ({ ...a, interpret: data.convergence_log.claude_interpretation }));
    }).catch(() => toast.error("Parcelle introuvable")).finally(() => setLoading(false));
  }, [selectedRef]);

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

      <Tabs defaultValue="overview" className="flex-1 min-h-0 flex flex-col">
        <TabsList className="mx-4 mt-2 justify-start bg-[var(--ps-surface-3)]">
          {["overview", "signals", "analysis", "comparables", "notes"].map((t) => (
            <TabsTrigger key={t} value={t} data-testid={`drawer-tab-${t}`} className="text-xs capitalize">{{ overview: "Aperçu", signals: "Signaux", analysis: "Analyse", comparables: "Comparables", notes: "Notes" }[t]}</TabsTrigger>
          ))}
        </TabsList>

        <ScrollArea className="flex-1 ps-scroll">
          {/* Overview */}
          <TabsContent value="overview" className="px-4 pb-4 mt-2 space-y-4">
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
            <div className="flex gap-2">
              <Button data-testid="ai-interpret-button" size="sm" onClick={() => runAI("interpret")} disabled={busy} className="bg-[#6366F1] hover:bg-[#5457e0] text-white"><Sparkles className="h-4 w-4 mr-1.5" />{busy === "interpret" ? "Analyse…" : "Interprétation IA"}</Button>
              <Button data-testid="ai-pitch-button" size="sm" variant="outline" onClick={() => runAI("pitch")} disabled={busy}>{busy === "pitch" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Pitch d'approche"}</Button>
            </div>
            {ai.interpret && <AiBlock title="Interprétation analyste (Claude)" text={ai.interpret} />}
            {ai.pitch && <AiBlock title="Pitch d'approche" text={ai.pitch} />}
            {!ai.interpret && !ai.pitch && <div className="text-xs text-[var(--ps-muted)]">Générez une interprétation narrative et un pitch d'approche, ancrés sur le log de convergence.</div>}
          </TabsContent>

          {/* Comparables */}
          <TabsContent value="comparables" className="px-4 pb-4 mt-2 space-y-2">
            <div className="text-xs text-[var(--ps-muted)]">Prix médian secteur : <span className="font-semibold text-[var(--ps-text)]">{p.marche_prix_m2_median ? `${num(p.marche_prix_m2_median)} €/m²` : "—"}</span> (P25 {num(p.marche_prix_m2_p25)} • P75 {num(p.marche_prix_m2_p75)})</div>
            {(data.comparables || []).map((c) => (
              <div key={c.ref_cadastrale} className="flex items-center justify-between rounded-[12px] border border-[var(--ps-border)] bg-white px-3 py-2">
                <div><div className="font-mono-ps text-xs">{c.ref_cadastrale}</div><div className="text-[11px] text-[var(--ps-muted)]">{c.dvf_date_derniere_mutation} • {num(c.surface_bati_m2)} m²</div></div>
                <div className="text-sm font-semibold tabular-nums">{c.dvf_prix_m2 ? `${num(c.dvf_prix_m2)} €/m²` : "—"}</div>
              </div>
            ))}
            {(!data.comparables || data.comparables.length === 0) && <div className="text-xs text-[var(--ps-muted)]">Pas de comparables dans la zone ingestée.</div>}
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
