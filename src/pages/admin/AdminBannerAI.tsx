import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Download, Loader2, ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function AdminBannerAI() {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("moderno e sofisticado");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({ title: "Erro", description: "Descreva o banner que deseja criar.", variant: "destructive" });
      return;
    }
    setLoading(true);
    setGeneratedImage(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-banner", {
        body: { prompt, style },
      });
      if (error) throw error;
      if (data?.image) {
        setGeneratedImage(data.image);
        toast({ title: "Banner criado!", description: "Seu banner foi gerado com sucesso." });
      } else {
        throw new Error("Nenhuma imagem retornada");
      }
    } catch (err: any) {
      console.error(err);
      toast({ title: "Erro ao gerar", description: err.message || "Tente novamente.", variant: "destructive" });
    }
    setLoading(false);
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    const link = document.createElement("a");
    link.href = generatedImage;
    link.download = `banner-barbearia-${Date.now()}.png`;
    link.click();
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-4xl font-display gold-text">Criador de Banner IA</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Use inteligência artificial para criar banners profissionais para sua barbearia
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Descreva o banner</label>
          <Textarea
            placeholder="Ex: Banner promocional de corte + barba por R$ 59,90 com fundo escuro e letras douradas"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
          />
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Estilo visual</label>
          <Input
            placeholder="Ex: moderno e sofisticado, vintage, urbano"
            value={style}
            onChange={(e) => setStyle(e.target.value)}
          />
        </div>
        <Button
          onClick={handleGenerate}
          disabled={loading}
          className="gold-gradient text-primary-foreground font-semibold w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Gerando banner...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Gerar Banner com IA
            </>
          )}
        </Button>
      </div>

      {loading && (
        <div className="bg-card border border-border rounded-xl p-12 flex flex-col items-center justify-center gap-4">
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          </div>
          <p className="text-muted-foreground">Criando seu banner com IA...</p>
        </div>
      )}

      {generatedImage && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl tracking-wide">Banner Gerado</h2>
            <Button onClick={handleDownload} variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Baixar PNG
            </Button>
          </div>
          <div className="rounded-lg overflow-hidden border border-border">
            <img src={generatedImage} alt="Banner gerado por IA" className="w-full h-auto" />
          </div>
        </div>
      )}

      {!generatedImage && !loading && (
        <div className="bg-card border border-border rounded-xl p-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <ImageIcon className="h-12 w-12 opacity-30" />
          <p>Seu banner aparecerá aqui</p>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-display text-lg tracking-wide mb-3">💡 Dicas para prompts</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>• <strong>Promoções:</strong> "Banner de promoção Black Friday, 30% off em todos os cortes"</li>
          <li>• <strong>Inauguração:</strong> "Banner de inauguração de barbearia com tema luxo dourado e preto"</li>
          <li>• <strong>Redes sociais:</strong> "Post para Instagram com horário de funcionamento e logo"</li>
          <li>• <strong>Sazonal:</strong> "Banner de Natal para barbearia com desconto especial"</li>
        </ul>
      </div>
    </div>
  );
}
