type ShopBranding = {
  name?: string | null;
  description?: string | null;
  logo_url?: string | null;
};

const upsertLink = (rel: string, href: string, extra: Record<string, string> = {}) => {
  const selector = `link[rel="${rel}"]`;
  let link = document.head.querySelector<HTMLLinkElement>(selector);
  if (!link) {
    link = document.createElement("link");
    link.rel = rel;
    document.head.appendChild(link);
  }
  link.href = href;
  Object.entries(extra).forEach(([key, value]) => link?.setAttribute(key, value));
};

const upsertMeta = (
  attr: "name" | "property",
  key: string,
  content: string,
) => {
  const selector = `meta[${attr}="${key}"]`;
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
};

export function applyShopBranding(shop: ShopBranding) {
  const title = shop.name?.trim() || "Barber Pro";
  const description = shop.description?.trim() || `Agendamentos, planos e serviços da ${title}.`;
  const url = typeof window !== "undefined" ? window.location.href : "";

  document.title = title;

  upsertMeta("name", "description", description);
  upsertMeta("name", "apple-mobile-web-app-title", title.slice(0, 30));

  upsertMeta("property", "og:title", title);
  upsertMeta("property", "og:description", description);
  upsertMeta("property", "og:site_name", title);
  upsertMeta("property", "og:type", "website");
  if (url) upsertMeta("property", "og:url", url);

  upsertMeta("name", "twitter:card", "summary_large_image");
  upsertMeta("name", "twitter:title", title);
  upsertMeta("name", "twitter:description", description);

  if (shop.logo_url) {
    upsertMeta("property", "og:image", shop.logo_url);
    upsertMeta("property", "og:image:alt", title);
    upsertMeta("name", "twitter:image", shop.logo_url);
    upsertMeta("name", "twitter:image:alt", title);

    upsertLink("icon", shop.logo_url, { type: "image/png" });
    upsertLink("apple-touch-icon", shop.logo_url);

    const manifest = {
      name: title,
      short_name: title.slice(0, 12),
      start_url: window.location.pathname + window.location.search,
      display: "standalone",
      background_color: "#0d0d0d",
      theme_color: "#c9a84c",
      icons: [
        { src: shop.logo_url, sizes: "192x192", type: "image/png" },
        { src: shop.logo_url, sizes: "512x512", type: "image/png" },
      ],
    };
    const manifestUrl = `data:application/manifest+json,${encodeURIComponent(JSON.stringify(manifest))}`;
    upsertLink("manifest", manifestUrl);
  }
}

export async function shareShop(shop: ShopBranding & { url?: string }) {
  const title = shop.name?.trim() || "Barber Pro";
  const text = shop.description?.trim() || `Confira a ${title} — agende seu horário!`;
  const url = shop.url || (typeof window !== "undefined" ? window.location.href : "");

  // Try native Web Share with image file (mobile share sheet shows image + name)
  try {
    if (shop.logo_url && typeof navigator !== "undefined" && "canShare" in navigator) {
      const res = await fetch(shop.logo_url, { mode: "cors" });
      const blob = await res.blob();
      const file = new File([blob], "barbearia.png", { type: blob.type || "image/png" });
      const data = { title, text, url, files: [file] } as ShareData;
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.canShare?.(data)) {
        await navigator.share(data);
        return "shared" as const;
      }
    }
  } catch {
    // fall through
  }

  try {
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({ title, text, url });
      return "shared" as const;
    }
  } catch {
    // user cancelled or failed → fall through
  }

  try {
    await navigator.clipboard.writeText(url);
    return "copied" as const;
  } catch {
    return "failed" as const;
  }
}
