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

export function applyShopBranding(shop: ShopBranding) {
  const title = shop.name?.trim() || "Barber Pro";
  const description = shop.description?.trim() || `Agendamentos, planos e serviços da ${title}.`;

  document.title = title;
  document.querySelector('meta[name="description"]')?.setAttribute("content", description);
  document.querySelector('meta[property="og:title"]')?.setAttribute("content", title);
  document.querySelector('meta[name="twitter:title"]')?.setAttribute("content", title);
  document.querySelector('meta[property="og:description"]')?.setAttribute("content", description);
  document.querySelector('meta[name="twitter:description"]')?.setAttribute("content", description);

  if (shop.logo_url) {
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