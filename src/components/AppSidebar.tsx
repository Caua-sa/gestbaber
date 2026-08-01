import { LayoutDashboard, Calendar, DollarSign, Package, Users, Scissors, Sparkles, LogOut, ShoppingCart, CreditCard, Store, TrendingUp, Boxes, Crown, MessageCircle, Megaphone, ShieldCheck, Bell } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Agendamento", url: "/agendamento", icon: Calendar },
  { title: "Clientes", url: "/admin/clientes", icon: Users },
  { title: "Barbeiros", url: "/admin/barbeiros", icon: Scissors },
  { title: "Cortes & Preços", url: "/admin/servicos", icon: Scissors },
  { title: "Ganhos Barbeiros", url: "/admin/ganhos-barbeiros", icon: TrendingUp },
  { title: "Assinaturas", url: "/assinaturas", icon: Crown },
  { title: "Financeiro", url: "/financeiro", icon: DollarSign },
  { title: "Estoque", url: "/estoque", icon: Package },
  { title: "Insumos", url: "/admin/insumos", icon: Boxes },
  { title: "Vendas", url: "/vendas", icon: ShoppingCart },
  { title: "Notificações", url: "/admin/notificacoes", icon: Bell },
  { title: "Controle de Acesso", url: "/admin/controle-acesso", icon: ShieldCheck },
];

const siteItems = [
  { title: "Minha Barbearia", url: "/admin/barbearia", icon: Store },
  { title: "Banner IA", url: "/admin/banner-ia", icon: Sparkles },
  { title: "Marketing TV", url: "/admin/marketing", icon: Megaphone },
  { title: "Mercado Pago", url: "/admin/mercado-pago", icon: CreditCard },
  { title: "WhatsApp", url: "/admin/whatsapp", icon: MessageCircle },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate("/admin/login");
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="p-4 flex items-center gap-3">
          <Scissors className="h-7 w-7 text-primary shrink-0" />
          {!collapsed && (
            <span className="font-display text-2xl gold-text tracking-wider">BARBER PRO</span>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground text-xs uppercase tracking-widest">
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/dashboard"}
                      className="hover:bg-secondary/80 transition-colors"
                      activeClassName="bg-primary/10 text-primary font-medium border-l-2 border-primary"
                    >
                      <item.icon className="mr-2 h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground text-xs uppercase tracking-widest">
            Site
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {siteItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="hover:bg-secondary/80 transition-colors"
                      activeClassName="bg-primary/10 text-primary font-medium border-l-2 border-primary"
                    >
                      <item.icon className="mr-2 h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto p-4">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-muted-foreground hover:text-destructive transition-colors w-full text-sm"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Sair</span>}
          </button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
