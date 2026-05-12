import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface ClientShop {
  id: string;
  owner_id: string;
  name: string;
}

/**
 * Returns the barbershop the current client belongs to.
 * Resolution order:
 *  1. The admin who created this client account (user_roles.created_by) → their barbershop
 *  2. Fallback: first active barbershop
 */
export function useClientBarbershop() {
  const { user } = useAuth();
  const [shop, setShop] = useState<ClientShop | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setShop(null);
      setLoading(false);
      return;
    }

    const resolve = async () => {
      setLoading(true);

      // 1) Try the admin who created this client
      const { data: role } = await supabase
        .from("user_roles")
        .select("created_by")
        .eq("user_id", user.id)
        .maybeSingle();

      if (role?.created_by) {
        const { data: ownShop } = await supabase
          .from("barbershops")
          .select("id, owner_id, name")
          .eq("owner_id", role.created_by)
          .eq("active", true)
          .maybeSingle();
        if (ownShop) {
          setShop(ownShop as ClientShop);
          setLoading(false);
          return;
        }
      }

      // 2) Fallback: first active barbershop
      const { data: any } = await supabase
        .from("barbershops")
        .select("id, owner_id, name")
        .eq("active", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      setShop((any as ClientShop) || null);
      setLoading(false);
    };

    resolve();
  }, [user]);

  return { shop, loading };
}
