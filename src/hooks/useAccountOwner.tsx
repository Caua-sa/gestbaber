import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useAccountOwner() {
  const { user } = useAuth();
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setOwnerId(null);
      setIsOwner(false);
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("user_roles")
        .select("created_by, role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      const resolvedOwner = data?.created_by || user.id;
      setOwnerId(resolvedOwner);
      setIsOwner(resolvedOwner === user.id);
      setLoading(false);
    })();
  }, [user]);

  return { ownerId, isOwner, loading };
}