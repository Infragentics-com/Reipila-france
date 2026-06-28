import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { useWorkspace } from "@/context/WorkspaceContext";
import { IntelligenceSheet } from "@/components/workspace/IntelligenceSheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { convictionColor } from "@/lib/format";
import { toast } from "sonner";
import { GitBranch, Trash2 } from "lucide-react";

const COLS = [
  { id: "sourced", l: "Sourcé" },
  { id: "qualified", l: "Qualifié" },
  { id: "contact_strategy", l: "Stratégie contact" },
  { id: "dd", l: "Due Diligence" },
  { id: "offer", l: "Offre" },
  { id: "closed", l: "Clôturé" },
];

export default function PipelinePage() {
  const { setSelectedRef } = useWorkspace();
  const [items, setItems] = useState(null);

  const load = useCallback(() => {
    api.get("/pipeline").then(({ data }) => setItems(data.pipeline || [])).catch(() => setItems([]));
  }, []);
  useEffect(() => { load(); }, [load]);

  const move = async (id, status) => {
    try {
      await api.patch(`/pipeline/${id}`, { status });
      setItems((arr) => arr.map((it) => (it.id === id ? { ...it, status } : it)));
      toast.success("Étape mise à jour");
    } catch (e) { toast.error("Échec de la mise à jour"); }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/pipeline/${id}`);
      setItems((arr) => arr.filter((it) => it.id !== id));
      toast.success("Retiré du pipeline");
    } catch (e) { toast.error("Échec de la suppression"); }
  };

  const byStatus = (st) => (items || []).filter((it) => (it.status || "sourced") === st);

  return (
    <div className="h-full flex flex-col p-3 md:p-4" data-testid="pipeline-page">
      <div className="rounded-[18px] bg-white border border-[var(--ps-border)] flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-[var(--ps-border)]">
          <h1 className="font-display text-lg font-bold flex items-center gap-2"><GitBranch className="h-5 w-5 text-[#6366F1]" />Execution Flow</h1>
          <p className="text-xs text-[var(--ps-muted)] mt-0.5">Suivi des parcelles à acquérir — de la détection à la clôture</p>
        </div>
        <ScrollArea className="flex-1 ps-scroll">
          {items === null ? (
            <div className="p-4 grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3">
              {COLS.map((c) => <Skeleton key={c.id} data-testid="loading-skeleton" className="h-[200px] rounded-[16px]" />)}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-20 px-6" data-testid="pipeline-empty">
              <GitBranch className="h-8 w-8 mx-auto text-[var(--ps-subtle)] mb-3" />
              <div className="text-sm font-medium">Pipeline vide</div>
              <div className="text-xs text-[var(--ps-muted)] mt-1">Ajoutez des parcelles depuis la carte, les signaux ou les opportunités.</div>
            </div>
          ) : (
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-3 items-start">
              {COLS.map((col) => {
                const list = byStatus(col.id);
                return (
                  <div key={col.id} data-testid={`pipeline-col-${col.id}`} className="rounded-[16px] border border-[var(--ps-border)] bg-[var(--ps-surface-2)]">
                    <div className="px-3 py-2 border-b border-[var(--ps-border)] flex items-center justify-between">
                      <span className="text-xs font-semibold">{col.l}</span>
                      <span className="text-[10px] font-medium text-[var(--ps-muted)] tabular-nums bg-white rounded-full px-1.5 border border-[var(--ps-border)]">{list.length}</span>
                    </div>
                    <div className="p-2 space-y-2 min-h-[60px]">
                      {list.map((it) => {
                        const p = it.parcelle || {};
                        return (
                          <div key={it.id} data-testid="execution-flow-item" className="rounded-[14px] border border-[var(--ps-border)] bg-white p-2.5 hover:shadow-[var(--ps-shadow-soft)] transition-shadow">
                            <div className="flex items-start justify-between gap-2">
                              <button onClick={() => setSelectedRef(it.ref_cadastrale)} className="text-left min-w-0" data-testid="pipeline-item-open">
                                <div className="text-sm font-semibold truncate">{p.commune_nom || "—"}</div>
                                <div className="text-[11px] text-[var(--ps-muted)] font-mono-ps truncate">{it.ref_cadastrale}</div>
                              </button>
                              <div className="text-sm font-bold tabular-nums shrink-0" style={{ color: convictionColor(p.conviction_score) }}>{p.conviction_score != null ? `${p.conviction_score}%` : "—"}</div>
                            </div>
                            <div className="mt-2 flex items-center gap-1.5">
                              <Select value={it.status} onValueChange={(v) => move(it.id, v)}>
                                <SelectTrigger className="h-7 text-[11px] flex-1" data-testid="pipeline-status-select"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {COLS.map((c) => <SelectItem key={c.id} value={c.id}>{c.l}</SelectItem>)}
                                </SelectContent>
                              </Select>
                              <button data-testid="pipeline-remove" onClick={() => remove(it.id)} className="h-7 w-7 shrink-0 rounded-[8px] border border-[var(--ps-border)] bg-white flex items-center justify-center hover:bg-[var(--ps-critical)]/10 hover:border-[var(--ps-critical)]/30 hover:text-[var(--ps-critical)] transition-colors" aria-label="Retirer"><Trash2 className="h-3.5 w-3.5" /></button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>
      <IntelligenceSheet />
    </div>
  );
}
