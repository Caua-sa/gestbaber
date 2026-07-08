import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink, Scissors, Maximize2, Minimize2 } from "lucide-react";

interface Barbershop { id: string; name: string; slug: string; logo_url: string | null; owner_id: string; active: boolean; banned: boolean; }
interface Barber { id: string; name: string; photo_url: string | null; }
interface Appt { barber_id: string | null; appointment_time: string; status: string; }
interface Media { id: string; media_type: "image" | "video" | "youtube"; media_url: string; link_url: string | null; duration_seconds: number | null; title: string | null; }

function generateSlots(start = 8, end = 21) {
  const slots: string[] = [];
  for (let h = start; h < end; h++) {
    slots.push(`${String(h).padStart(2, "0")}:00`);
    slots.push(`${String(h).padStart(2, "0")}:30`);
  }
  return slots;
}

const SLOTS = generateSlots();

function normalizeTime(t: string) {
  return t.slice(0, 5);
}

function youtubeEmbed(url: string) {
  const m = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{6,})/);
  const id = m ? m[1] : url;
  return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&controls=0&loop=1&playlist=${id}`;
}

export default function TvAgenda() {
  const { slug } = useParams();
  const [shop, setShop] = useState<Barbershop | null>(null);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [appts, setAppts] = useState<Appt[]>([]);
  const [media, setMedia] = useState<Media[]>([]);
  const [mediaIdx, setMediaIdx] = useState(0);
  const [now, setNow] = useState(new Date());
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    (async () => {
      if (!slug) return;
      const { data: s } = await supabase.from("barbershops").select("*").eq("slug", slug).maybeSingle();
      if (!s) return;
      setShop(s as any);
      const [{ data: bs }, { data: ap }, { data: md }] = await Promise.all([
        supabase.from("barbers").select("id,name,photo_url").eq("barbershop_id", s.id).eq("active", true).order("name"),
        supabase.from("appointments").select("barber_id,appointment_time,status").eq("barbershop_id", s.id).eq("appointment_date", new Date().toISOString().slice(0, 10)),
        supabase.from("marketing_media").select("*").eq("owner_id", (s as any).owner_id).eq("active", true).order("sort_order"),
      ]);
      setBarbers((bs || []) as any);
      setAppts((ap || []) as any);
      setMedia((md || []) as any);
    })();
  }, [slug]);

  // realtime appts
  useEffect(() => {
    if (!shop) return;
    const ch = supabase.channel(`tv-${shop.id}`).on(
      "postgres_changes",
      { event: "*", schema: "public", table: "appointments", filter: `barbershop_id=eq.${shop.id}` },
      async () => {
        const { data: ap } = await supabase.from("appointments").select("barber_id,appointment_time,status").eq("barbershop_id", shop.id).eq("appointment_date", new Date().toISOString().slice(0, 10));
        setAppts((ap || []) as any);
      }
    ).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [shop?.id]);

  // media rotation
  useEffect(() => {
    if (media.length <= 1) return;
    const current = media[mediaIdx];
    const duration = (current?.duration_seconds || 8) * 1000;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setMediaIdx((i) => (i + 1) % media.length);
    }, duration);
    return () => { if (timerRef.current) window.clearTimeout(timerRef.current); };
  }, [mediaIdx, media]);

  const busy = useMemo(() => {
    const set = new Set<string>();
    for (const a of appts) {
      if (a.status === "cancelled" || a.status === "cancelado") continue;
      set.add(`${a.barber_id || "any"}|${normalizeTime(a.appointment_time)}`);
    }
    return set;
  }, [appts]);

  const dateStr = now.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
  const timeStr = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  if (!shop) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Carregando…</div>;
  }

  const current = media[mediaIdx];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      <header className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          {shop.logo_url ? (
            <img src={shop.logo_url} alt={shop.name} className="h-12 w-12 rounded-lg object-cover" />
          ) : (
            <Scissors className="h-10 w-10 text-primary" />
          )}
          <div>
            <h1 className="font-display text-3xl gold-text tracking-wide">{shop.name}</h1>
            <p className="text-xs text-muted-foreground capitalize">{dateStr}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="font-display text-5xl gold-text tabular-nums">{timeStr}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Agenda ao vivo</div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4 p-4 h-[calc(100vh-88px)]">
        {/* Agenda */}
        <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col">
          <div className="grid" style={{ gridTemplateColumns: `80px repeat(${Math.max(barbers.length, 1)}, 1fr)` }}>
            <div className="p-3 border-b border-border text-xs text-muted-foreground uppercase tracking-widest bg-muted/30">Hora</div>
            {barbers.length ? barbers.map((b) => (
              <div key={b.id} className="p-3 border-b border-l border-border bg-muted/30 flex items-center gap-2">
                {b.photo_url ? <img src={b.photo_url} alt={b.name} className="h-8 w-8 rounded-full object-cover" /> : <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs text-primary">{b.name[0]}</div>}
                <span className="font-medium text-sm truncate">{b.name}</span>
              </div>
            )) : (
              <div className="p-3 border-b border-l border-border bg-muted/30 text-sm text-muted-foreground">Sem barbeiros ativos</div>
            )}
          </div>

          <div className="flex-1 overflow-auto">
            {SLOTS.map((slot) => (
              <div key={slot} className="grid" style={{ gridTemplateColumns: `80px repeat(${Math.max(barbers.length, 1)}, 1fr)` }}>
                <div className="px-3 py-2 border-b border-border text-xs tabular-nums text-muted-foreground bg-muted/10">{slot}</div>
                {barbers.length ? barbers.map((b) => {
                  const isBusy = busy.has(`${b.id}|${slot}`);
                  return (
                    <div
                      key={b.id + slot}
                      className={`border-b border-l border-border px-2 py-2 text-[11px] font-medium text-center transition-colors ${
                        isBusy
                          ? "bg-red-500/20 text-red-400 border-red-500/30"
                          : "bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
                      }`}
                    >
                      {isBusy ? "OCUPADO" : "LIVRE"}
                    </div>
                  );
                }) : (
                  <div className="border-b border-l border-border" />
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4 px-4 py-2 border-t border-border text-[10px] uppercase tracking-widest">
            <span className="flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-sm bg-emerald-500/60" /> Disponível</span>
            <span className="flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-sm bg-red-500/60" /> Ocupado</span>
          </div>
        </div>

        {/* Marketing */}
        <div className="bg-card border border-border rounded-xl overflow-hidden relative flex items-center justify-center">
          {media.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              <p className="text-sm">Espaço de marketing</p>
              <p className="text-xs mt-1">Adicione fotos, vídeos e propagandas em <br /><code className="text-primary">Admin → Marketing TV</code>.</p>
            </div>
          ) : (
            <>
              {current.media_type === "image" && (
                <img src={current.media_url} alt={current.title || ""} className="w-full h-full object-cover" />
              )}
              {current.media_type === "video" && (
                <video src={current.media_url} autoPlay muted loop playsInline className="w-full h-full object-cover" />
              )}
              {current.media_type === "youtube" && (
                <iframe
                  src={youtubeEmbed(current.media_url)}
                  className="w-full h-full"
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                  title={current.title || "video"}
                />
              )}

              {current.link_url && (
                <a
                  href={current.link_url}
                  target="_blank"
                  rel="noreferrer"
                  className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground text-sm font-medium px-4 py-2 shadow-lg hover:brightness-110"
                >
                  Saiba mais <ExternalLink className="h-3 w-3" />
                </a>
              )}

              {current.title && (
                <div className="absolute top-4 left-4 bg-black/60 backdrop-blur px-3 py-1 rounded-md text-xs uppercase tracking-widest">
                  {current.title}
                </div>
              )}

              {media.length > 1 && (
                <div className="absolute bottom-4 left-4 flex gap-1">
                  {media.map((_, i) => (
                    <span key={i} className={`h-1 w-6 rounded-full ${i === mediaIdx ? "bg-primary" : "bg-white/30"}`} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
