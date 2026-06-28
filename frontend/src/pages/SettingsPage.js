import { useEffect, useState, useCallback, useRef } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Settings, Database, Play, RefreshCw, User2, LogOut, Loader2 } from "lucide-react";
import { timeAgo } from "@/lib/format";

const STATUS_STYLE = {
  success: { c: "#16A34A", bg: "rgba(22,163,74,0.10)" },
  running: { c: "#6366F1", bg: "rgba(99,102,241,0.10)" },
  error: { c: "#EF4444", bg: "rgba(239,68,68,0.10)" },
};

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [communes, setCommunes] = useState([]);
  const [selected, setSelected] = useState("");
  const [status, setStatus] = useState(null);
  const [runs, setRuns] = useState([]);
  const [starting, setStarting] = useState(false);
  const pollRef = useRef(null);

  const loadCommunes = useCallback(() => {
    api.get("/communes").then(({ data }) => setCommunes(data.communes || [])).catch(() => {});
  }, []);
  const loadStatus = useCallback(() => {
    api.get("/ingest/status").then(({ data }) => setStatus(data)).catch(() => {});
    api.get("/ingest/runs").then(({ data }) => setRuns(data.runs || [])).catch(() => {});
  }, []);

  useEffect(() => { loadCommunes(); loadStatus(); }, [loadCommunes, loadStatus]);

  useEffect(() => {
    const running = (status?.running || []).length > 0;
    clearInterval(pollRef.current);
    if (running) pollRef.current = setInterval(loadStatus, 4000);
    return () => clearInterval(pollRef.current);
  }, [status, loadStatus]);

  const startIngestion = async () => {
    if (!selected) { toast.error("Sélectionnez une commune"); return; }
    setStarting(true);
    try {
      const { data } = await api.post("/ingest", { code_insee: selected });
      if (data.status === "started") toast.success(`Ingestion lancée · ${data.commune || selected}`);
      else if (data.status === "already_running") toast.info("Ingestion déjà en cours pour cette commune");
      setTimeout(loadStatus, 1200);
    } catch (e) { toast.error(e?.response?.data?.detail || "Échec du lancement"); }
    finally { setStarting(false); }
  };

  const running = status?.running || [];

  return (
    <div className="h-full p-3 md:p-4" data-testid="settings-page">
      <ScrollArea className="h-full ps-scroll">
        <div className="max-w-[1100px] space-y-4">
          <div>
            <h1 className="font-display text-lg font-bold flex items-center gap-2"><Settings className="h-5 w-5 text-[#6366F1]" />Réglages</h1>
            <p className="text-xs text-[var(--ps-muted)] mt-0.5">Compte et pilotage de l'ingestion de données ouvertes</p>
          </div>

          {/* Account */}
          <div className="rounded-[18px] bg-white border border-[var(--ps-border)] p-4">
            <div className="text-sm font-semibold mb-3 flex items-center gap-2"><User2 className="h-4 w-4 text-[#6366F1]" />Compte</div>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-[#6366F1] text-white text-base font-semibold flex items-center justify-center">{(user?.name || "U").split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase()}</div>
              <div className="flex-1">
                <div className="text-sm font-semibold">{user?.name}</div>
                <div className="text-xs text-[var(--ps-muted)]">{user?.email}</div>
              </div>
              <Badge className="bg-[#6366F1]/10 text-[#6366F1] border border-[#6366F1]/20">{user?.plan || "Pro Plan"}</Badge>
              <Button data-testid="settings-logout-button" variant="outline" onClick={logout} className="h-9"><LogOut className="h-4 w-4 mr-1.5" />Déconnexion</Button>
            </div>
          </div>

          {/* Ingestion */}
          <div className="rounded-[18px] bg-white border border-[var(--ps-border)] p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold flex items-center gap-2"><Database className="h-4 w-4 text-[#6366F1]" />Ingestion de données (data.gouv.fr)</div>
              <button data-testid="settings-refresh-status" onClick={loadStatus} className="h-8 w-8 rounded-[10px] border border-[var(--ps-border)] bg-white flex items-center justify-center hover:bg-[var(--ps-surface-3)]" aria-label="Rafraîchir"><RefreshCw className="h-4 w-4" /></button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
              <div className="rounded-[12px] border border-[var(--ps-border)] bg-[var(--ps-surface-2)] px-3 py-2">
                <div className="text-[11px] text-[var(--ps-muted)]">Parcelles totales</div>
                <div className="text-lg font-semibold tabular-nums">{status?.total_parcelles ?? "—"}</div>
              </div>
              <div className="rounded-[12px] border border-[var(--ps-border)] bg-[var(--ps-surface-2)] px-3 py-2">
                <div className="text-[11px] text-[var(--ps-muted)]">Communes ingestées</div>
                <div className="text-lg font-semibold tabular-nums">{status?.communes_ingested ?? "—"}</div>
              </div>
              <div className="rounded-[12px] border border-[var(--ps-border)] bg-[var(--ps-surface-2)] px-3 py-2">
                <div className="text-[11px] text-[var(--ps-muted)]">En cours</div>
                <div className="text-lg font-semibold tabular-nums flex items-center gap-1.5">{running.length}{running.length > 0 && <Loader2 className="h-3.5 w-3.5 animate-spin text-[#6366F1]" />}</div>
              </div>
            </div>

            <div className="flex items-end gap-2">
              <div className="flex-1">
                <div className="text-[11px] text-[var(--ps-muted)] mb-1">Commune à ingérer</div>
                <Select value={selected} onValueChange={setSelected}>
                  <SelectTrigger className="h-9" data-testid="settings-commune-select"><SelectValue placeholder="Sélectionner une commune…" /></SelectTrigger>
                  <SelectContent className="max-h-[320px]">
                    {communes.map((c) => (
                      <SelectItem key={c.code_insee} value={c.code_insee}>{c.nom}{c.nb_parcelles ? ` · ${c.nb_parcelles} parcelles` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button data-testid="settings-start-ingestion" onClick={startIngestion} disabled={starting || !selected} className="h-9 bg-[#6366F1] hover:bg-[#5457e0] text-white font-semibold">
                {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Play className="h-4 w-4 mr-1.5" />Lancer</>}
              </Button>
            </div>
            <p className="text-[11px] text-[var(--ps-muted)] mt-2">L'ingestion récupère DVF, BODACC, DPE, PLU, Géorisques et cadastre en temps réel, puis calcule les scores de conviction. Comptez 30–90s par commune.</p>
          </div>

          {/* Runs */}
          <div className="rounded-[18px] bg-white border border-[var(--ps-border)] overflow-hidden">
            <div className="p-4 border-b border-[var(--ps-border)] text-sm font-semibold">Historique des ingestions</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="settings-runs-table">
                <thead>
                  <tr className="text-left text-[11px] text-[var(--ps-muted)] border-b border-[var(--ps-border)]">
                    <th className="font-medium px-4 py-2">Commune</th>
                    <th className="font-medium px-4 py-2">Statut</th>
                    <th className="font-medium px-4 py-2 text-right">Parcelles</th>
                    <th className="font-medium px-4 py-2 text-right">Signaux</th>
                    <th className="font-medium px-4 py-2 text-right">Appels API</th>
                    <th className="font-medium px-4 py-2 text-right">Quand</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((r) => {
                    const st = STATUS_STYLE[r.status] || STATUS_STYLE.running;
                    return (
                      <tr key={r.id} className="border-b border-[var(--ps-border)] last:border-0 hover:bg-[var(--ps-surface-2)]">
                        <td className="px-4 py-2.5 font-medium">{r.commune_nom || r.code_insee}</td>
                        <td className="px-4 py-2.5"><span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ color: st.c, background: st.bg }}>{r.status}</span></td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{r.parcelles_created ?? "—"}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{r.signals_created ?? "—"}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{r.api_calls_made ?? "—"}</td>
                        <td className="px-4 py-2.5 text-right text-[var(--ps-muted)]">{timeAgo(r.started_at)}</td>
                      </tr>
                    );
                  })}
                  {runs.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-[var(--ps-muted)]">Aucune ingestion enregistrée.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
