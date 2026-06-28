import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Activity, ArrowRight, Radar, Layers, ShieldCheck } from "lucide-react";

export default function Login() {
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("demo@reipila.com");
  const [password, setPassword] = useState("demo1234");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") await login(email, password);
      else await signup(email, password, name || "Analyste");
      toast.success("Connexion réussie");
      navigate("/");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Échec de l'authentification");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[var(--ps-bg)]">
      {/* Brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-10 overflow-hidden bg-white border-r border-[var(--ps-border)]">
        <div className="absolute inset-0" style={{ background: "radial-gradient(620px circle at 18% 0%, rgba(99,102,241,0.10), transparent 55%)" }} />
        <div className="relative">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-[12px] bg-[#6366F1] flex items-center justify-center">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div className="font-display text-xl font-bold tracking-tight lowercase">reipila</div>
          </div>
          <h1 className="mt-16 font-display text-4xl font-bold leading-tight max-w-md">Le système d'exploitation de l'intelligence immobilière.</h1>
          <p className="mt-4 text-[var(--ps-muted)] max-w-md leading-6">Détectez les signaux vendeurs et les opportunités off-market sur la Métropole de Lyon — avant le marché. Données publiques françaises, raisonnement transparent.</p>
        </div>
        <div className="relative grid grid-cols-1 gap-3 max-w-md">
          {[[Radar, "Signaux vendeurs", "BODACC, DPE, DVF, INSEE, PLU, Géorisques"], [Layers, "Carte cadastrale", "Parcelles indexées + heatmap de conviction"], [ShieldCheck, "Convergence transparente", "Log de raisonnement étape par étape"]].map(([Icon, t, d], i) => (
            <div key={i} className="flex items-start gap-3 rounded-[14px] border border-[var(--ps-border)] bg-[var(--ps-surface-2)] px-3 py-3">
              <Icon className="h-4 w-4 mt-0.5 text-[#6366F1]" />
              <div><div className="text-sm font-semibold">{t}</div><div className="text-xs text-[var(--ps-muted)]">{d}</div></div>
            </div>
          ))}
        </div>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="h-9 w-9 rounded-[12px] bg-[#6366F1] flex items-center justify-center"><Activity className="h-5 w-5 text-white" /></div>
            <div className="font-display text-xl font-bold lowercase">reipila</div>
          </div>
          <h2 className="font-display text-2xl font-bold">{mode === "login" ? "Connexion" : "Créer un compte"}</h2>
          <p className="text-sm text-[var(--ps-muted)] mt-1">Accédez à votre flux d'intelligence marchand.</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Nom</Label>
                <Input id="name" data-testid="signup-name-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Votre nom" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" data-testid="login-email-input" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Mot de passe</Label>
              <Input id="password" type="password" data-testid="login-password-input" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" disabled={busy} data-testid="login-submit-button" className="w-full h-11 bg-[#6366F1] hover:bg-[#5457e0] text-white font-semibold">
              {busy ? "Veuillez patienter…" : (mode === "login" ? "Se connecter" : "Créer le compte")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>

          <div className="mt-4 text-sm text-[var(--ps-muted)]">
            {mode === "login" ? "Pas encore de compte ?" : "Déjà inscrit ?"}{" "}
            <button data-testid="toggle-auth-mode" className="text-[#6366F1] font-medium" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
              {mode === "login" ? "Créer un compte" : "Se connecter"}
            </button>
          </div>
          <div className="mt-6 rounded-[12px] border border-[var(--ps-border)] bg-[var(--ps-surface-2)] px-3 py-2 text-xs text-[var(--ps-muted)]">
            Démo : <span className="font-mono-ps text-[var(--ps-text)]">demo@reipila.com</span> / <span className="font-mono-ps text-[var(--ps-text)]">demo1234</span>
          </div>
        </div>
      </div>
    </div>
  );
}
