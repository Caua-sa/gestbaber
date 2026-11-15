import { useEffect, useState } from "react";
import { Smartphone, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function AdminMobileAccess() {
  const [installPrompt, setInstallPrompt] = useState<(Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }) | null>(null);
  useEffect(() => {
    const link = document.head.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    const previous = link?.getAttribute("href");
    link?.setAttribute("href", "/admin.webmanifest");
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> });
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      if (previous) link?.setAttribute("href", previous);
    };
  }, []);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Salvar painel no celular" aria-label="Salvar painel no celular"><Smartphone className="h-4 w-4" /></Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Painel no celular</DialogTitle></DialogHeader>
        <div className="space-y-4 text-sm">
          <p>No iPhone: abra o painel no Safari, toque em Compartilhar e em Adicionar à Tela de Início.</p>
          <p>No Android: abra o painel no Chrome e escolha Adicionar à tela inicial ou Instalar aplicativo no menu.</p>
          <p className="text-muted-foreground">Seu login permanece salvo neste aparelho até você sair ou apagar os dados do navegador. Entre novamente caso o celular solicite.</p>
          <p className="text-muted-foreground">Notificações com o aplicativo fechado aguardam a configuração de notificações web no Firebase.</p>
          {installPrompt && <Button className="w-full" onClick={async () => { await installPrompt.prompt(); await installPrompt.userChoice; setInstallPrompt(null); }}><Download className="mr-2 h-4 w-4" />Instalar painel</Button>}
        </div>
      </DialogContent>
    </Dialog>
  );
}