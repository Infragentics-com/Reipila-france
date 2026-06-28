import { useWorkspace } from "@/context/WorkspaceContext";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import IntelligenceDrawer from "@/components/workspace/IntelligenceDrawer";

// Wraps the IntelligenceDrawer in a right-side Sheet overlay. Opens whenever a
// parcel is selected (and `enabled`). Used on list pages and on small screens.
export function IntelligenceSheet({ enabled = true }) {
  const { selectedRef, setSelectedRef } = useWorkspace();
  const open = enabled && !!selectedRef;
  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) setSelectedRef(null); }}>
      <SheetContent
        side="right"
        data-testid="intelligence-sheet"
        className="w-full sm:max-w-[460px] p-0 gap-0 overflow-hidden"
      >
        <SheetTitle className="sr-only">Détail de la parcelle</SheetTitle>
        {open && <IntelligenceDrawer hideClose />}
      </SheetContent>
    </Sheet>
  );
}
