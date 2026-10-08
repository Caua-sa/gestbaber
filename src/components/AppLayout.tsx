import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationBell } from "@/components/NotificationBell";
import { motion } from "framer-motion";
import { useLocation } from "react-router-dom";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return (
    <SidebarProvider>
      <div className="admin-modern min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border px-4 shrink-0 bg-background/70 backdrop-blur-xl sticky top-0 z-40">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <div className="flex items-center gap-1">
              <NotificationBell />
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-8">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              {children}
            </motion.div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
