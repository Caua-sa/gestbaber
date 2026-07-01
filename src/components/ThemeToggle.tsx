import { Moon, Sun } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/hooks/useTheme";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label="Alternar tema"
      className={`relative h-9 w-9 rounded-full border border-border bg-card hover:border-primary hover:text-primary transition-colors flex items-center justify-center overflow-hidden ${className}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        {theme === "dark" ? (
          <motion.span key="moon" initial={{ y: -18, opacity: 0, rotate: -90 }} animate={{ y: 0, opacity: 1, rotate: 0 }} exit={{ y: 18, opacity: 0, rotate: 90 }} transition={{ duration: 0.25 }}>
            <Moon className="h-4 w-4" />
          </motion.span>
        ) : (
          <motion.span key="sun" initial={{ y: -18, opacity: 0, rotate: -90 }} animate={{ y: 0, opacity: 1, rotate: 0 }} exit={{ y: 18, opacity: 0, rotate: 90 }} transition={{ duration: 0.25 }}>
            <Sun className="h-4 w-4" />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
