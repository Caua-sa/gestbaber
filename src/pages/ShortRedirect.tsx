import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Scissors } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function ShortRedirect() {
  const { code } = useParams();
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    supabase.rpc("resolve_short_link", { _code: code! }).then(({ data }) => {
      if (data) window.location.replace(data as string); else setMissing(true);
    });
  }, [code]);
  return (
    <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
      {missing ? "Link não encontrado." : <Scissors className="h-8 w-8 text-primary animate-spin" />}
    </div>
  );
}
