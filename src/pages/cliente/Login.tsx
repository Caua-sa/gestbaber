import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Scissors, Mail, Lock, User, Phone, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

function normalizePhone(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  // assume Brazilian if no leading country code
  if (digits.startsWith("55")) return `+${digits}`;
  return `+55${digits}`;
}

export default function ClienteLogin() {
  const { user } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  // WhatsApp OTP
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  // Onboarding (after WhatsApp code: complete registration)
  const [onboarding, setOnboarding] = useState(false);
  const [obName, setObName] = useState("");
  const [obEmail, setObEmail] = useState("");
  const [obBirthday, setObBirthday] = useState("");
  const [obPassword, setObPassword] = useState("");
  const [obPhone, setObPhone] = useState("");

  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get("redirect") || "/cliente";

  // After login via WhatsApp, check if profile needs filling
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email, birthday, phone")
        .eq("user_id", user.id)
        .maybeSingle();
      const isSynthetic = (user.email || "").endsWith("@barberpro.local");
      if (!profile || !profile.full_name || !profile.email || isSynthetic) {
        setOnboarding(true);
        setObName(profile?.full_name || "");
        setObEmail(isSynthetic ? "" : (profile?.email || user.email || ""));
        setObBirthday(profile?.birthday || "");
        setObPhone(profile?.phone || phone || "");
      } else {
        navigate(redirect);
      }
    })();
  }, [user, navigate, redirect]);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: window.location.origin + redirect,
          },
        });
        if (error) throw error;
        toast.success("Conta criada! Verifique seu e-mail.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      toast.error(err.message || "Erro");
    } finally {
      setLoading(false);
    }
  };

  const sendOtp = async () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) { toast.error("Informe o WhatsApp com DDD"); return; }
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("signup-send-otp", {
      body: { phone: digits, full_name: fullName || undefined },
    });
    setLoading(false);
    if (error || (data as any)?.error) { toast.error((data as any)?.error || error?.message || "Erro"); return; }
    setOtpSent(true);
    toast.success("Código enviado no seu WhatsApp");
  };

  const verifyOtp = async () => {
    const digits = phone.replace(/\D/g, "");
    if (!otp) { toast.error("Informe o código"); return; }
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("signup-verify-otp", {
      body: { phone: digits, code: otp },
    });
    if (error || (data as any)?.error) {
      setLoading(false);
      toast.error((data as any)?.error || error?.message || "Código inválido");
      return;
    }
    const { email: em, password: pw } = data as { email: string; password: string };
    const { error: signErr } = await supabase.auth.signInWithPassword({ email: em, password: pw });
    setLoading(false);
    if (signErr) { toast.error(signErr.message); return; }
    toast.success("Bem-vindo!");
  };

  const completeOnboarding = async () => {
    if (!user) return;
    if (!obName.trim()) { toast.error("Informe seu nome"); return; }
    if (!obEmail.trim()) { toast.error("Informe seu e-mail"); return; }
    if (obPassword.length < 6) { toast.error("A senha precisa de ao menos 6 caracteres"); return; }
    setLoading(true);
    try {
      const digits = obPhone.replace(/\D/g, "");
      // Set real email + password on the account created via WhatsApp code
      const { error: updErr } = await supabase.auth.updateUser({
        email: obEmail.trim(),
        password: obPassword,
      });
      if (updErr) {
        // If email change fails (e.g. already in use), still save the password
        const { error: pwErr } = await supabase.auth.updateUser({ password: obPassword });
        if (pwErr) throw updErr;
        toast.info("Senha definida. O e-mail informado já está em uso; usamos seu WhatsApp como login.");
      } else {
        toast.info("Enviamos um e-mail de confirmação para validar seu endereço.");
      }
      const { error } = await supabase.from("profiles").upsert({
        user_id: user.id,
        full_name: obName.trim(),
        email: obEmail.trim(),
        phone: digits || user.phone || null,
        birthday: obBirthday || null,
      }, { onConflict: "user_id" });
      if (error) throw error;
      toast.success("Cadastro completo!");
      navigate(redirect);
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar cadastro");
    } finally {
      setLoading(false);
    }
  };

  // Onboarding screen
  if (onboarding && user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="text-center mb-8">
            <Scissors className="h-12 w-12 text-primary mx-auto mb-3" />
            <h1 className="text-4xl font-display gold-text">BEM-VINDO</h1>
            <p className="text-muted-foreground text-sm mt-1">Complete seu cadastro</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <Input placeholder="Nome completo" value={obName} onChange={(e) => setObName(e.target.value)} />
            <Input type="email" placeholder="E-mail" value={obEmail} onChange={(e) => setObEmail(e.target.value)} />
            <div>
              <label className="text-xs text-muted-foreground">Data de nascimento (ganhe 10% no seu aniversário 🎂)</label>
              <Input type="date" value={obBirthday} onChange={(e) => setObBirthday(e.target.value)} />
            </div>
            <Button onClick={completeOnboarding} disabled={loading} className="w-full gold-gradient text-primary-foreground">
              {loading ? "Salvando..." : "Continuar"}
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <Scissors className="h-12 w-12 text-primary mx-auto mb-3" />
          <h1 className="text-4xl font-display gold-text">BARBER PRO</h1>
          <p className="text-muted-foreground text-sm mt-1">Portal do Cliente</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <Tabs defaultValue="email" className="w-full">
            <TabsList className="grid grid-cols-2 w-full mb-4">
              <TabsTrigger value="email">E-mail</TabsTrigger>
              <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
            </TabsList>

            <TabsContent value="whatsapp" className="space-y-4">
              <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
                O login por WhatsApp só funciona se a barbearia tiver a integração ativa (Meta Cloud ou QR).
                Se não chegar código, use a aba <strong>E-mail</strong> — funciona imediatamente.
              </div>
              {!otpSent ? (
                <>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Seu nome"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="pl-10 bg-secondary border-border"
                    />
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="WhatsApp (com DDD)"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-10 bg-secondary border-border"
                    />
                  </div>
                  <Button onClick={sendOtp} disabled={loading} className="w-full">
                    {loading ? "Enviando..." : "Receber código no WhatsApp"}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Enviaremos um código de 6 dígitos direto no seu WhatsApp.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">Código enviado para {normalizePhone(phone)}</p>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Código de 6 dígitos"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="pl-10 bg-secondary border-border"
                      inputMode="numeric"
                    />
                  </div>
                  <Button onClick={verifyOtp} disabled={loading} className="w-full">
                    {loading ? "Validando..." : "Entrar"}
                  </Button>
                  <button onClick={() => { setOtpSent(false); setOtp(""); }} className="text-xs text-muted-foreground hover:text-primary mx-auto block">
                    Reenviar / alterar número
                  </button>
                </>
              )}
            </TabsContent>

            <TabsContent value="email">
              <form onSubmit={handleEmail} className="space-y-4">
                {mode === "signup" && (
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Nome completo"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="pl-10 bg-secondary border-border"
                    />
                  </div>
                )}
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} required className="pl-10 bg-secondary border-border" />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <PasswordInput  placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="pl-10 bg-secondary border-border" />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Aguarde..." : mode === "signup" ? "Criar Conta" : "Entrar"}
                </Button>
                <div className="text-center">
                  <a href="/recuperar-senha" className="text-sm text-muted-foreground hover:text-primary">
                    Esqueceu a senha?
                  </a>
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  {mode === "signup" ? "Já tem conta?" : "Não tem conta?"}{" "}
                  <button type="button" onClick={() => setMode(mode === "signup" ? "login" : "signup")} className="text-primary hover:underline">
                    {mode === "signup" ? "Entrar" : "Criar conta"}
                  </button>
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </motion.div>
    </div>
  );
}
