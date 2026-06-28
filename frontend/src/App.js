import { useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Toaster } from "@/components/ui/sonner";
import Login from "@/pages/Login";
import AppShell from "@/components/layout/AppShell";
import Home from "@/pages/Home";
import MapPage from "@/pages/MapPage";
import SignalsPage from "@/pages/SignalsPage";
import OpportunitiesPage from "@/pages/OpportunitiesPage";
import PipelinePage from "@/pages/PipelinePage";
import MarketPage from "@/pages/MarketPage";
import SettingsPage from "@/pages/SettingsPage";

function Protected({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--ps-bg)]">
        <div className="text-sm text-[var(--ps-muted)]">Chargement de l'intelligence marché…</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              element={
                <Protected>
                  <AppShell />
                </Protected>
              }
            >
              <Route path="/" element={<Home />} />
              <Route path="/map" element={<MapPage />} />
              <Route path="/signals" element={<SignalsPage />} />
              <Route path="/opportunities" element={<OpportunitiesPage />} />
              <Route path="/pipeline" element={<PipelinePage />} />
              <Route path="/market" element={<MarketPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </div>
  );
}

export default App;
