import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import api from "@/lib/api";
import { useWorkspace } from "@/context/WorkspaceContext";
import { Layers, Plus, Minus, SlidersHorizontal, Crosshair } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const LYON = [4.8467, 45.764];
const EMPTY = { type: "FeatureCollection", features: [] };
const SELLER_TYPES = ["bodacc_liquidation", "bodacc_dissolution", "bodacc_redressement", "bodacc_radiation", "inpi_sci_cessation", "dpe_g", "dpe_f", "marche_decote_20pct", "marche_decote_30pct", "dvf_long_hold_20ans_plus"];

const STYLE = {
  version: 8,
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sources: {
    carto: { type: "raster", tiles: ["https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png", "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png", "https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"], tileSize: 256, attribution: "© OpenStreetMap © CARTO" },
    cadastre: { type: "raster", tiles: ["https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=CADASTRALPARCELS.PARCELLAIRE_EXPRESS&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/png&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}"], tileSize: 256, attribution: "© IGN" },
  },
  layers: [
    { id: "carto", type: "raster", source: "carto" },
    { id: "cadastre", type: "raster", source: "cadastre", paint: { "raster-opacity": 0.5 } },
  ],
};

const CONV_FILL = ["interpolate", ["linear"], ["get", "conviction_score"], 30, "#6366F1", 55, "#F59E0B", 85, "#EF4444"];

export default function PropMap({ showLegend = true }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const popupRef = useRef(null);
  const { selectedRef, setSelectedRef, filters, setFilters, flyTarget } = useWorkspace();
  const [ready, setReady] = useState(false);
  const [count, setCount] = useState(0);
  const [layersOn, setLayersOn] = useState({ heatmap: true, cadastre: true, markers: true });

  useEffect(() => {
    if (mapRef.current) return;
    const map = new maplibregl.Map({ container: containerRef.current, style: STYLE, center: LYON, zoom: 12.4, attributionControl: false, maxZoom: 19 });
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    mapRef.current = map;
    map.on("load", () => {
      map.addSource("ptsrc", { type: "geojson", data: EMPTY, cluster: true, clusterRadius: 46, clusterMaxZoom: 15 });
      map.addSource("heatsrc", { type: "geojson", data: EMPTY });
      map.addSource("polysrc", { type: "geojson", data: EMPTY });

      map.addLayer({ id: "conviction-heat", type: "heatmap", source: "heatsrc", maxzoom: 17, paint: {
        "heatmap-weight": ["interpolate", ["linear"], ["get", "conviction_score"], 0, 0.05, 100, 1],
        "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 11, 0.8, 16, 1.4],
        "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 11, 18, 16, 42],
        "heatmap-opacity": 0.55,
        "heatmap-color": ["interpolate", ["linear"], ["heatmap-density"], 0, "rgba(99,102,241,0)", 0.2, "rgba(99,102,241,0.35)", 0.45, "rgba(245,158,11,0.45)", 0.75, "rgba(239,68,68,0.55)", 1, "rgba(239,68,68,0.72)"],
      }});
      map.addLayer({ id: "parcels-fill", type: "fill", source: "polysrc", paint: { "fill-color": CONV_FILL, "fill-opacity": 0.18 } });
      map.addLayer({ id: "parcels-line", type: "line", source: "polysrc", paint: { "line-color": "rgba(17,24,39,0.22)", "line-width": 0.7 } });
      map.addLayer({ id: "parcels-selected", type: "line", source: "polysrc", filter: ["==", ["get", "ref_cadastrale"], "__none__"], paint: { "line-color": "#6366F1", "line-width": 2.6 } });
      map.addLayer({ id: "clusters", type: "circle", source: "ptsrc", filter: ["has", "point_count"], paint: {
        "circle-color": ["step", ["get", "point_count"], "#6366F1", 10, "#F59E0B", 25, "#EF4444"],
        "circle-radius": ["step", ["get", "point_count"], 16, 10, 20, 25, 26], "circle-opacity": 0.92,
        "circle-stroke-width": 2, "circle-stroke-color": "#fff" } });
      map.addLayer({ id: "cluster-count", type: "symbol", source: "ptsrc", filter: ["has", "point_count"], layout: { "text-field": ["get", "point_count_abbreviated"], "text-font": ["Open Sans Bold"], "text-size": 13 }, paint: { "text-color": "#fff" } });
      map.addLayer({ id: "unclustered", type: "circle", source: "ptsrc", filter: ["!", ["has", "point_count"]], paint: {
        "circle-color": CONV_FILL, "circle-radius": ["interpolate", ["linear"], ["get", "conviction_score"], 30, 5, 90, 9],
        "circle-stroke-width": 2, "circle-stroke-color": "#fff" } });

      map.on("click", "clusters", (e) => {
        const f = map.queryRenderedFeatures(e.point, { layers: ["clusters"] })[0];
        map.getSource("ptsrc").getClusterExpansionZoom(f.properties.cluster_id).then((z) => {
          map.easeTo({ center: f.geometry.coordinates, zoom: z });
        });
      });
      const selectFromEvent = (e) => { if (e.features?.[0]) setSelectedRef(e.features[0].properties.ref_cadastrale); };
      map.on("click", "unclustered", selectFromEvent);
      map.on("click", "parcels-fill", selectFromEvent);
      ["unclustered", "clusters", "parcels-fill"].forEach((l) => {
        map.on("mouseenter", l, () => (map.getCanvas().style.cursor = "pointer"));
        map.on("mouseleave", l, () => (map.getCanvas().style.cursor = ""));
      });
      map.on("mousemove", "unclustered", (e) => {
        const p = e.features[0].properties;
        if (!popupRef.current) popupRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 12 });
        popupRef.current.setLngLat(e.lngLat).setHTML(
          `<div><div style="font-size:11px;color:#6B7280">${p.commune_nom || ""}</div><div style="font-weight:600;font-size:13px;color:#111827">Conviction ${p.conviction_score}%</div><div style="font-size:11px;color:#6B7280;font-family:monospace">${p.ref_cadastrale}</div></div>`
        ).addTo(map);
      });
      map.on("mouseleave", "unclustered", () => popupRef.current?.remove());
      setReady(true);
    });
    return () => { /* keep map across re-renders */ };
  }, [setSelectedRef]);

  const fetchData = useCallback(async () => {
    const params = { min_conviction: filters.minConviction || 0, limit: 900 };
    if (filters.types?.length) params.types = filters.types.join(",");
    try {
      const { data } = await api.get("/map/parcelles", { params });
      const polys = { type: "FeatureCollection", features: (data.features || []).filter((f) => f.geometry && (f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon")) };
      const pts = { type: "FeatureCollection", features: (data.features || []).filter((f) => f.properties?.longitude && f.properties?.latitude).map((f) => ({ type: "Feature", geometry: { type: "Point", coordinates: [f.properties.longitude, f.properties.latitude] }, properties: f.properties })) };
      const map = mapRef.current;
      map.getSource("polysrc")?.setData(polys);
      map.getSource("ptsrc")?.setData(pts);
      map.getSource("heatsrc")?.setData(pts);
      setCount(pts.features.length);
    } catch (e) { /* ignore */ }
  }, [filters]);

  useEffect(() => { if (ready) fetchData(); }, [ready, fetchData]);

  useEffect(() => {
    if (!ready) return;
    mapRef.current.setFilter("parcels-selected", ["==", ["get", "ref_cadastrale"], selectedRef || "__none__"]);
  }, [selectedRef, ready]);

  useEffect(() => {
    if (ready && flyTarget) mapRef.current.flyTo({ center: [flyTarget.lon, flyTarget.lat], zoom: flyTarget.zoom || 16.5, speed: 1.2 });
  }, [flyTarget, ready]);

  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current;
    map.setLayoutProperty("conviction-heat", "visibility", layersOn.heatmap ? "visible" : "none");
    map.setLayoutProperty("cadastre", "visibility", layersOn.cadastre ? "visible" : "none");
    ["clusters", "cluster-count", "unclustered"].forEach((l) => map.setLayoutProperty(l, "visibility", layersOn.markers ? "visible" : "none"));
  }, [layersOn, ready]);

  const sellerOn = filters.types?.length > 0;
  const convOn = (filters.minConviction || 0) >= 70;
  const pill = (active) => `h-9 rounded-full border px-3 text-xs font-medium shadow-sm transition-colors ${active ? "bg-[#111827] text-white border-[#111827]" : "bg-white text-[#111827] border-[var(--ps-border)] hover:bg-[var(--ps-surface-3)]"}`;

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} data-testid="prop-map" className="absolute inset-0" />

      {/* Top filter pills */}
      <div className="absolute left-3 top-3 z-20 flex flex-wrap gap-2">
        <button data-testid="map-filter-pill-seller" className={pill(sellerOn)} onClick={() => setFilters((f) => ({ ...f, types: sellerOn ? [] : SELLER_TYPES }))}>Signaux vendeurs</button>
        <button data-testid="map-filter-pill-conviction" className={pill(convOn)} onClick={() => setFilters((f) => ({ ...f, minConviction: convOn ? 0 : 70 }))}>Conviction 70%+</button>
        <Popover>
          <PopoverTrigger asChild>
            <button data-testid="map-filter-more" className={pill(false)}><span className="inline-flex items-center gap-1.5"><SlidersHorizontal className="h-3.5 w-3.5" />Filtres</span></button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between"><Label className="text-xs">Conviction minimale</Label><span className="text-xs font-semibold tabular-nums">{filters.minConviction || 0}%</span></div>
                <Slider data-testid="filter-conviction-slider" className="mt-2" value={[filters.minConviction || 0]} min={0} max={90} step={5} onValueChange={(v) => setFilters((f) => ({ ...f, minConviction: v[0] }))} />
              </div>
              <div className="flex items-center justify-between"><Label className="text-xs">Signaux vendeurs uniquement</Label><Switch checked={sellerOn} onCheckedChange={(c) => setFilters((f) => ({ ...f, types: c ? SELLER_TYPES : [] }))} /></div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Right controls */}
      <div className="absolute right-3 top-3 z-20 flex flex-col gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <button data-testid="map-control-layers" className="h-9 w-9 rounded-[12px] border border-[var(--ps-border)] bg-white shadow-sm flex items-center justify-center hover:bg-[var(--ps-surface-3)]" aria-label="Calques"><Layers className="h-4 w-4" /></button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-56">
            <div className="space-y-3">
              <div className="text-xs font-semibold text-[var(--ps-muted)]">Calques</div>
              {[["heatmap", "Heatmap de conviction"], ["cadastre", "Cadastre (tuiles IGN)"], ["markers", "Marqueurs signaux"]].map(([k, lbl]) => (
                <div key={k} className="flex items-center justify-between"><Label className="text-xs">{lbl}</Label><Switch checked={layersOn[k]} onCheckedChange={(c) => setLayersOn((s) => ({ ...s, [k]: c }))} /></div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <button data-testid="map-control-recenter" onClick={() => mapRef.current?.flyTo({ center: LYON, zoom: 12.4 })} className="h-9 w-9 rounded-[12px] border border-[var(--ps-border)] bg-white shadow-sm flex items-center justify-center hover:bg-[var(--ps-surface-3)]" aria-label="Recentrer"><Crosshair className="h-4 w-4" /></button>
        <div className="rounded-[12px] border border-[var(--ps-border)] bg-white shadow-sm overflow-hidden">
          <button data-testid="map-control-zoom-in" onClick={() => mapRef.current?.zoomIn()} className="h-9 w-9 flex items-center justify-center hover:bg-[var(--ps-surface-3)] border-b border-[var(--ps-border)]"><Plus className="h-4 w-4" /></button>
          <button data-testid="map-control-zoom-out" onClick={() => mapRef.current?.zoomOut()} className="h-9 w-9 flex items-center justify-center hover:bg-[var(--ps-surface-3)]"><Minus className="h-4 w-4" /></button>
        </div>
      </div>

      {/* Legend */}
      {showLegend && (
        <div data-testid="map-heatmap-legend" className="absolute left-3 bottom-6 z-20 rounded-[14px] border border-[var(--ps-border)] bg-white/90 backdrop-blur px-3 py-2 shadow-sm">
          <div className="text-[11px] font-semibold text-[var(--ps-text)] mb-1">Heatmap de conviction <span className="text-[var(--ps-muted)] font-normal">• {count} parcelles</span></div>
          <div className="h-2 w-[170px] rounded-full" style={{ background: "linear-gradient(90deg, rgba(99,102,241,0.6), rgba(245,158,11,0.7), rgba(239,68,68,0.85))" }} />
          <div className="flex justify-between text-[10px] text-[var(--ps-muted)] mt-1"><span>Faible</span><span>Très élevée</span></div>
        </div>
      )}
    </div>
  );
}
