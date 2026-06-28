import { NavLink } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Home, Radar, Boxes, Map, GitBranch, BarChart3, Settings, HelpCircle } from "lucide-react";

const NAV = [
  { to: "/", label: "Accueil", icon: Home, id: "home", end: true },
  { to: "/signals", label: "Signaux", icon: Radar, id: "signals" },
  { to: "/opportunities", label: "Opportunités", icon: Boxes, id: "opportunities" },
  { to: "/map", label: "Carte", icon: Map, id: "map" },
  { to: "/pipeline", label: "Pipeline", icon: GitBranch, id: "pipeline" },
  { to: "/market", label: "Marché", icon: BarChart3, id: "market" },
];

export default function Sidebar() {
  const { user } = useAuth();
  const initials = (user?.name || "U").split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();
  const item = (active) =>
    `group w-full flex flex-col items-center gap-1 rounded-[12px] px-2 py-2.5 text-[11px] font-medium transition-colors ${active ? "text-[#111827] bg-[var(--ps-surface-3)]" : "text-[var(--ps-muted)] hover:text-[#111827] hover:bg-[var(--ps-surface-3)]"}`;
  return (
    <aside className="w-[92px] shrink-0 bg-white border-r border-[var(--ps-border)] flex flex-col items-center py-3">
      <nav className="flex-1 w-full px-2 space-y-1">
        {NAV.map((n) => (
          <NavLink key={n.id} to={n.to} end={n.end} data-testid={`sidebar-nav-${n.id}`} className={({ isActive }) => item(isActive)}>
            {({ isActive }) => (
              <span className={`relative w-full flex flex-col items-center gap-1 ${isActive ? "before:absolute before:-left-2 before:top-1 before:bottom-1 before:w-[3px] before:rounded-full before:bg-[#6366F1]" : ""}`}>
                <n.icon className="h-5 w-5" />
                <span>{n.label}</span>
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="w-full px-2 space-y-1">
        <NavLink to="/settings" data-testid="sidebar-nav-settings" className={({ isActive }) => item(isActive)}>
          <Settings className="h-5 w-5" /><span>Réglages</span>
        </NavLink>
        <div className={item(false)} title="Aide"><HelpCircle className="h-5 w-5" /><span>Aide</span></div>
        <div className="pt-2 flex justify-center">
          <div className="h-9 w-9 rounded-full bg-[#6366F1] text-white text-xs font-semibold flex items-center justify-center" title={user?.name}>{initials}</div>
        </div>
      </div>
    </aside>
  );
}
