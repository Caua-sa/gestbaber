import { getApp, getApps, initializeApp } from "firebase/app";
import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";
import { supabase } from "@/integrations/supabase/client";

export type PushStatus = "registered" | "not-configured" | "unsupported" | "open-in-new-tab" | "denied";
const appId = import.meta.env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_APP_ID;
const vapidKey = import.meta.env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_VAPID_KEY;
const config = {
  apiKey: import.meta.env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_WEB_API_KEY,
  projectId: import.meta.env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_PROJECT_ID,
  appId,
  messagingSenderId: appId?.split(":")[1] ?? "",
};
export const pushMessages: Record<PushStatus, string> = {
  registered: "Notificações de novos agendamentos ativadas neste aparelho.",
  "not-configured": "Falta configurar Include web push na conexão Firebase para ativar notificações.",
  unsupported: "Este navegador não oferece notificações push. No Android, use o Chrome; no iPhone, é necessário adicionar o painel à Tela de Início (iOS 16.4 ou superior).",
  "open-in-new-tab": "Abra o painel em uma aba própria ou no site publicado para permitir notificações.",
  denied: "Permita notificações nas configurações deste site no navegador e tente novamente.",
};
export async function enableAdminPush(onNotification: (title: string) => void): Promise<PushStatus> {
  if (window.top !== window.self) return "open-in-new-tab";
  if (!config.apiKey || !config.projectId || !appId || !vapidKey || !config.messagingSenderId) return "not-configured";
  if (!("Notification" in window) || !(await isSupported())) return "unsupported";
  const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") return "denied";
  const registration = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${new URLSearchParams(config)}`);
  await navigator.serviceWorker.ready;
  const app = getApps().some((a) => a.name === "admin-push") ? getApp("admin-push") : initializeApp(config, "admin-push");
  const messaging = getMessaging(app);
  const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
  if (!token) return "denied";
  const { data, error } = await supabase.functions.invoke("admin-appointment-push", { body: { action: "register", token } });
  if (error || data?.error) throw new Error(data?.error || "Não foi possível ativar as notificações. Tente novamente.");
  localStorage.setItem("admin-push-token", token);
  onMessage(messaging, (payload) => onNotification(payload.notification?.title || "Novo agendamento"));
  return "registered";
}
export async function unregisterAdminPush() {
  const token = localStorage.getItem("admin-push-token");
  if (!token) return;
  const { error } = await supabase.functions.invoke("admin-appointment-push", { body: { action: "unregister", token } });
  if (error) throw new Error("Não foi possível desligar notificações deste aparelho. Tente sair novamente.");
  localStorage.removeItem("admin-push-token");
}