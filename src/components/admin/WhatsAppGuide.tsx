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
          Conectar por QR Code usa o WhatsApp Web — <b>não paga nada de API da Meta</b>. O único "custo" seria hospedar o servidorzinho, mas abaixo mostramos o <b>modo 100% grátis</b> (seu próprio computador + Cloudflare Tunnel gratuito).
        </p>
      </div>

      {/* Modo grátis */}
      <section className="bg-card border-2 border-emerald-500/40 rounded-xl p-5 space-y-3">
        <h3 className="font-display text-lg flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-400" /> Modo 100% grátis (recomendado)</h3>
        <p className="text-sm text-muted-foreground">
          Você roda o servidor no <b>computador da barbearia</b> (aquele que já fica ligado) e expõe ele na internet com o <b>Cloudflare Tunnel</b>, que é gratuito e não precisa de cartão. Total: <b>R$ 0</b>.
        </p>
        <ol className="list-decimal ml-5 space-y-2 text-sm">
          <li>Instale o <b>Node.js 18+</b> (<a href="https://nodejs.org" target="_blank" rel="noreferrer" className="text-primary underline">nodejs.org</a>) no computador da barbearia.</li>
          <li>Baixe a pasta <code>baileys-server/</code> deste projeto, abra o terminal nela e rode:
            <Code>{`npm install
SHARED_TOKEN=uma_senha_longa_aleatoria node server.js`}</Code>
            No Windows (Prompt de Comando):
            <Code>{`npm install
set SHARED_TOKEN=uma_senha_longa_aleatoria
node server.js`}</Code>
            Pronto, o servidor já está rodando em <code>http://localhost:3000</code>.
          </li>
          <li>Baixe o <b>cloudflared</b> grátis em <a href="https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/" target="_blank" rel="noreferrer" className="text-primary underline">cloudflare.com</a> e rode:
            <Code>{`cloudflared tunnel --url http://localhost:3000`}</Code>
          </li>
          <li>Ele mostra uma URL tipo <code>https://alguma-coisa.trycloudflare.com</code>. <b>Copie essa URL</b> — é ela que você cola no GestBarber (Passo 2).</li>
          <li>Deixe as duas janelas abertas (servidor + túnel). Se o PC desligar, é só abrir os dois de novo — o WhatsApp continua conectado, só o QR que não precisa escanear de novo.</li>
        </ol>
        <p className="text-xs text-muted-foreground">
          ⚠️ A URL gratuita do túnel muda quando você reinicia o cloudflared — basta colar a nova URL no Passo 2. Quer URL fixa grátis pra sempre? Crie uma conta grátis na Cloudflare e use um "named tunnel".
        </p>
      </section>

      {/* Alternativa paga */}
      <section className="bg-card border border-border rounded-xl p-5 space-y-3">
        <h3 className="font-display text-lg flex items-center gap-2"><Server className="h-5 w-5 text-primary" /> Alternativa: servidor na nuvem (24/7 sem PC ligado)</h3>
        <p className="text-sm text-muted-foreground">
          Se não quiser deixar um computador ligado, suba o mesmo <code>baileys-server/</code> no <b>Railway</b> (~US$ 5/mês) ou numa VPS <b>Oracle Cloud Always Free</b> (grátis pra sempre, porém mais técnico). O restante do passo a passo é igual — só muda a URL.
        </p>
      </section>

      {/* Passo 1 */}
      <section className="bg-card border border-border rounded-xl p-5 space-y-3">
        <h3 className="font-display text-lg flex items-center gap-2"><Server className="h-5 w-5 text-primary" /> 1. Variáveis do servidor</h3>
        <p className="text-sm text-muted-foreground">
          Se escolher o <b>modo grátis</b> acima, só precisa do <code>SHARED_TOKEN</code> (o túnel cuida da URL). Se subir na nuvem (Railway/VPS), configure também o webhook:
        </p>
        <Code>{`SHARED_TOKEN=uma_senha_longa_aleatoria_aqui
WEBHOOK_URL=${webhook}
WEBHOOK_OWNER_ID=SEU_USER_ID_DO_BARBER_PRO`}</Code>
        <p className="text-xs text-muted-foreground">Seu <code>user_id</code> aparece em <b>Admin → Controle de Acessos</b>, ou peça pra alguém que já tem acesso. No Railway: <b>New Project → Deploy from GitHub</b> com a pasta <code>baileys-server</code>, depois <b>Settings → Networking → Generate Domain</b>.</p>
      </section>

      {/* Passo 2 */}
      <section className="bg-card border border-border rounded-xl p-5 space-y-3">
        <h3 className="font-display text-lg flex items-center gap-2"><KeyRound className="h-5 w-5 text-primary" /> 2. Configure no GestBarber</h3>
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
