import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Scissors, Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Scissors className="h-12 w-12 text-primary mx-auto mb-3" />
          <h1 className="text-4xl font-display gold-text">BARBER PRO</h1>
          <p className="text-muted-foreground text-sm mt-1">Área Administrativa</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="font-display text-2xl mb-6 text-center tracking-wide">
            Login Admin
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="pl-10 bg-secondary border-border"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="pl-10 bg-secondary border-border"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Aguarde..." : "Entrar"}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-border text-center">
            <p className="text-sm text-muted-foreground mb-3">Ainda não tem uma conta admin?</p>
            <Link to="/admin/signup">
              <Button variant="outline" className="w-full">
                Criar nova conta admin
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
