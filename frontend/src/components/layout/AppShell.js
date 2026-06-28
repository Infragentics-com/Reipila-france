import { Outlet } from "react-router-dom";
import { WorkspaceProvider } from "@/context/WorkspaceContext";
import Topbar from "@/components/layout/Topbar";
import Sidebar from "@/components/layout/Sidebar";

export default function AppShell() {
  return (
    <WorkspaceProvider>
      <div className="h-screen flex flex-col bg-[var(--ps-bg)] overflow-hidden">
        <Topbar />
        <div className="flex-1 flex min-h-0">
          <Sidebar />
          <main className="flex-1 min-w-0 min-h-0">
            <Outlet />
          </main>
        </div>
      </div>
    </WorkspaceProvider>
  );
}
