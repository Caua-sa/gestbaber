import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { useUserRole } from "@/hooks/useUserRole";
import { AppLayout } from "@/components/AppLayout";
import Index from "./pages/Index";
import Agendamento from "./pages/Agendamento";
import Assinaturas from "./pages/Assinaturas";
import Financeiro from "./pages/Financeiro";
import Estoque from "./pages/Estoque";
import Vendas from "./pages/Vendas";
import LandingPage from "./pages/LandingPage";
import BarbershopPublic from "./pages/BarbershopPublic";
import AdminLanding from "./pages/admin/AdminLanding";
import AdminBannerAI from "./pages/admin/AdminBannerAI";
import AdminUsuarios from "./pages/admin/AdminUsuarios";
import AdminMercadoPago from "./pages/admin/AdminMercadoPago";
import AdminBarbearia from "./pages/admin/AdminBarbearia";
import AdminBarbeiros from "./pages/admin/AdminBarbeiros";
import AdminServicos from "./pages/admin/AdminServicos";
import AdminGanhosBarbeiros from "./pages/admin/AdminGanhosBarbeiros";
import AdminInsumos from "./pages/admin/AdminInsumos";
import AdminClientes from "./pages/admin/AdminClientes";
import AdminWhatsApp from "./pages/admin/AdminWhatsApp";
import AdminMarketing from "./pages/admin/AdminMarketing";
import AdminNotificacoes from "./pages/admin/AdminNotificacoes";
import TvAgenda from "./pages/TvAgenda";
import SuperAdminBarbershops from "./pages/SuperAdminBarbershops";
import DbAdmin from "./pages/DbAdmin";
import AdminLogin from "./pages/admin/Login";
import AdminSignup from "./pages/admin/Signup";
import ClienteLogin from "./pages/cliente/Login";
import RecuperarSenha from "./pages/RecuperarSenha";
import ClientePortal from "./pages/cliente/Portal";
import AgendarRapido from "./pages/AgendarRapido";
import ShortRedirect from "./pages/ShortRedirect";
import AdminLinks from "./pages/admin/AdminLinks";
import NotFound from "./pages/NotFound";
import { PasswordGate } from "./components/PasswordGate";

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
        <ThemeProvider>
        <BrowserRouter>
          <Routes>
            {/* Public landing page (root domain) */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/site" element={<LandingPage />} />
            <Route path="/site/:slug" element={<BarbershopPublic />} />
            <Route path="/tv/:slug" element={<TvAgenda />} />
            <Route path="/configbarber" element={<PasswordGate password="233004" storageKey="configbarber-unlocked" title="ConfigBar" subtitle="Painel Superadmin"><SuperAdminBarbershops /></PasswordGate>} />
            <Route path="/dbadmin" element={<DbAdmin />} />
            <Route path="/admin/controle-acesso" element={<ProtectedAdminRoute><AppLayout><PasswordGate password="1234" storageKey="controle-acesso-unlocked" title="Controle de Acesso" subtitle="Área restrita — senha 1234"><AdminUsuarios /></PasswordGate></AppLayout></ProtectedAdminRoute>} />


            {/* Client portal routes */}
            <Route path="/cliente/login" element={<ClienteLogin />} />
            <Route path="/cliente" element={<ProtectedClientRoute><ClientePortal /></ProtectedClientRoute>} />

            {/* Admin login */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/recuperar-senha" element={<RecuperarSenha />} />
            <Route path="/admin/signup" element={<AdminSignup />} />

            {/* Protected admin routes */}
            <Route path="/dashboard" element={<ProtectedAdminRoute><AppLayout><Index /></AppLayout></ProtectedAdminRoute>} />
            <Route path="/agendamento" element={<ProtectedAdminRoute><AppLayout><Agendamento /></AppLayout></ProtectedAdminRoute>} />
            <Route path="/assinaturas" element={<ProtectedAdminRoute><AppLayout><Assinaturas /></AppLayout></ProtectedAdminRoute>} />
            <Route path="/financeiro" element={<ProtectedAdminRoute><AppLayout><Financeiro /></AppLayout></ProtectedAdminRoute>} />
            <Route path="/estoque" element={<ProtectedAdminRoute><AppLayout><Estoque /></AppLayout></ProtectedAdminRoute>} />
            <Route path="/vendas" element={<ProtectedAdminRoute><AppLayout><Vendas /></AppLayout></ProtectedAdminRoute>} />
            <Route path="/admin/landing" element={<ProtectedAdminRoute><AppLayout><AdminLanding /></AppLayout></ProtectedAdminRoute>} />
            <Route path="/admin/banner-ia" element={<ProtectedAdminRoute><AppLayout><AdminBannerAI /></AppLayout></ProtectedAdminRoute>} />
            <Route path="/admin/usuarios" element={<ProtectedAdminRoute><AppLayout><AdminUsuarios /></AppLayout></ProtectedAdminRoute>} />
            <Route path="/admin/controle-acessos" element={<ProtectedAdminRoute><AppLayout><AdminUsuarios /></AppLayout></ProtectedAdminRoute>} />
            <Route path="/admin/mercado-pago" element={<ProtectedAdminRoute><AppLayout><AdminMercadoPago /></AppLayout></ProtectedAdminRoute>} />
            <Route path="/admin/barbearia" element={<ProtectedAdminRoute><AppLayout><AdminBarbearia /></AppLayout></ProtectedAdminRoute>} />
            <Route path="/admin/barbeiros" element={<ProtectedAdminRoute><AppLayout><AdminBarbeiros /></AppLayout></ProtectedAdminRoute>} />
            <Route path="/admin/servicos" element={<ProtectedAdminRoute><AppLayout><AdminServicos /></AppLayout></ProtectedAdminRoute>} />
            <Route path="/admin/ganhos-barbeiros" element={<ProtectedAdminRoute><AppLayout><AdminGanhosBarbeiros /></AppLayout></ProtectedAdminRoute>} />
            <Route path="/admin/insumos" element={<ProtectedAdminRoute><AppLayout><AdminInsumos /></AppLayout></ProtectedAdminRoute>} />
            <Route path="/admin/clientes" element={<ProtectedAdminRoute><AppLayout><AdminClientes /></AppLayout></ProtectedAdminRoute>} />
            <Route path="/admin/whatsapp" element={<ProtectedAdminRoute><AppLayout><AdminWhatsApp /></AppLayout></ProtectedAdminRoute>} />
            <Route path="/admin/marketing" element={<ProtectedAdminRoute><AppLayout><AdminMarketing /></AppLayout></ProtectedAdminRoute>} />
            <Route path="/admin/notificacoes" element={<ProtectedAdminRoute><AppLayout><AdminNotificacoes /></AppLayout></ProtectedAdminRoute>} />
            <Route path="/agendar/:slug" element={<AgendarRapido />} />
            <Route path="/l/:code" element={<ShortRedirect />} />
            <Route path="/admin/links" element={<ProtectedAdminRoute><AppLayout><AdminLinks /></AppLayout></ProtectedAdminRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </ThemeProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
