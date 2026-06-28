import PropMap from "@/components/workspace/PropMap";
import IntelligenceDrawer from "@/components/workspace/IntelligenceDrawer";
import { IntelligenceSheet } from "@/components/workspace/IntelligenceSheet";
import { StatTiles } from "@/components/workspace/StatTiles";
import { LiveFeed } from "@/components/workspace/LiveFeed";
import { useMediaQuery } from "@/hooks/use-media-query";

export default function Home() {
  const isXl = useMediaQuery("(min-width: 1280px)");
  return (
    <div className="h-full p-3 md:p-4" data-testid="home-page">
      <div className="h-full grid grid-cols-1 lg:grid-cols-[360px_1fr] xl:grid-cols-[400px_1fr_460px] gap-3 md:gap-4 min-h-0">
        {/* Left panel: stats + live feed */}
        <div className="hidden lg:flex flex-col min-h-0 rounded-[18px] bg-white border border-[var(--ps-border)] overflow-hidden">
          <div className="p-3 border-b border-[var(--ps-border)]">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold">Flux marché en direct</h2>
              <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--ps-muted)]"><span className="h-1.5 w-1.5 rounded-full bg-[#16A34A] ps-live-dot" />Live</span>
            </div>
            <div className="mt-3"><StatTiles /></div>
          </div>
          <div className="flex-1 min-h-0 p-2"><LiveFeed /></div>
        </div>

        {/* Center: map */}
        <div className="relative min-h-0 rounded-[18px] overflow-hidden bg-white border border-[var(--ps-border)]">
          <PropMap />
        </div>

        {/* Right: persistent intelligence drawer (xl+) */}
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
