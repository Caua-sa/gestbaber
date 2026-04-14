import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { AppLayout } from "@/components/AppLayout";
import Index from "./pages/Index";
import Agendamento from "./pages/Agendamento";
import Assinaturas from "./pages/Assinaturas";
import Financeiro from "./pages/Financeiro";
import Estoque from "./pages/Estoque";
import LandingPage from "./pages/LandingPage";
import AdminLanding from "./pages/admin/AdminLanding";
import AdminBannerAI from "./pages/admin/AdminBannerAI";
import AdminUsuarios from "./pages/admin/AdminUsuarios";
import AdminLogin from "./pages/admin/Login";
import ClienteLogin from "./pages/cliente/Login";
import ClientePortal from "./pages/cliente/Portal";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedClientRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Carregando...</div>;
  if (!user) return <Navigate to="/cliente/login" replace />;
  return <>{children}</>;
}

function ProtectedAdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();

  if (loading || roleLoading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Carregando...</div>;
  if (!user) return <Navigate to="/admin/login" replace />;
  if (!isAdmin) return <div className="min-h-screen bg-background flex items-center justify-center text-destructive font-display text-xl">Acesso negado — somente administradores.</div>;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public landing page */}
            <Route path="/site" element={<LandingPage />} />

            {/* Client portal routes */}
            <Route path="/cliente/login" element={<ClienteLogin />} />
            <Route path="/cliente" element={<ProtectedClientRoute><ClientePortal /></ProtectedClientRoute>} />

            {/* Admin login */}
            <Route path="/admin/login" element={<AdminLogin />} />

            {/* Protected admin routes */}
            <Route path="/" element={<ProtectedAdminRoute><AppLayout><Index /></AppLayout></ProtectedAdminRoute>} />
            <Route path="/agendamento" element={<ProtectedAdminRoute><AppLayout><Agendamento /></AppLayout></ProtectedAdminRoute>} />
            <Route path="/assinaturas" element={<ProtectedAdminRoute><AppLayout><Assinaturas /></AppLayout></ProtectedAdminRoute>} />
            <Route path="/financeiro" element={<ProtectedAdminRoute><AppLayout><Financeiro /></AppLayout></ProtectedAdminRoute>} />
            <Route path="/estoque" element={<ProtectedAdminRoute><AppLayout><Estoque /></AppLayout></ProtectedAdminRoute>} />
            <Route path="/admin/landing" element={<ProtectedAdminRoute><AppLayout><AdminLanding /></AppLayout></ProtectedAdminRoute>} />
            <Route path="/admin/banner-ia" element={<ProtectedAdminRoute><AppLayout><AdminBannerAI /></AppLayout></ProtectedAdminRoute>} />
            <Route path="/admin/usuarios" element={<ProtectedAdminRoute><AppLayout><AdminUsuarios /></AppLayout></ProtectedAdminRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
