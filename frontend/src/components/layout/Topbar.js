import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import api from "@/lib/api";
import { Activity, Search, Bell, ChevronDown, LogOut, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";

export default function Topbar() {
  const { user, logout } = useAuth();
  const { setSelectedRef, setFlyTarget } = useWorkspace();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const tRef = useRef(null);

  useEffect(() => {
    if (!q || q.length < 2) { setResults([]); setOpen(false); return; }
    clearTimeout(tRef.current);
    tRef.current = setTimeout(async () => {
      try {
        const { data } = await api.get("/search", { params: { q } });
        const items = [...(data.results || [])];
        if (data.geocode) items.push({ ...data.geocode, type: "geocode" });
        setResults(items);
        setOpen(true);
      } catch (e) { /* ignore */ }
    }, 280);
  }, [q]);

  const pick = (item) => {
    setOpen(false); setQ("");
    if (item.longitude && item.latitude) setFlyTarget({ lon: item.longitude, lat: item.latitude, zoom: 17 });
    if (item.type === "parcelle") { setSelectedRef(item.ref_cadastrale); navigate("/map"); }
    else navigate("/map");
  };

  const initials = (user?.name || "U").split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();

  return (
    <header className="relative z-50 h-16 shrink-0 bg-white border-b border-[var(--ps-border)] flex items-center gap-4 px-4">
      <div className="flex items-center gap-2 w-[200px]">
        <div className="h-8 w-8 rounded-[10px] bg-[#6366F1] flex items-center justify-center"><Activity className="h-4 w-4 text-white" /></div>
        <div className="font-display text-lg font-bold tracking-tight lowercase">reipila</div>
      </div>

      <div className="flex-1 flex justify-center">
        <div className="relative w-full max-w-[720px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--ps-subtle)]" />
          <input
            data-testid="topbar-global-search-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => results.length && setOpen(true)}
            placeholder="Rechercher une adresse, parcelle, propriétaire ou zone…"
            className="h-11 w-full rounded-[12px] bg-white border border-[var(--ps-border)] pl-10 pr-4 text-sm shadow-[0_1px_0_rgba(17,24,39,0.04)] focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
          />
          {open && results.length > 0 && (
            <div className="absolute z-50 mt-2 w-full rounded-[14px] border border-[var(--ps-border)] bg-white shadow-[var(--ps-shadow-panel)] overflow-hidden">
              {results.map((r, i) => (
                <button key={i} data-testid="search-result-item" onClick={() => pick(r)} className="w-full text-left px-3 py-2.5 hover:bg-[var(--ps-surface-3)] flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{r.type === "geocode" ? r.label : (r.adresse_ban || r.ref_cadastrale)}</div>
                    <div className="text-xs text-[var(--ps-muted)]">{r.type === "geocode" ? "Localiser sur la carte" : `${r.commune_nom || ""} • ${r.ref_cadastrale}`}</div>
                  </div>
                  {r.conviction_score != null && <span className="text-sm font-semibold tabular-nums">{r.conviction_score}%</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 w-[260px] justify-end">
        <button data-testid="topbar-notifications-button" className="relative h-9 w-9 rounded-[10px] border border-[var(--ps-border)] bg-white flex items-center justify-center hover:bg-[var(--ps-surface-3)]" aria-label="Notifications">
          <Bell className="h-4 w-4 text-[var(--ps-text)]" />
          <Badge className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 bg-[#6366F1] text-white text-[10px]">12</Badge>
        </button>
        <div data-testid="topbar-market-pulse-pill" className="hidden md:inline-flex items-center gap-2 rounded-full border border-[var(--ps-border)] bg-white px-3 py-1.5 text-xs font-medium">
          <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A] ps-live-dot" />
          Market Pulse <span className="text-[var(--ps-muted)]">• Live</span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button data-testid="topbar-user-menu" className="flex items-center gap-2 rounded-[10px] hover:bg-[var(--ps-surface-3)] px-1.5 py-1">
              <div className="h-8 w-8 rounded-full bg-[#6366F1] text-white text-xs font-semibold flex items-center justify-center">{initials}</div>
              <ChevronDown className="h-4 w-4 text-[var(--ps-muted)]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>
              <div className="text-sm font-semibold">{user?.name}</div>
              <div className="text-xs text-[var(--ps-muted)] font-normal">{user?.plan}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/settings")}><User className="h-4 w-4 mr-2" />Paramètres</DropdownMenuItem>
            <DropdownMenuItem data-testid="logout-button" onClick={logout}><LogOut className="h-4 w-4 mr-2" />Déconnexion</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
