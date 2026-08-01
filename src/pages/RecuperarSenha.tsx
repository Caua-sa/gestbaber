import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Scissors, Mail, KeyRound, Lock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Step = "email" | "code" | "password";

export default function RecuperarSenha() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Suporte ao link de recuperação enviado por e-mail
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setStep("password");
    });

    (async () => {
      const params = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const tokenHash = params.get("token_hash") || hash.get("token_hash");
      const type = params.get("type") || hash.get("type");

      if (tokenHash && type === "recovery") {
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
        if (!error) {
          setStep("password");
          window.history.replaceState({}, "", "/recuperar-senha");
          return;
        }
      }

      if (type === "recovery" || hash.get("access_token")) {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setStep("password");
          window.history.replaceState({}, "", "/recuperar-senha");
        }
      }
    })();

    return () => sub.subscription.unsubscribe();
  }, []);


  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/recuperar-senha`,
      });
      if (error) throw error;
      toast.success("Enviamos um código de recuperação para o seu e-mail.");
      setStep("code");
    } catch (err: any) {
      toast.error(err.message || "Não foi possível enviar o e-mail.");
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 6) return toast.error("Digite o código de 6 dígitos.");
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code,
        type: "recovery",
      });
      if (error) throw error;
      setStep("password");
    } catch (err: any) {
      toast.error(err.message || "Código inválido ou expirado.");
    } finally {
      setLoading(false);
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("A senha deve ter no mínimo 6 caracteres.");
    if (password !== confirm) return toast.error("As senhas não conferem.");
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Senha alterada com sucesso!");
      navigate("/admin/login");
    } catch (err: any) {
      toast.error(err.message || "Erro ao alterar a senha.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <Scissors className="h-12 w-12 text-primary mx-auto mb-3" />
          <h1 className="text-4xl font-display gold-text">BARBER PRO</h1>
          <p className="text-muted-foreground text-sm mt-1">Recuperação de senha</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          {step === "email" && (
            <form onSubmit={sendCode} className="space-y-4">
              <h2 className="font-display text-2xl text-center tracking-wide">Esqueceu a senha?</h2>
              <p className="text-sm text-muted-foreground text-center">
                Informe seu e-mail e enviaremos um código para redefinir a senha.
              </p>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="E-mail cadastrado"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10 bg-secondary border-border"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Enviando..." : "Enviar código"}
              </Button>
            </form>
          )}

          {step === "code" && (
            <form onSubmit={verifyCode} className="space-y-4">
              <h2 className="font-display text-2xl text-center tracking-wide">Digite o código</h2>
              <p className="text-sm text-muted-foreground text-center">
                Enviamos um código de 6 dígitos para <span className="text-foreground">{email}</span>.
              </p>
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={code} onChange={setCode}>
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <InputOTPSlot key={i} index={i} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                <KeyRound className="h-4 w-4 mr-2" />
                {loading ? "Verificando..." : "Validar código"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Se o e-mail trouxer apenas um link, clique nele: você voltará para esta página já pronto para criar a nova senha.
              </p>
              <Button type="button" variant="ghost" className="w-full" onClick={() => setStep("email")}>
                Reenviar / alterar e-mail
              </Button>
            </form>
          )}

          {step === "password" && (
            <form onSubmit={savePassword} className="space-y-4">
              <h2 className="font-display text-2xl text-center tracking-wide">Nova senha</h2>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <PasswordInput
                  placeholder="Nova senha (mín. 6 caracteres)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="pl-10 bg-secondary border-border"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <PasswordInput
                  placeholder="Confirmar nova senha"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={6}
                  className="pl-10 bg-secondary border-border"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Salvando..." : "Salvar nova senha"}
              </Button>
            </form>
          )}

          <div className="mt-6 pt-6 border-t border-border text-center">
            <Link to="/admin/login" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" /> Voltar ao login
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
