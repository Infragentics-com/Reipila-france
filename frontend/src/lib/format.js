// Shared formatting + visual helpers for PropSignal v2

export const SEVERITY = {
  high_conviction: { label: "HIGH CONVICTION", color: "#EF4444", bg: "rgba(239,68,68,0.10)", border: "rgba(239,68,68,0.22)" },
  convergence_event: { label: "CONVERGENCE EVENT", color: "#6366F1", bg: "rgba(99,102,241,0.10)", border: "rgba(99,102,241,0.22)" },
  new_signal: { label: "NEW SIGNAL", color: "#16A34A", bg: "rgba(22,163,74,0.10)", border: "rgba(22,163,74,0.22)" },
  market_anomaly: { label: "MARKET ANOMALY", color: "#B45309", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.26)" },
};

export const LEVEL_LABEL = {
  critical: "CRITICAL", high: "HIGH CONVICTION", medium: "MEDIUM", low: "LOW", monitoring: "WATCH LIST",
};

export function convictionColor(s) {
  if (s == null) return "#9CA3AF";
  if (s >= 85) return "#DC2626";
  if (s >= 70) return "#EF4444";
  if (s >= 55) return "#F59E0B";
  if (s >= 40) return "#6366F1";
  return "#9CA3AF";
}

export function timeAgo(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  return `il y a ${Math.floor(diff / 86400)} j`;
}

export function money(n) {
  if (n == null || isNaN(n)) return "—";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

export function num(n, suffix = "") {
  if (n == null || isNaN(n)) return "—";
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n) + suffix;
}

export const WEIGHT_LABEL_STYLE = {
  "CRITICAL SIGNAL": { color: "#DC2626", bg: "rgba(239,68,68,0.10)" },
  "HIGH WEIGHT": { color: "#B45309", bg: "rgba(245,158,11,0.12)" },
  "RECENCY BOOST": { color: "#15803D", bg: "rgba(22,163,74,0.10)" },
  STANDARD: { color: "#6B7280", bg: "rgba(107,114,128,0.08)" },
};

export const OPP_LABEL = {
  market_discount: "Décote marché", dpe_renovation: "Rénovation DPE",
  land_division: "Division foncière", destination_change: "Changement destination",
  income_building: "Immeuble de rapport", distressed_seller: "Vendeur en difficulté",
  pm_liquidation: "Liquidation PM", urban_fallow: "Friche urbaine", extension_potential: "Potentiel extension",
};
