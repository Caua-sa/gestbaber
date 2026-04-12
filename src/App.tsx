import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import Index from "./pages/Index";
import Agendamento from "./pages/Agendamento";
import Assinaturas from "./pages/Assinaturas";
import Financeiro from "./pages/Financeiro";
import Estoque from "./pages/Estoque";
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Client portal routes */}
            <Route path="/cliente/login" element={<ClienteLogin />} />
            <Route path="/cliente" element={<ProtectedClientRoute><ClientePortal /></ProtectedClientRoute>} />

            {/* Admin routes */}
            <Route path="/" element={<AppLayout><Index /></AppLayout>} />
            <Route path="/agendamento" element={<AppLayout><Agendamento /></AppLayout>} />
            <Route path="/assinaturas" element={<AppLayout><Assinaturas /></AppLayout>} />
            <Route path="/financeiro" element={<AppLayout><Financeiro /></AppLayout>} />
            <Route path="/estoque" element={<AppLayout><Estoque /></AppLayout>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
