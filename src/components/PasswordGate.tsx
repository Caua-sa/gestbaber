import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Props {
  password: string;
  storageKey: string;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function PasswordGate({ password, storageKey, title = "Área restrita", subtitle, children }: Props) {
  const [unlocked, setUnlocked] = useState(false);
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (sessionStorage.getItem(storageKey) === "1") setUnlocked(true);
  }, [storageKey]);

  if (unlocked) return <>{children}</>;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pw === password) {
      sessionStorage.setItem(storageKey, "1");
      setUnlocked(true);
    } else {
      setErr("Senha incorreta");
      setPw("");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center">
            <Lock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-xl tracking-wide">{title}</h1>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        <Input
          autoFocus
          type="password"
          placeholder="Senha"
          value={pw}
          onChange={(e) => { setPw(e.target.value); setErr(""); }}
          className="bg-secondary border-border"
        />
        {err && <p className="text-xs text-destructive">{err}</p>}
        <Button type="submit" className="w-full">Entrar</Button>
      </form>
    </div>
  );
}
