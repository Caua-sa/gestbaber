import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface ClientShop {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
}

const SHOP_CONTEXT_KEY = "barberpro:client-barbershop";

function getStoredShopContext() {
  try {
    return JSON.parse(localStorage.getItem(SHOP_CONTEXT_KEY) || "{}");
  } catch {
    return {};
  }
}

function storeShopContext(shop: ClientShop) {
  localStorage.setItem(SHOP_CONTEXT_KEY, JSON.stringify({ id: shop.id, slug: shop.slug }));
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

      // 1) Prefer the barbershop/domain the client entered from
      const params = new URLSearchParams(window.location.search);
      const stored = getStoredShopContext();
      const contextId = params.get("barbershop_id") || params.get("shop_id") || stored.id;
      const contextSlug = params.get("barbershop") || params.get("shop") || params.get("slug") || stored.slug;

      if (contextId || contextSlug) {
        let contextQuery = supabase
          .from("barbershops")
          .select("id, owner_id, name, slug")
          .eq("active", true);

        contextQuery = contextId ? contextQuery.eq("id", contextId) : contextQuery.eq("slug", contextSlug);
        const { data: contextShop } = await contextQuery.maybeSingle();

        if (contextShop) {
          const resolved = contextShop as ClientShop;
          storeShopContext(resolved);
          setShop(resolved);
          setLoading(false);
          return;
        }
      }

      // 2) Try the admin who created this client
      const { data: role } = await supabase
        .from("user_roles")
        .select("created_by")
        .eq("user_id", user.id)
        .maybeSingle();

      if (role?.created_by) {
        const { data: ownShop } = await supabase
          .from("barbershops")
          .select("id, owner_id, name, slug")
          .eq("owner_id", role.created_by)
          .eq("active", true)
          .maybeSingle();
        if (ownShop) {
          setShop(ownShop as ClientShop);
          setLoading(false);
          return;
        }
      }

      // 3) Fallback: first active barbershop
      const { data: any } = await supabase
        .from("barbershops")
        .select("id, owner_id, name, slug")
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
