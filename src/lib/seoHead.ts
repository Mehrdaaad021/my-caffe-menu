import type { MenuDatabase, RestaurantSettings } from '@/src/types/menu';

export interface ResolvedCafeSeo {
  title: string;
  description: string;
  siteName: string;
  canonicalUrl: string;
}

export function resolveDefaultCafeSeo(settings: RestaurantSettings): {
  title: string;
  description: string;
} {
  const brand = settings.nameFa?.trim() || 'کافه من';
  const tagline = settings.taglineFa?.trim();
  const hours = settings.hoursFa?.trim();
  const address = settings.addressFa?.trim();

  const defaultTitle = `${brand} | منوی دیجیتال و سفارش سه‌بعدی`;
  const detailBits = [tagline, address, hours].filter(Boolean).join(' · ');
  const defaultDescription =
    detailBits ||
    `مشاهده منوی آنلاین ${brand} با پیش‌نمایش سه‌بعدی، انتخاب سریع نوشیدنی و غذا و ثبت سفارش از روی میز با QR کد.`;

  return {
    title: defaultTitle,
    description: defaultDescription.slice(0, 220),
  };
}

export function resolveCafeSeo(menu: Pick<MenuDatabase, 'cafeSlug' | 'settings'>): ResolvedCafeSeo {
  const defaults = resolveDefaultCafeSeo(menu.settings);
  const customTitle = menu.settings.metaTitle?.trim();
  const customDesc = menu.settings.metaDescription?.trim();
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
  const canonicalUrl =
    typeof window !== 'undefined'
      ? menu.cafeSlug && pathname === '/'
        ? `${origin}/?cafe=${encodeURIComponent(menu.cafeSlug)}`
        : `${origin}${pathname}`
      : '';

  return {
    title: customTitle || defaults.title,
    description: customDesc || defaults.description,
    siteName: menu.settings.nameFa?.trim() || 'کافه من',
    canonicalUrl,
  };
}

function upsertMetaTag(attrName: 'name' | 'property', attrValue: string, content: string): void {
  if (typeof document === 'undefined') return;
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attrName}="${attrValue}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attrName, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonicalLink(href: string): void {
  if (typeof document === 'undefined' || !href) return;
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
}

function upsertJsonLd(menu: MenuDatabase, seo: ResolvedCafeSeo): void {
  if (typeof document === 'undefined') return;
  const scriptId = 'cafe-seo-jsonld';
  let script = document.getElementById(scriptId) as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement('script');
    script.id = scriptId;
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CafeOrCoffeeShop',
    name: seo.siteName,
    alternateName: menu.settings.nameEn,
    description: seo.description,
    url: seo.canonicalUrl || undefined,
    address: menu.settings.addressFa
      ? {
          '@type': 'PostalAddress',
          streetAddress: menu.settings.addressFa,
        }
      : undefined,
    openingHours: menu.settings.hoursFa || undefined,
    servesCuisine: 'Specialty Coffee & Cafe Menu',
    hasMenu: seo.canonicalUrl || undefined,
  };

  script.textContent = JSON.stringify(structuredData);
}

export function applyCafeSeoHead(menu: MenuDatabase | null | undefined): void {
  if (typeof document === 'undefined' || !menu) return;
  const seo = resolveCafeSeo(menu);

  document.title = seo.title;
  upsertMetaTag('name', 'description', seo.description);
  upsertMetaTag('property', 'og:type', 'website');
  upsertMetaTag('property', 'og:site_name', seo.siteName);
  upsertMetaTag('property', 'og:title', seo.title);
  upsertMetaTag('property', 'og:description', seo.description);
  upsertMetaTag('name', 'twitter:card', 'summary_large_image');
  upsertMetaTag('name', 'twitter:title', seo.title);
  upsertMetaTag('name', 'twitter:description', seo.description);

  if (seo.canonicalUrl) {
    upsertMetaTag('property', 'og:url', seo.canonicalUrl);
    upsertCanonicalLink(seo.canonicalUrl);
  }

  upsertJsonLd(menu, seo);
}
