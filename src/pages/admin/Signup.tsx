import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Scissors, Mail, Lock, User, Store, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function AdminSignup() {
  const [fullName, setFullName] = useState("");
  const [barbershopName, setBarbershopName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("signup-admin", {
        body: { email, password, full_name: fullName, barbershop_name: barbershopName },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      // Auto sign-in
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;

      toast.success("Conta criada com sucesso!");
      navigate("/");
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar conta");
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
          <p className="text-muted-foreground text-sm mt-1">Crie sua conta de administrador</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="font-display text-2xl mb-6 text-center tracking-wide">Criar Conta Admin</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Seu nome completo"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="pl-10 bg-secondary border-border"
              />
            </div>
            <div className="relative">
              <Store className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Nome da barbearia"
                value={barbershopName}
                onChange={(e) => setBarbershopName(e.target.value)}
                required
                className="pl-10 bg-secondary border-border"
              />
            </div>
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
                placeholder="Senha (mín. 6 caracteres)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="pl-10 bg-secondary border-border"
              />
            </div>
            <Button type="submit" className="w-full gold-gradient text-primary-foreground" disabled={loading}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Criando conta...</> : "Criar Conta"}
            </Button>
          </form>

          <p className="text-sm text-muted-foreground text-center mt-6">
            Já tem uma conta?{" "}
            <Link to="/admin/login" className="text-primary hover:underline">
              Entrar
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
