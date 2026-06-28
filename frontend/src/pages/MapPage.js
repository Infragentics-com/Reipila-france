import PropMap from "@/components/workspace/PropMap";
import IntelligenceDrawer from "@/components/workspace/IntelligenceDrawer";
import { IntelligenceSheet } from "@/components/workspace/IntelligenceSheet";
import { useMediaQuery } from "@/hooks/use-media-query";

export default function MapPage() {
  const isXl = useMediaQuery("(min-width: 1280px)");
  return (
    <div className="h-full p-3 md:p-4" data-testid="map-page">
      <div className="h-full grid grid-cols-1 xl:grid-cols-[1fr_460px] gap-3 md:gap-4 min-h-0">
        <div className="relative min-h-0 rounded-[18px] overflow-hidden bg-white border border-[var(--ps-border)]">
          <PropMap />
        </div>
        {isXl && (
          <aside data-testid="intelligence-drawer-panel" className="min-h-0 rounded-[18px] bg-white border border-[var(--ps-border)] overflow-hidden">
            <IntelligenceDrawer />
          </aside>
        )}
      </div>
      <IntelligenceSheet enabled={!isXl} />
    </div>
  );
}
