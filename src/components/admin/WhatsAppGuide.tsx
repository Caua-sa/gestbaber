import { BookOpen, Server, KeyRound, QrCode, CheckCircle2, AlertTriangle, ExternalLink, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const webhook = "https://gjfdpphvhbnsxvmyqnpf.functions.supabase.co/whatsapp-bot-inbound";

function Code({ children }: { children: string }) {
  return (
    <div className="relative group">
      <pre className="bg-muted/50 border border-border rounded-md p-3 text-[11px] overflow-x-auto"><code>{children}</code></pre>
      <button
        type="button"
        onClick={() => { navigator.clipboard.writeText(children); toast.success("Copiado"); }}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition text-xs bg-background border border-border rounded px-2 py-1 flex items-center gap-1"
      >
        <Copy className="h-3 w-3" /> Copiar
      </button>
    </div>
  );
}

export default function WhatsAppGuide() {
  return (
    <div className="space-y-5 max-w-3xl">
      <div className="bg-card border border-border rounded-xl p-5 space-y-2">
        <h2 className="font-display text-2xl flex items-center gap-2"><BookOpen className="h-6 w-6 text-primary" /> Manual de Instalação (WhatsApp via QR)</h2>
        <p className="text-sm text-muted-foreground">
          Passo a passo objetivo para conectar seu WhatsApp ao Barber Pro sem burocracia. O Lovable Cloud <b>não roda</b> processos 24/7, por isso o servidor precisa ficar em outro lugar (Railway, Render, VPS).
        </p>
      </div>

      {/* Passo 1 */}
      <section className="bg-card border border-border rounded-xl p-5 space-y-3">
        <h3 className="font-display text-lg flex items-center gap-2"><Server className="h-5 w-5 text-primary" /> 1. Suba o servidor Baileys</h3>
        <p className="text-sm text-muted-foreground">Opção mais fácil: Railway (US$ 5/mês, sobra pro mês todo).</p>
        <ol className="list-decimal ml-5 space-y-2 text-sm">
          <li>Crie conta em <a href="https://railway.app" target="_blank" rel="noreferrer" className="text-primary underline">railway.app</a>.</li>
          <li>Faça <b>fork</b> ou baixe a pasta <code>baileys-server/</code> deste projeto e suba pra um repositório no GitHub.</li>
          <li>No Railway: <b>New Project → Deploy from GitHub</b>, escolha o repo, aponte a pasta raiz para <code>baileys-server</code>.</li>
          <li>Em <b>Settings → Networking → Generate Domain</b> para gerar uma URL pública HTTPS.</li>
          <li>Em <b>Variables</b> adicione:
            <Code>{`SHARED_TOKEN=uma_senha_longa_aleatoria_aqui
WEBHOOK_URL=${webhook}
WEBHOOK_OWNER_ID=SEU_USER_ID_DO_BARBER_PRO`}</Code>
            <p className="text-xs text-muted-foreground">Seu <code>user_id</code> aparece em <b>Admin → Controle de Acessos</b>, ou peça pra alguém que já tem acesso.</p>
          </li>
          <li>Deploy → copie a URL pública gerada (ex: <code>https://barber-baileys.up.railway.app</code>).</li>
        </ol>
      </section>

      {/* Passo 2 */}
      <section className="bg-card border border-border rounded-xl p-5 space-y-3">
        <h3 className="font-display text-lg flex items-center gap-2"><KeyRound className="h-5 w-5 text-primary" /> 2. Configure no Barber Pro</h3>
        <ol className="list-decimal ml-5 space-y-2 text-sm">
          <li>Vá para a aba <b>QR Code</b> aqui em cima.</li>
          <li>Cole a URL pública em <b>URL pública</b>.</li>
          <li>Cole o mesmo <code>SHARED_TOKEN</code> em <b>Token de segurança</b>.</li>
          <li>Ative o switch <b>“Usar este servidor para enviar as mensagens”</b>.</li>
          <li>Clique em <b>Salvar configuração</b>.</li>
        </ol>
      </section>

      {/* Passo 3 */}
      <section className="bg-card border border-border rounded-xl p-5 space-y-3">
        <h3 className="font-display text-lg flex items-center gap-2"><QrCode className="h-5 w-5 text-primary" /> 3. Escaneie o QR</h3>
        <ol className="list-decimal ml-5 space-y-2 text-sm">
          <li>Clique em <b>Gerar QR Code</b>.</li>
          <li>No celular: <b>WhatsApp → ⋮ → Aparelhos conectados → Conectar aparelho</b>.</li>
          <li>Aponte a câmera para o QR na tela.</li>
          <li>O status deve mudar para <span className="text-emerald-400">✓ Conectado</span>.</li>
        </ol>
      </section>

      {/* Erros comuns */}
      <section className="bg-card border border-border rounded-xl p-5 space-y-3">
        <h3 className="font-display text-lg flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-warning" /> Erros comuns</h3>
        <div className="space-y-3 text-sm">
          <div>
            <p className="font-medium">“Failed to fetch” ou “Erro de rede” ao clicar em Gerar QR</p>
            <p className="text-muted-foreground text-xs">A URL do servidor está errada ou o Railway ainda está subindo. Abra a URL no navegador — deve responder algo. Espere 1 min após deploy.</p>
          </div>
          <div>
            <p className="font-medium">“Unauthorized” / 401</p>
            <p className="text-muted-foreground text-xs">O <code>SHARED_TOKEN</code> do servidor não bate com o que você colou aqui. Copie exatamente o mesmo valor.</p>
          </div>
          <div>
            <p className="font-medium">QR aparece mas não escaneia</p>
            <p className="text-muted-foreground text-xs">O QR expira em ~30s. Clique em <b>Gerar QR Code</b> de novo e escaneie rápido.</p>
          </div>
          <div>
            <p className="font-medium">Perde a conexão depois de algumas horas</p>
            <p className="text-muted-foreground text-xs">Baileys precisa de disco persistente para salvar a pasta <code>./auth</code>. No Railway ative <b>Volumes</b> em <code>/app/auth</code>, senão vai pedir QR toda hora.</p>
          </div>
          <div>
            <p className="font-medium">Mensagens não chegam / bot não responde</p>
            <p className="text-muted-foreground text-xs">Confira se <code>WEBHOOK_URL</code> aponta para <code className="break-all">{webhook}</code> e se <code>WEBHOOK_OWNER_ID</code> é o seu user_id (dono).</p>
          </div>
        </div>
      </section>

      {/* Teste */}
      <section className="bg-card border border-border rounded-xl p-5 space-y-2">
        <h3 className="font-display text-lg flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-400" /> 4. Teste</h3>
        <p className="text-sm text-muted-foreground">Na aba <b>Testar</b>, coloque seu número no formato <code>55DDDNÚMERO</code> (ex: 5511999999999) e clique em <b>Enviar</b>. Se chegar, está pronto!</p>
      </section>

      <div className="flex gap-3 flex-wrap">
        <a href="https://railway.app" target="_blank" rel="noreferrer">
          <Button variant="outline" className="gap-2"><ExternalLink className="h-3 w-3" /> Abrir Railway</Button>
        </a>
        <a href="https://render.com" target="_blank" rel="noreferrer">
          <Button variant="outline" className="gap-2"><ExternalLink className="h-3 w-3" /> Abrir Render</Button>
        </a>
      </div>
    </div>
  );
}
