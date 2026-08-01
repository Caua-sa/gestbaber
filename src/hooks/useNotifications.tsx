import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  level: string;
  target_owner_id: string | null;
  created_at: string;
  read: boolean;
}

export function useNotifications() {
  const { user } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [{ data: notifs }, { data: reads }] = await Promise.all([
      supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("notification_reads").select("notification_id").eq("user_id", user.id),
    ]);
    const readSet = new Set((reads || []).map((r) => r.notification_id));
    setItems((notifs || []).map((n) => ({ ...n, read: readSet.has(n.id) })));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("notifications-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, load]);

  const markRead = async (id: string) => {
    if (!user) return;
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await supabase.from("notification_reads").upsert(
      { notification_id: id, user_id: user.id },
      { onConflict: "notification_id,user_id" },
    );
  };

  const markAllRead = async () => {
    if (!user) return;
    const unread = items.filter((n) => !n.read);
    if (!unread.length) return;
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    await supabase.from("notification_reads").upsert(
      unread.map((n) => ({ notification_id: n.id, user_id: user.id })),
      { onConflict: "notification_id,user_id" },
    );
  };

  return { items, loading, unread: items.filter((n) => !n.read).length, reload: load, markRead, markAllRead };
}
