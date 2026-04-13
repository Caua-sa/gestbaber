import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type LandingSetting = {
  id: string;
  section: string;
  key: string;
  value: string;
  image_url: string | null;
};

export function useLandingSettings() {
  return useQuery({
    queryKey: ["landing-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("landing_page_settings")
        .select("*");
      if (error) throw error;
      return data as LandingSetting[];
    },
  });
}

export function getSettingValue(
  settings: LandingSetting[] | undefined,
  section: string,
  key: string,
  fallback = ""
): string {
  if (!settings) return fallback;
  const found = settings.find((s) => s.section === section && s.key === key);
  return found?.value || fallback;
}

export function getSettingImage(
  settings: LandingSetting[] | undefined,
  section: string,
  key: string
): string | null {
  if (!settings) return null;
  const found = settings.find((s) => s.section === section && s.key === key);
  return found?.image_url || null;
}
