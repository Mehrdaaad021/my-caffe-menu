import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUp,
  ArrowUpLeft,
  Check,
  ClayCafeStorefront,
  Clock,
  Globe,
  LayoutGrid,
  List,
  MapPin,
  Phone,
  QrCode,
  Search,
  Share2,
  ShoppingBag,
  Sparkles,
  X,
} from '@/src/components/ClayCafeIcons';
import type { MenuDatabase, MenuItem, OrderNoteItem } from '@/src/types/menu';
import { resolveMenuImage } from '@/src/lib/imageAssets';
import { resolveAppContent } from '@/src/lib/defaultContent';
import { applyAppFonts } from '@/src/lib/fontPresets';
import { applyCafeSeoHead } from '@/src/lib/seoHead';
import { getLandingTemplatePreset, normalizeLandingTemplate } from '@/src/lib/landingTemplates';
import { formatDigits, formatPrice } from '@/src/lib/formatters';
import {
  applyEnglishMenuTranslation,
  getUiStrings,
  type EnglishMenuTranslation,
  type MenuLanguage,
} from '@/src/lib/menuI18n';
import { HeroSection } from '@/src/components/HeroSection';
import { MenuCard3D } from '@/src/components/MenuCard3D';
import { ItemDetail3DModal } from '@/src/components/ItemDetail3DModal';
import { OrderTrayDrawer } from '@/src/components/OrderTrayDrawer';
import { ShareMenuModal } from '@/src/components/ShareMenuModal';
import { AdminStudio } from '@/src/components/AdminStudio';
import { OwnerPanel } from '@/src/components/OwnerPanel';

function getOrCreateTraySessionId(): string {
  if (typeof window === 'undefined') return 'session_ssr_fallback';
  const storageKey = 'ors_tray_session_id';
  try {
    const existing = sessionStorage.getItem(storageKey);
    if (existing && /^[a-zA-Z0-9_-]{8,64}$/.test(existing)) {
      return existing;
    }
    const generated = `tr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(storageKey, generated);
    return generated;
  } catch {
    return `tr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }
}

function parseRouteFromLocation(): { mode: 'menu' | 'admin' | 'owner'; cafeSlug: string } {
  if (typeof window === 'undefined') {
    return { mode: 'menu', cafeSlug: '' };
  }
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  const params = new URLSearchParams(window.location.search);
  const queryCafe = params.get('cafe')?.trim() || '';
  const queryMode = params.get('mode');

  if (path === '/owner' || path.startsWith('/owner/')) {
    return { mode: 'owner', cafeSlug: queryCafe };
  }
  if (path === '/admin' || path.startsWith('/admin/')) {
    const slugFromPath = path.replace(/^\/admin\/?/, '').split('/')[0]?.trim() || '';
    return { mode: 'admin', cafeSlug: slugFromPath || queryCafe };
  }
  if (path.startsWith('/cafe/')) {
    const slugFromPath = path.replace(/^\/cafe\/?/, '').split('/')[0]?.trim() || '';
    return { mode: 'menu', cafeSlug: slugFromPath || queryCafe };
  }

  if (queryMode === 'owner') return { mode: 'owner', cafeSlug: queryCafe };
  if (queryMode === 'admin') return { mode: 'admin', cafeSlug: queryCafe };
  return { mode: 'menu', cafeSlug: queryCafe };
}

export default function App() {
  const [menu, setMenu] = useState<MenuDatabase | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const initialRoute = useMemo(() => parseRouteFromLocation(), []);
  const [activeCafeSlug, setActiveCafeSlug] = useState<string>(initialRoute.cafeSlug);
  const [mode, setMode] = useState<'menu' | 'admin' | 'owner'>(initialRoute.mode);

  const [tableNumber, setTableNumber] = useState<number | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const t = Number(params.get('table'));
      return Number.isInteger(t) && t > 0 ? t : null;
    }
    return null;
  });

  const [adminToken, setAdminToken] = useState<string | null>(() =>
    typeof window !== 'undefined' ? localStorage.getItem('ors_admin_token') : null,
  );
  const [adminTokenCafeSlug, setAdminTokenCafeSlug] = useState<string | null>(null);

  const [ownerToken, setOwnerToken] = useState<string | null>(() =>
    typeof window !== 'undefined' ? localStorage.getItem('ors_owner_token') : null,
  );

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlySignature, setOnlySignature] = useState(false);
  const [menuLayout, setMenuLayout] = useState<'grid' | 'list'>('grid');
  const [favorites, setFavorites] = useState<string[]>([]);

  const [inspectedItem, setInspectedItem] = useState<MenuItem | null>(null);
  const [trayOpen, setTrayOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [hoveredCardKey, setHoveredCardKey] = useState<string | null>(null);
  const [tray, setTray] = useState<OrderNoteItem[]>([]);
  const [trayToast, setTrayToast] = useState<string | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const [menuLang, setMenuLang] = useState<MenuLanguage>(() =>
    typeof window !== 'undefined' && localStorage.getItem('cafe_menu_lang') === 'en' ? 'en' : 'fa',
  );
  const [translationsBySlug, setTranslationsBySlug] = useState<
    Record<string, EnglishMenuTranslation>
  >({});
  const [translatingMenu, setTranslatingMenu] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);

  const headerRef = useRef<HTMLElement | null>(null);
  const programmaticScrollUntilRef = useRef<number>(0);
  const syncedLayoutRef = useRef<string>('');
  const [traySessionId] = useState<string>(() => getOrCreateTraySessionId());
  const trayStartedAtRef = useRef<string>(new Date().toISOString());
  const hadSyncedTrayRef = useRef<boolean>(false);

  useEffect(() => {
    const effectiveLang: MenuLanguage = mode === 'menu' && menuLang === 'en' ? 'en' : 'fa';
    document.documentElement.dir = effectiveLang === 'en' ? 'ltr' : 'rtl';
    document.documentElement.lang = effectiveLang;
  }, [menuLang, mode]);

  useEffect(() => {
    if (menu?.settings) {
      applyAppFonts(menu.settings.fontFa, menu.settings.fontEn);
    }
  }, [menu?.settings?.fontFa, menu?.settings?.fontEn, mode]);

  useEffect(() => {
    const onScroll = () => {
      setShowScrollTop(window.scrollY > 460);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const fetchMenu = useCallback(
    async (slugOverride?: string) => {
      try {
        setLoadError('');
        const targetSlug = slugOverride !== undefined ? slugOverride : activeCafeSlug;
        const url = targetSlug ? `/api/menu?cafe=${encodeURIComponent(targetSlug)}` : '/api/menu';
        const res = await fetch(url);
        if (!res.ok) throw new Error('خطا در دریافت منو');
        const data = (await res.json()) as MenuDatabase;
        setMenu(data);
        if (!targetSlug && data.cafeSlug) {
          setActiveCafeSlug(data.cafeSlug);
        }
      } catch {
        setLoadError('کافی‌شاپ مورد نظر یافت نشد یا ارتباط با سرور برقرار نیست.');
      } finally {
        setLoading(false);
      }
    },
    [activeCafeSlug],
  );

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  useEffect(() => {
    if (mode !== 'menu' || !menu?.cafeSlug || menu.cafeStatus !== 'approved') return;
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const hasTableParam = params.has('table') && tableNumber !== null && tableNumber > 0;
    const isExplicitGeneralQr = params.get('source') === 'qr' && !hasTableParam;
    if (!hasTableParam && !isExplicitGeneralQr) return;

    const trackedTable = hasTableParam ? tableNumber : 0;
    const sessionKey = `qr_scan_recorded:${menu.cafeSlug}:${trackedTable}`;
    try {
      if (sessionStorage.getItem(sessionKey)) return;
      sessionStorage.setItem(sessionKey, '1');
    } catch {
      // Proceed silently if sessionStorage is restricted
    }

    void fetch('/api/qr/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cafeSlug: menu.cafeSlug,
        tableNumber: trackedTable,
      }),
    }).catch(() => {
      // Non-fatal analytics ping
    });
  }, [mode, menu?.cafeSlug, menu?.cafeStatus, tableNumber]);

  const verifyAdminSession = useCallback((tokenToCheck: string) => {
    fetch('/api/admin/verify', {
      headers: { Authorization: `Bearer ${tokenToCheck}` },
    })
      .then((res) => res.json())
      .then((data: { authenticated?: boolean; cafeSlug?: string; menu?: MenuDatabase }) => {
        if (!data.authenticated) {
          localStorage.removeItem('ors_admin_token');
          setAdminToken(null);
          setAdminTokenCafeSlug(null);
        } else {
          if (data.cafeSlug) {
            setAdminTokenCafeSlug(data.cafeSlug);
          }
          if (data.menu && (!activeCafeSlug || data.cafeSlug === activeCafeSlug)) {
            setMenu(data.menu);
          }
        }
      })
      .catch(() => {
        // Ignore silent check failure
      });
  }, [activeCafeSlug]);

  useEffect(() => {
    if (!adminToken) {
      setAdminTokenCafeSlug(null);
      return;
    }
    verifyAdminSession(adminToken);
  }, [adminToken, verifyAdminSession]);

  useEffect(() => {
    if (!menu?.settings) return;
    const nextDefault = menu.settings.defaultMenuLayout === 'list' ? 'list' : 'grid';
    const layoutKey = `${menu.cafeSlug}:${nextDefault}`;
    if (syncedLayoutRef.current !== layoutKey) {
      syncedLayoutRef.current = layoutKey;
      setMenuLayout(nextDefault);
    }
  }, [menu?.cafeSlug, menu?.settings?.defaultMenuLayout]);

  useEffect(() => {
    if (!ownerToken) return;
    fetch('/api/owner/verify', {
      headers: { Authorization: `Bearer ${ownerToken}` },
    })
      .then((res) => res.json())
      .then((data: { authenticated?: boolean }) => {
        if (!data.authenticated) {
          localStorage.removeItem('ors_owner_token');
          setOwnerToken(null);
        }
      })
      .catch(() => {
        // Ignore silent check failure
      });
  }, [ownerToken]);

  const handleCardHoverChange = useCallback((cardKey: string, hovering: boolean) => {
    setHoveredCardKey((prev) => {
      if (hovering) return cardKey;
      return prev === cardKey ? null : prev;
    });
  }, []);

  useEffect(() => {
    if (inspectedItem || trayOpen || shareOpen || mode !== 'menu') {
      setHoveredCardKey(null);
    }
  }, [inspectedItem, trayOpen, shareOpen, mode]);

  // Real-time live tray synchronization with backend for Admin Live Table Monitor
  useEffect(() => {
    if (mode !== 'menu' || !menu?.cafeSlug || menu.cafeStatus !== 'approved') return;
    if (tray.length === 0 && !hadSyncedTrayRef.current) return;

    const timer = window.setTimeout(() => {
      void fetch('/api/trays/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cafeSlug: menu.cafeSlug,
          sessionId: traySessionId,
          tableNumber,
          startedAt: trayStartedAtRef.current,
          items: tray.map((entry) => ({
            itemId: entry.item.id,
            quantity: entry.quantity,
            note: entry.note,
          })),
        }),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { clearedByAdmin?: boolean; active?: boolean } | null) => {
          if (!data) return;
          if (data.clearedByAdmin) {
            hadSyncedTrayRef.current = false;
            trayStartedAtRef.current = new Date().toISOString();
            setTray([]);
            return;
          }
          hadSyncedTrayRef.current = Boolean(data.active);
          if (!data.active) {
            trayStartedAtRef.current = new Date().toISOString();
          }
        })
        .catch(() => {
          // Non-fatal sync retry on next change
        });
    }, 450);

    return () => window.clearTimeout(timer);
  }, [mode, menu?.cafeSlug, menu?.cafeStatus, tray, tableNumber, traySessionId]);

  const ensureEnglishTranslation = useCallback(
    async (slug: string): Promise<boolean> => {
      if (translationsBySlug[slug]) return true;
      setTranslatingMenu(true);
      setTranslateError(null);
      try {
        const res = await fetch('/api/menu/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cafeSlug: slug }),
        });
        const data = (await res.json()) as {
          translation?: Partial<EnglishMenuTranslation>;
          error?: string;
        } & Partial<EnglishMenuTranslation>;
        const resolved = (data.translation ?? data) as Partial<EnglishMenuTranslation>;
        if (!res.ok || !resolved.settings || !Array.isArray(resolved.items)) {
          const message =
            data.error || 'خطا در ترجمه خودکار منو. لطفاً دقایقی دیگر دوباره تلاش کنید.';
          setTranslateError(message);
          setTimeout(() => {
            setTranslateError((curr) => (curr === message ? null : curr));
          }, 4800);
          return false;
        }
        const translation = resolved as EnglishMenuTranslation;
        setTranslationsBySlug((prev) => ({ ...prev, [slug]: translation }));
        return true;
      } catch {
        const message = 'ارتباط با سرویس ترجمه برقرار نشد.';
        setTranslateError(message);
        setTimeout(() => {
          setTranslateError((curr) => (curr === message ? null : curr));
        }, 4800);
        return false;
      } finally {
        setTranslatingMenu(false);
      }
    },
    [translationsBySlug],
  );

  useEffect(() => {
    if (
      mode === 'menu' &&
      menu &&
      menuLang === 'en' &&
      !translationsBySlug[menu.cafeSlug] &&
      !translatingMenu
    ) {
      void ensureEnglishTranslation(menu.cafeSlug).then((ok) => {
        if (!ok) {
          setMenuLang('fa');
          localStorage.setItem('cafe_menu_lang', 'fa');
        }
      });
    }
  }, [mode, menu, menuLang, translationsBySlug, translatingMenu, ensureEnglishTranslation]);

  const handleToggleMenuLanguage = useCallback(async () => {
    if (!menu || translatingMenu) return;
    if (menuLang === 'en') {
      setMenuLang('fa');
      localStorage.setItem('cafe_menu_lang', 'fa');
      return;
    }
    if (translationsBySlug[menu.cafeSlug]) {
      setMenuLang('en');
      localStorage.setItem('cafe_menu_lang', 'en');
      return;
    }
    const ok = await ensureEnglishTranslation(menu.cafeSlug);
    if (ok) {
      setMenuLang('en');
      localStorage.setItem('cafe_menu_lang', 'en');
    }
  }, [menu, menuLang, translatingMenu, translationsBySlug, ensureEnglishTranslation]);

  const baseAppContent = useMemo(
    () => (menu ? resolveAppContent(menu.settings, menu.contentOverrides) : null),
    [menu],
  );

  const translatedBundle = useMemo(() => {
    if (!menu || !baseAppContent) return null;
    if (mode === 'menu' && menuLang === 'en') {
      const translation = translationsBySlug[menu.cafeSlug];
      if (translation) {
        return applyEnglishMenuTranslation(menu, baseAppContent, translation);
      }
    }
    return { menu, appContent: baseAppContent };
  }, [menu, baseAppContent, mode, menuLang, translationsBySlug]);

  const displayMenu = translatedBundle?.menu ?? menu;
  const appContent = translatedBundle?.appContent ?? baseAppContent;
  const activeLandingTemplate = normalizeLandingTemplate(
    displayMenu?.settings.landingTemplate ?? menu?.settings.landingTemplate,
  );
  const templatePreset = useMemo(
    () => getLandingTemplatePreset(activeLandingTemplate),
    [activeLandingTemplate],
  );
  const activeUiLang: MenuLanguage =
    mode === 'menu' && menuLang === 'en' && Boolean(menu && translationsBySlug[menu.cafeSlug])
      ? 'en'
      : 'fa';
  const ui = useMemo(() => getUiStrings(activeUiLang), [activeUiLang]);

  useEffect(() => {
    if (displayMenu) {
      applyCafeSeoHead(displayMenu);
    }
  }, [displayMenu]);

  const categoryNameMap = useMemo(() => {
    if (!displayMenu) return {} as Record<string, string>;
    return Object.fromEntries(displayMenu.categories.map((c) => [c.id, c.nameFa]));
  }, [displayMenu]);

  const categoryCounts = useMemo(() => {
    if (!displayMenu) return {} as Record<string, number>;
    const counts: Record<string, number> = {};
    for (const item of displayMenu.items) {
      counts[item.categoryId] = (counts[item.categoryId] ?? 0) + 1;
    }
    return counts;
  }, [displayMenu]);

  const popularItems = useMemo(() => {
    if (!displayMenu) return [];
    const sigs = displayMenu.items.filter((i) => i.isSignature && i.isAvailable);
    return (sigs.length >= 3 ? sigs : displayMenu.items).slice(0, 4);
  }, [displayMenu]);

  const filteredItems = useMemo(() => {
    if (!displayMenu) return [];
    const q = searchQuery.trim().toLowerCase();
    return displayMenu.items.filter((item) => {
      const sigMatch = !onlySignature || item.isSignature;
      const queryMatch =
        !q ||
        item.nameFa.toLowerCase().includes(q) ||
        item.nameEn.toLowerCase().includes(q) ||
        item.descriptionFa.toLowerCase().includes(q) ||
        item.ingredientsFa.some((ing) => ing.toLowerCase().includes(q));
      return sigMatch && queryMatch;
    });
  }, [displayMenu, onlySignature, searchQuery]);

  const groupedChapters = useMemo(() => {
    if (!displayMenu) return [];
    const q = searchQuery.trim().toLowerCase();
    return displayMenu.categories
      .map((cat, idx) => ({
        category: cat,
        chapterIndex: idx + 1,
        items: displayMenu.items.filter((item) => {
          if (item.categoryId !== cat.id) return false;
          if (onlySignature && !item.isSignature) return false;
          if (!q) return true;
          return (
            item.nameFa.toLowerCase().includes(q) ||
            item.nameEn.toLowerCase().includes(q) ||
            item.descriptionFa.toLowerCase().includes(q) ||
            item.ingredientsFa.some((ing) => ing.toLowerCase().includes(q))
          );
        }),
      }))
      .filter((group) => group.items.length > 0);
  }, [displayMenu, onlySignature, searchQuery]);

  const scrollToCategorySection = useCallback((categoryId: string) => {
    programmaticScrollUntilRef.current = Date.now() + 720;
    const headerHeight = headerRef.current?.getBoundingClientRect().height ?? 78;
    const targetEl =
      categoryId === 'all'
        ? document.getElementById('menu-catalog')
        : document.getElementById(`category-chapter-${categoryId}`) ||
          document.getElementById('menu-catalog');

    if (!targetEl) return;
    const targetTop = Math.max(
      0,
      window.scrollY + targetEl.getBoundingClientRect().top - headerHeight - 18,
    );
    window.scrollTo({ top: targetTop, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (mode !== 'menu' || groupedChapters.length === 0) return;

    const syncActiveCategoryOnScroll = () => {
      if (Date.now() < programmaticScrollUntilRef.current) return;
      const headerHeight = headerRef.current?.getBoundingClientRect().height ?? 78;
      const thresholdY = headerHeight + 48;

      const chapterEls = Array.from(
        document.querySelectorAll<HTMLElement>('[data-category-chapter]'),
      );
      if (chapterEls.length === 0) return;

      const firstRect = chapterEls[0].getBoundingClientRect();
      if (firstRect.top > thresholdY + 120) {
        setActiveCategory('all');
        return;
      }

      let currentCatId = chapterEls[0].dataset.categoryChapter || 'all';
      for (const el of chapterEls) {
        const rect = el.getBoundingClientRect();
        if (rect.top <= thresholdY) {
          currentCatId = el.dataset.categoryChapter || currentCatId;
        } else {
          break;
        }
      }
      setActiveCategory(currentCatId);
    };

    window.addEventListener('scroll', syncActiveCategoryOnScroll, { passive: true });
    return () => window.removeEventListener('scroll', syncActiveCategoryOnScroll);
  }, [mode, groupedChapters]);

  const heroFeaturedItems = useMemo(() => {
    if (!displayMenu) return [];
    const sigs = displayMenu.items.filter((i) => i.isSignature && i.isAvailable);
    const rest = displayMenu.items.filter((i) => !(i.isSignature && i.isAvailable) && i.isAvailable);
    return [...sigs, ...rest].slice(0, 4);
  }, [displayMenu]);

  const localizedTray = useMemo(() => {
    if (!displayMenu) return tray;
    const itemById = new Map(displayMenu.items.map((i) => [i.id, i]));
    return tray.map((entry) => ({
      ...entry,
      item: itemById.get(entry.item.id) ?? entry.item,
    }));
  }, [tray, displayMenu]);

  const localizedInspectedItem = useMemo(() => {
    if (!inspectedItem || !displayMenu) return null;
    return displayMenu.items.find((i) => i.id === inspectedItem.id) ?? inspectedItem;
  }, [inspectedItem, displayMenu]);

  const trayCount = useMemo(
    () => tray.reduce((sum, entry) => sum + entry.quantity, 0),
    [tray],
  );

  const trayTotal = useMemo(
    () => tray.reduce((sum, entry) => sum + entry.item.price * entry.quantity, 0),
    [tray],
  );

  const trayItemCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const entry of tray) {
      map[entry.item.id] = (map[entry.item.id] ?? 0) + entry.quantity;
    }
    return map;
  }, [tray]);

  const handleToggleFavorite = (itemId: string) => {
    setFavorites((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId],
    );
  };

  const handleAddToTray = (item: MenuItem, quantity = 1, note = '') => {
    const canonicalItem = menu?.items.find((i) => i.id === item.id) ?? item;
    const localizedName =
      displayMenu?.items.find((i) => i.id === item.id)?.nameFa ?? item.nameFa;
    setTray((prev) => {
      if (prev.length === 0) {
        trayStartedAtRef.current = new Date().toISOString();
      }
      const idx = prev.findIndex(
        (entry) => entry.item.id === canonicalItem.id && (entry.note ?? '') === note,
      );
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + quantity };
        return next;
      }
      return [...prev, { item: canonicalItem, quantity, note: note || undefined }];
    });
    const label = ui.addedToast(localizedName);
    setTrayToast(label);
    setTimeout(() => {
      setTrayToast((curr) => (curr === label ? null : curr));
    }, 2400);
  };

  const handleDecrementFromTray = (item: MenuItem) => {
    setTray((prev) => {
      let targetIndex = -1;
      for (let i = prev.length - 1; i >= 0; i--) {
        if (prev[i].item.id === item.id) {
          targetIndex = i;
          break;
        }
      }
      if (targetIndex === -1) return prev;
      return prev
        .map((entry, idx) =>
          idx === targetIndex ? { ...entry, quantity: entry.quantity - 1 } : entry,
        )
        .filter((entry) => entry.quantity > 0);
    });
  };

  const handleUpdateTrayQty = (index: number, delta: number) => {
    setTray((prev) =>
      prev
        .map((entry, idx) =>
          idx === index ? { ...entry, quantity: entry.quantity + delta } : entry,
        )
        .filter((entry) => entry.quantity > 0),
    );
  };

  const switchMode = (nextMode: 'menu' | 'admin' | 'owner') => {
    setMode(nextMode);
    if (nextMode === 'menu') {
      const targetUrl = activeCafeSlug ? `/?cafe=${encodeURIComponent(activeCafeSlug)}` : '/';
      window.history.replaceState({}, '', targetUrl);
      fetchMenu();
    } else if (nextMode === 'admin') {
      const targetUrl = activeCafeSlug ? `/admin/${encodeURIComponent(activeCafeSlug)}` : '/admin';
      window.history.replaceState({}, '', targetUrl);
      if (adminToken) {
        verifyAdminSession(adminToken);
      }
    } else if (nextMode === 'owner') {
      window.history.replaceState({}, '', '/owner');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenCafe = (
    slug: string,
    targetMode: 'menu' | 'admin' = 'menu',
    tableParam: number | null = null,
  ) => {
    setActiveCafeSlug(slug);
    setTableNumber(targetMode === 'menu' ? tableParam : null);
    setTray([]);
    setActiveCategory('all');
    setSearchQuery('');
    const nextUrl =
      targetMode === 'admin'
        ? `/admin/${encodeURIComponent(slug)}`
        : tableParam
          ? `/?cafe=${encodeURIComponent(slug)}&table=${tableParam}`
          : `/?cafe=${encodeURIComponent(slug)}`;
    window.history.replaceState({}, '', nextUrl);
    fetchMenu(slug);
    setMode(targetMode);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="paper-canvas flex min-h-screen items-center justify-center text-[#2B1B12]">
        <div className="paper-sheet rounded-3xl px-10 py-8 text-center">
          <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-[#D9C8AE] border-t-[#536F60]" />
          <p className="font-display-serif text-sm italic text-[#536F60]">MY CAFE</p>
          <p className="mt-1 text-sm font-bold text-[#222E27]">در حال آماده‌سازی منوی کافه من...</p>
        </div>
      </div>
    );
  }

  if (loadError || !menu) {
    return (
      <div className="paper-canvas flex min-h-screen items-center justify-center px-6 text-center text-[#2B1B12]">
        <div className="paper-sheet max-w-md rounded-3xl p-8">
          <p className="mb-4 text-sm font-bold text-[#2B1B12]">
            {loadError || 'اطلاعات منو در دسترس نیست.'}
          </p>
          <button
            type="button"
            onClick={() => {
              setActiveCafeSlug('');
              window.history.replaceState({}, '', '/');
              fetchMenu('');
            }}
            className="btn-paper-primary rounded-xl px-5 py-2.5 text-sm font-bold"
          >
            بازگشت به منوی اصلی
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`paper-canvas min-h-screen overflow-x-clip pb-24 text-[#2B1B12] ${
        mode === 'menu' ? `theme-${activeLandingTemplate}` : ''
      }`}
    >
      {/* Soft Natural Warm Dusk Vignette on Item Hover */}
      <div
        aria-hidden="true"
        className={`no-print pointer-events-none fixed inset-0 z-40 transition-opacity duration-300 ${
          mode === 'menu' && hoveredCardKey && !inspectedItem && !trayOpen && !shareOpen
            ? 'opacity-100'
            : 'opacity-0'
        }`}
        style={{
          background:
            'radial-gradient(circle at 50% 42%, rgba(28, 22, 18, 0.36) 0%, rgba(16, 12, 9, 0.56) 100%)',
        }}
      />

      {/* Luxury Editorial Header (Customer Only — Clean 3-Zone Top Bar) */}
      <header
        ref={headerRef}
        className={`no-print sticky top-0 z-30 border-b backdrop-blur-md transition-colors duration-200 ${
          mode === 'menu' ? templatePreset.headerBg : 'border-[#2B1B12]/10 bg-[#FAF6EE]/92'
        }`}
      >
        {(() => {
          const isDarkHeader = mode === 'menu' && templatePreset.headerTone === 'dark';
          const primaryBtnCls =
            activeLandingTemplate === 'editorial-roastery'
              ? 'bg-[#C87A45] text-[#FFFDF9] hover:bg-[#B76B38]'
              : activeLandingTemplate === 'botanical-minimal'
                ? 'bg-[#243F47] text-[#F8FBFA] hover:bg-[#1A3037]'
                : 'bg-[#2B1E17] text-[#FCF8F1] hover:bg-[#3F2C22]';
          const outlineBtnCls = isDarkHeader
            ? 'border-[#E2A16F]/25 bg-[#2A1B13]/65 text-[#F4E3D1] hover:border-[#E2A16F]/50 hover:bg-[#382419]'
            : 'border-[#2B1B12]/14 bg-white/75 text-[#2B1E17] hover:border-[#2B1B12]/30 hover:bg-white';

          return (
            <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-3 sm:h-[72px] sm:gap-6 sm:px-8">
              {/* Zone 1: Clean Minimal Brand Wordmark */}
              <a
                href="#top"
                onClick={(e) => {
                  e.preventDefault();
                  switchMode('menu');
                }}
                className="flex min-w-0 flex-1 items-center gap-2 whitespace-nowrap sm:flex-initial sm:gap-3"
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border ${
                    isDarkHeader
                      ? 'border-[#E2A16F]/30 bg-[#2A1B13]'
                      : 'border-[#2B1B12]/12 bg-[#F2EBE0]'
                  }`}
                >
                  {appContent?.brandLogoUrl ? (
                    <img
                      src={resolveMenuImage(appContent.brandLogoUrl)}
                      alt={displayMenu?.settings.nameFa ?? menu.settings.nameFa}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ClayCafeStorefront className="h-6 w-6" />
                  )}
                </div>
                <span
                  className={`truncate text-sm font-extrabold tracking-tight sm:text-lg ${
                    isDarkHeader ? 'text-[#FFF8F0]' : 'text-[#221914]'
                  }`}
                >
                  {displayMenu?.settings.nameFa ?? menu.settings.nameFa}
                </span>
              </a>

              {/* Zone 2: Minimal Typography Navigation */}
              {mode === 'menu' && (
                <nav
                  className={`hidden items-center gap-8 text-[13px] font-semibold md:flex ${
                    isDarkHeader ? 'text-[#DFCBB7]' : 'text-[#5C5046]'
                  }`}
                >
                  <a
                    href="#popular-now"
                    className={`shrink-0 whitespace-nowrap py-1 transition-colors ${
                      isDarkHeader ? 'hover:text-[#FFF8F0]' : 'hover:text-[#221914]'
                    }`}
                  >
                    {appContent?.navFeaturedLabel}
                  </a>
                  <a
                    href="#menu-catalog"
                    className={`shrink-0 whitespace-nowrap py-1 transition-colors ${
                      isDarkHeader ? 'hover:text-[#FFF8F0]' : 'hover:text-[#221914]'
                    }`}
                  >
                    {appContent?.navCatalogLabel}
                  </a>
                  <a
                    href="#venue-info"
                    className={`shrink-0 whitespace-nowrap py-1 transition-colors ${
                      isDarkHeader ? 'hover:text-[#FFF8F0]' : 'hover:text-[#221914]'
                    }`}
                  >
                    {appContent?.navInfoLabel}
                  </a>
                </nav>
              )}

              {/* Zone 3: Refined Editorial Utilities & Primary Tray Action */}
              <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
                {mode === 'menu' && (
                  <>
                    <button
                      type="button"
                      onClick={handleToggleMenuLanguage}
                      disabled={translatingMenu}
                      aria-label={ui.translateBtnAria}
                      title={ui.translateBtnAria}
                      className={`inline-flex min-h-[40px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border px-2.5 py-2 text-xs font-semibold transition-colors disabled:opacity-60 sm:px-3 ${outlineBtnCls}`}
                    >
                      <Globe className={`h-4 w-4 ${translatingMenu ? 'animate-spin' : ''}`} />
                      <span className="sm:hidden">
                        {translatingMenu ? '...' : activeUiLang === 'en' ? 'FA' : 'EN'}
                      </span>
                      <span className="hidden sm:inline">
                        {translatingMenu ? ui.translatingLabel : ui.translateBtnLabel}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShareOpen(true)}
                      aria-label={appContent?.headerShareLabel || 'اشتراک‌گذاری منو'}
                      title={ui.shareTitle}
                      className={`inline-flex min-h-[40px] min-w-[40px] shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border px-2.5 py-2 text-xs font-semibold transition-colors sm:px-3.5 ${outlineBtnCls}`}
                    >
                      <Share2 className="h-4 w-4" />
                      <span className="hidden sm:inline">{appContent?.headerShareLabel}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTrayOpen(true)}
                      className={`inline-flex min-h-[40px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-bold shadow-sm transition-colors sm:gap-2 sm:px-5 ${primaryBtnCls}`}
                    >
                      <ShoppingBag className="h-4 w-4" />
                      <span className="sm:hidden">{activeUiLang === 'en' ? 'Tray' : 'سینی'}</span>
                      <span className="hidden sm:inline">{appContent?.headerTrayLabel}</span>
                      {trayCount > 0 && (
                        <span className="tabular-nums border-s border-white/25 ps-1.5 sm:ps-2">
                          {formatDigits(trayCount, activeUiLang)}
                        </span>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })()}
      </header>

      {mode === 'owner' ? (
        <main>
          <OwnerPanel
            ownerToken={ownerToken}
            onOwnerTokenChange={setOwnerToken}
            onOpenCafe={handleOpenCafe}
            onBackToMenu={() => switchMode('menu')}
          />
        </main>
      ) : mode === 'admin' ? (
        <main>
          <AdminStudio
            menu={menu}
            token={adminToken && adminTokenCafeSlug === menu.cafeSlug ? adminToken : null}
            onTokenChange={(nextToken, nextSlug) => {
              setAdminToken(nextToken);
              setAdminTokenCafeSlug(nextSlug ?? null);
              if (nextSlug && nextSlug !== activeCafeSlug) {
                setActiveCafeSlug(nextSlug);
                window.history.replaceState({}, '', `/admin/${encodeURIComponent(nextSlug)}`);
              }
            }}
            onMenuUpdated={(updatedMenu) => {
              setMenu(updatedMenu);
              setTranslationsBySlug((prev) => {
                if (!prev[updatedMenu.cafeSlug]) return prev;
                const next = { ...prev };
                delete next[updatedMenu.cafeSlug];
                return next;
              });
            }}
            onBackToMenu={() => switchMode('menu')}
          />
        </main>
      ) : menu.cafeStatus !== 'approved' ? (
        <main className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center px-6 py-16">
          <div className="paper-sheet rounded-3xl p-8 text-center">
            <h1 className="mb-3 text-2xl font-extrabold text-[#2B1B12]">{menu.settings.nameFa}</h1>
            <p className="text-sm leading-relaxed text-[#6A574A]">
              {menu.cafeStatus === 'pending'
                ? 'منوی دیجیتال این مجموعه به‌زودی فعال خواهد شد.'
                : 'منوی این مجموعه در حال حاضر غیرفعال است.'}
            </p>
          </div>
        </main>
      ) : (
        <main id="top">
          {appContent && displayMenu && (
            <HeroSection
              appContent={appContent}
              taglineFa={displayMenu.settings.taglineFa}
              tableNumber={tableNumber}
              featuredItems={heroFeaturedItems}
              onInspectItem={setInspectedItem}
              lang={activeUiLang}
              templateId={activeLandingTemplate}
            />
          )}

          {/* Cream Paper Sheet Section: Signature Selection */}
          <section
            id="popular-now"
            className={`${templatePreset.popularBg} py-12 shadow-[0_12px_28px_-14px_rgba(43,27,18,0.12)]`}
          >
            <div className="mx-auto max-w-7xl px-4 sm:px-8">
              <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p
                    dir="ltr"
                    className={`font-display-serif text-sm italic tracking-wide text-[#96522B] ${
                      activeUiLang === 'en' ? 'text-left' : 'text-right'
                    }`}
                  >
                    {appContent?.popularEyebrowEn}
                  </p>
                  <h2 className="text-xl font-extrabold text-[#2B1B12] sm:text-2xl">
                    {appContent?.popularTitleFa}
                  </h2>
                </div>
                <a
                  href="#menu-catalog"
                  className="btn-paper-kraft inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold"
                >
                  <span>{appContent?.popularActionFa}</span>
                  <ArrowUpLeft className={`h-3.5 w-3.5 ${activeUiLang === 'en' ? 'rotate-90' : ''}`} />
                </a>
              </div>

              <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-12 lg:grid-cols-4">
                {popularItems.map((item, idx) => {
                  const cardKey = `pop-${item.id}`;
                  return (
                    <MenuCard3D
                      key={cardKey}
                      index={idx}
                      layout="grid"
                      item={item}
                      categoryLabel={categoryNameMap[item.categoryId] ?? ui.itemFallbackCategory}
                      currencyLabel={displayMenu?.settings.currencyLabel ?? menu.settings.currencyLabel}
                      quantityInTray={trayItemCounts[item.id] ?? 0}
                      isFavorite={favorites.includes(item.id)}
                      onToggleFavorite={handleToggleFavorite}
                      onInspect={setInspectedItem}
                      onAddToTray={(selected) => handleAddToTray(selected, 1, '')}
                      onDecrementFromTray={handleDecrementFromTray}
                      onHoverChange={(hovering) => handleCardHoverChange(cardKey, hovering)}
                      lang={activeUiLang}
                      showPrepTime={displayMenu?.settings.showPrepTime ?? true}
                    />
                  );
                })}
              </div>
            </div>
          </section>

          {/* Layered Cut-Paper Wave Transition into Main Catalog */}
          <div aria-hidden="true" className={`w-full overflow-hidden ${templatePreset.popularBg}`}>
            <svg viewBox="0 0 1440 56" preserveAspectRatio="none" className="block h-10 w-full sm:h-12">
              <path
                d="M0,26 C360,54 760,4 1440,34 L1440,56 L0,56 Z"
                fill={templatePreset.waveBackFill}
                className="paper-wave-shadow"
              />
              <path
                d="M0,38 C420,12 960,56 1440,22 L1440,56 L0,56 Z"
                fill={templatePreset.waveFrontFill}
                className="paper-wave-shadow"
              />
            </svg>
          </div>

          {/* Main Paper Catalog Section */}
          <section id="menu-catalog" className="mx-auto max-w-7xl px-3.5 py-10 sm:px-8 sm:py-12">
            {appContent?.menuBannerImageUrl && (
              <div className="paper-sheet mb-8 overflow-hidden rounded-3xl p-2">
                <div className="overflow-hidden rounded-2xl">
                  <img
                    src={resolveMenuImage(appContent.menuBannerImageUrl)}
                    alt={appContent.catalogTitleFa}
                    referrerPolicy="no-referrer"
                    className="h-36 w-full object-cover sm:h-52"
                  />
                </div>
              </div>
            )}

            <div className="mb-8 flex flex-col gap-5">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p
                    dir="ltr"
                    className={`font-display-serif text-sm italic tracking-wide text-[#96522B] ${
                      activeUiLang === 'en' ? 'text-left' : 'text-right'
                    }`}
                  >
                    {appContent?.catalogEyebrowEn}
                  </p>
                  <h2 className="text-xl font-extrabold text-[#2B1B12] sm:text-2xl">
                    {appContent?.catalogTitleFa}
                  </h2>
                </div>

                {/* Tactile Soft-3D Segmented View Switcher (Matches UI Kit Bar) */}
                <div className="paper-sheet inline-flex w-full items-center justify-center gap-1.5 rounded-full p-1.5 sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setMenuLayout('grid')}
                    aria-label={appContent?.menuGridViewLabelFa || ui.galleryView}
                    className={`inline-flex min-h-[40px] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold sm:flex-initial ${
                      menuLayout === 'grid' ? 'btn-paper-primary' : 'text-[#55665B] hover:text-[#222E27]'
                    }`}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    <span>{appContent?.menuGridViewLabelFa || ui.galleryView}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMenuLayout('list')}
                    aria-label={appContent?.menuListViewLabelFa || ui.listView}
                    className={`inline-flex min-h-[40px] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold sm:flex-initial ${
                      menuLayout === 'list' ? 'btn-paper-slate' : 'text-[#55665B] hover:text-[#222E27]'
                    }`}
                  >
                    <List className="h-3.5 w-3.5" />
                    <span>{appContent?.menuListViewLabelFa || ui.listView}</span>
                  </button>
                </div>
              </div>

              {/* Clean Lavender-Rim Recessed Search & Signature Filter Pill Bar */}
              <div className="paper-sheet flex flex-col gap-2.5 rounded-3xl p-2.5 sm:flex-row sm:items-center">
                <div className="paper-recess relative flex-1 rounded-full">
                  <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#536F60]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={appContent?.searchPlaceholderFa}
                    className="min-h-[42px] w-full bg-transparent py-2 pe-10 ps-11 text-sm font-medium text-[#222E27] placeholder:text-[#6B7A70] focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      aria-label={activeUiLang === 'en' ? 'Clear search' : 'پاک کردن جستجو'}
                      className="btn-paper-cream absolute end-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-[#222E27]"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setOnlySignature((prev) => !prev)}
                  className={`inline-flex min-h-[42px] shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-5 text-xs font-bold ${
                    onlySignature ? 'btn-paper-lavender' : 'btn-paper-kraft'
                  }`}
                >
                  <Sparkles
                    className={`h-3.5 w-3.5 ${onlySignature ? 'text-white' : 'text-[#536F60]'}`}
                  />
                  <span>{appContent?.heroFilterSignatureLabelFa}</span>
                </button>
              </div>

              {/* Soft-3D Capsule Category Index Rail */}
              <div className="no-scrollbar flex items-center gap-2.5 overflow-x-auto pb-2.5 pt-1">
                <button
                  type="button"
                  onClick={(e) => {
                    setActiveCategory('all');
                    e.currentTarget.scrollIntoView({
                      behavior: 'smooth',
                      inline: 'center',
                      block: 'nearest',
                    });
                    scrollToCategorySection('all');
                  }}
                  className={`inline-flex min-h-[42px] shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold ${
                    activeCategory === 'all' ? 'btn-paper-primary' : 'btn-paper-cream'
                  }`}
                >
                  <span>{appContent?.catalogAllChaptersFa}</span>
                  <span
                    className={`tabular-nums text-[11px] ${
                      activeCategory === 'all' ? 'text-[#DCE6DD]' : 'text-[#647369]'
                    }`}
                  >
                    ({formatDigits(displayMenu?.items.length ?? menu.items.length, activeUiLang)})
                  </span>
                </button>

                {(displayMenu?.categories ?? menu.categories).map((cat) => {
                  const isActive = activeCategory === cat.id;
                  const count = categoryCounts[cat.id] ?? 0;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={(e) => {
                        setActiveCategory(cat.id);
                        e.currentTarget.scrollIntoView({
                          behavior: 'smooth',
                          inline: 'center',
                          block: 'nearest',
                        });
                        scrollToCategorySection(cat.id);
                      }}
                      className={`inline-flex min-h-[42px] shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold ${
                        isActive ? 'btn-paper-primary' : 'btn-paper-cream'
                      }`}
                    >
                      <span>{cat.nameFa}</span>
                      <span
                        className={`tabular-nums text-[11px] ${
                          isActive ? 'text-[#DCE6DD]' : 'text-[#647369]'
                        }`}
                      >
                        ({formatDigits(count, activeUiLang)})
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {groupedChapters.length > 0 ? (
              <div className="space-y-14">
                {groupedChapters.map(({ category, chapterIndex, items }) => (
                  <div
                    key={category.id}
                    id={`category-chapter-${category.id}`}
                    data-category-chapter={category.id}
                    className="scroll-mt-24 space-y-6"
                  >
                    {/* Cut-Paper Chapter Tab Divider */}
                    <div className="flex items-center gap-3">
                      <span className="paper-sheet-kraft font-display-serif flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base font-bold italic text-[#96522B] tabular-nums">
                        {formatDigits(String(chapterIndex).padStart(2, '0'), activeUiLang)}
                      </span>
                      <h3 className="shrink-0 text-lg font-extrabold text-[#2B1B12] sm:text-xl">
                        {category.nameFa}
                      </h3>
                      <div className="h-px flex-1 border-b border-dashed border-[#2B1B12]/20" />
                      <span className="paper-sheet shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold text-[#6A574A] tabular-nums">
                        {formatDigits(items.length, activeUiLang)} {ui.itemsUnit}
                      </span>
                    </div>

                    <div
                      className={
                        menuLayout === 'list'
                          ? 'grid grid-cols-1 gap-x-10 gap-y-6 lg:grid-cols-2'
                          : 'grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3'
                      }
                    >
                      {items.map((item, idx) => {
                        const cardKey = `${menuLayout}-grp-${item.id}`;
                        return (
                          <MenuCard3D
                            key={cardKey}
                            index={idx}
                            layout={menuLayout}
                            item={item}
                            categoryLabel={category.nameFa}
                            currencyLabel={
                              displayMenu?.settings.currencyLabel ?? menu.settings.currencyLabel
                            }
                            quantityInTray={trayItemCounts[item.id] ?? 0}
                            isFavorite={favorites.includes(item.id)}
                            onToggleFavorite={handleToggleFavorite}
                            onInspect={setInspectedItem}
                            onAddToTray={(selected) => handleAddToTray(selected, 1, '')}
                            onDecrementFromTray={handleDecrementFromTray}
                            onHoverChange={(hovering) => handleCardHoverChange(cardKey, hovering)}
                            lang={activeUiLang}
                            showPrepTime={displayMenu?.settings.showPrepTime ?? true}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="paper-sheet rounded-3xl p-12 text-center">
                <p className="font-display-serif mb-1 text-base italic text-[#96522B]">
                  No Paper Card Found
                </p>
                <p className="mb-4 text-base font-extrabold text-[#2B1B12]">
                  {appContent?.emptySearchTitleFa || ui.noItemFoundTitle}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveCategory('all');
                    setSearchQuery('');
                    setOnlySignature(false);
                  }}
                  className="btn-paper-primary rounded-full px-6 py-2.5 text-xs font-bold"
                >
                  {ui.resetMenuBtn}
                </button>
              </div>
            ) : (
              <div
                className={
                  menuLayout === 'list'
                    ? 'grid grid-cols-1 gap-x-10 gap-y-6 lg:grid-cols-2'
                    : 'grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3'
                }
              >
                {filteredItems.map((item, idx) => {
                  const cardKey = `${menuLayout}-flt-${item.id}`;
                  return (
                    <MenuCard3D
                      key={cardKey}
                      index={idx}
                      layout={menuLayout}
                      item={item}
                      categoryLabel={categoryNameMap[item.categoryId] ?? ui.itemFallbackCategory}
                      currencyLabel={
                        displayMenu?.settings.currencyLabel ?? menu.settings.currencyLabel
                      }
                      quantityInTray={trayItemCounts[item.id] ?? 0}
                      isFavorite={favorites.includes(item.id)}
                      onToggleFavorite={handleToggleFavorite}
                      onInspect={setInspectedItem}
                      onAddToTray={(selected) => handleAddToTray(selected, 1, '')}
                      onDecrementFromTray={handleDecrementFromTray}
                      onHoverChange={(hovering) => handleCardHoverChange(cardKey, hovering)}
                      lang={activeUiLang}
                      showPrepTime={displayMenu?.settings.showPrepTime ?? true}
                    />
                  );
                })}
              </div>
            )}
          </section>

          {/* Layered Paper Craftsmanship & Contact Info Section */}
          <section
            id="venue-info"
            className="mx-auto max-w-7xl px-4 pb-14 pt-4 sm:px-8"
          >
            <div className="mb-5">
              <h2 className="text-xl font-extrabold text-[#2B1B12] sm:text-2xl">
                {appContent?.infoSectionTitleFa}
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
              {appContent?.infoSectionImageUrl && (
                <div className="paper-sheet overflow-hidden rounded-3xl p-2.5 lg:col-span-4">
                  <img
                    src={resolveMenuImage(appContent.infoSectionImageUrl)}
                    alt={appContent.infoSectionTitleFa}
                    referrerPolicy="no-referrer"
                    className="h-full min-h-[210px] w-full rounded-2xl object-cover"
                  />
                </div>
              )}

              <div
                className={`grid grid-cols-1 gap-5 sm:grid-cols-2 ${
                  appContent?.infoSectionImageUrl ? 'lg:col-span-8' : 'lg:col-span-12 lg:grid-cols-4'
                }`}
              >
                <div className="paper-sheet rounded-3xl p-6">
                  <div className="mb-2.5 inline-flex items-center gap-2.5 text-xs font-bold text-[#536F60]">
                    <MapPin className="h-6 w-6" />
                    <span>{appContent?.infoAddressTitleFa}</span>
                  </div>
                  <p className="text-sm font-semibold leading-relaxed text-[#222E27]">
                    {displayMenu?.settings.addressFa ?? menu.settings.addressFa}
                  </p>
                </div>

                <div className="paper-sheet-kraft rounded-3xl p-6">
                  <div className="mb-2.5 inline-flex items-center gap-2.5 text-xs font-bold text-[#222E27]">
                    <Clock className="h-6 w-6" />
                    <span>{appContent?.infoHoursTitleFa}</span>
                  </div>
                  <p className="text-sm font-semibold leading-relaxed text-[#222E27]">
                    {displayMenu?.settings.hoursFa ?? menu.settings.hoursFa}
                  </p>
                </div>

                <div className="paper-sheet rounded-3xl p-6">
                  <div className="mb-2.5 inline-flex items-center gap-2.5 text-xs font-bold text-[#536F60]">
                    <Phone className="h-6 w-6" />
                    <span>{appContent?.infoPhoneTitleFa}</span>
                  </div>
                  <p dir="ltr" className="text-start tabular-nums text-sm font-extrabold text-[#222E27]">
                    {appContent?.infoPhoneValueFa}
                  </p>
                </div>

                <div className="paper-sheet-sage rounded-3xl p-6">
                  <div className="mb-2.5 inline-flex items-center gap-2.5 text-xs font-bold text-[#354428]">
                    <QrCode className="h-6 w-6" />
                    <span>{appContent?.infoQrTitleFa}</span>
                  </div>
                  <p className="text-xs leading-6 text-[#354428]">
                    {appContent?.infoQrDescFa}
                  </p>
                </div>
              </div>
            </div>
          </section>
        </main>
      )}

      {/* Layered Paper Footer (No Admin/Owner links exposed) */}
      <footer className="no-print paper-sheet-kraft px-4 py-8 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-xs font-medium text-[#5A483C] sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-[#2B1B12]">
              {displayMenu?.settings.nameFa ?? menu.settings.nameFa}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              © {activeUiLang === 'en' ? '2026' : formatDigits(1405, 'fa')} {appContent?.footerCopyFa}
            </span>
          </div>
          <p dir="ltr" className="font-display-serif text-sm italic text-[#96522B]">
            {menu.settings.nameEn} · {appContent?.footerTaglineEn}
          </p>
        </div>
      </footer>

      {/* Translation Error Toast */}
      {mode === 'menu' && translateError && (
        <div className="no-print ui-smooth-enter fixed left-1/2 top-16 z-40 flex w-max max-w-[calc(100vw-24px)] -translate-x-1/2 items-center gap-2.5 rounded-full border border-[#8D3922]/30 bg-[#FDFCF9]/95 px-4 py-2 shadow-[0_14px_28px_-8px_rgba(38,52,43,0.24)] backdrop-blur-xs sm:top-20">
          <span className="truncate text-xs font-bold text-[#8D3922]">{translateError}</span>
          <button
            type="button"
            onClick={() => setTranslateError(null)}
            aria-label="Close"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#EFE7DA] text-[#2B1B12]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Smooth Friendly Toast Feedback on Tray Action */}
      {mode === 'menu' && trayToast && !trayOpen && !translateError && (
        <div className="no-print ui-smooth-enter fixed left-1/2 top-16 z-30 flex w-max max-w-[calc(100vw-24px)] -translate-x-1/2 items-center gap-2 rounded-full border border-[#536F60]/25 bg-[#FDFCF9]/95 px-3.5 py-2 shadow-[0_14px_28px_-8px_rgba(38,52,43,0.24)] backdrop-blur-xs sm:top-20 sm:gap-2.5 sm:px-4">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#4E6B5B] text-white">
            <Check className="h-3.5 w-3.5" />
          </span>
          <span className="truncate text-xs font-bold text-[#222E27]">{trayToast}</span>
          <button
            type="button"
            onClick={() => setTrayOpen(true)}
            className="shrink-0 whitespace-nowrap rounded-full bg-[#DCE6DD] px-2.5 py-1 text-[11px] font-extrabold text-[#2B4236] hover:bg-[#CBD7CD]"
          >
            {ui
              .trayShortLabel(trayCount)
              .replace(String(trayCount), formatDigits(trayCount, activeUiLang))}
          </button>
        </div>
      )}

      {/* Smooth Scroll-To-Top Floating Clay Button */}
      {mode === 'menu' && showScrollTop && !inspectedItem && !trayOpen && !shareOpen && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label={ui.scrollTopLabel}
          title={ui.scrollTopLabel}
          className={`no-print ui-smooth-enter btn-paper-cream fixed left-4 z-30 flex h-11 w-11 items-center justify-center rounded-full sm:left-8 ${
            trayCount > 0 ? 'bottom-20 sm:bottom-6' : 'bottom-6'
          }`}
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      )}

      {/* Floating Tactile Sage Order Tray Bar */}
      {mode === 'menu' && trayCount > 0 && !trayOpen && (
        <div className="no-print ui-smooth-enter fixed inset-x-0 bottom-3 z-30 mx-auto max-w-md px-3 sm:bottom-5 sm:px-4">
          <button
            type="button"
            onClick={() => setTrayOpen(true)}
            className="btn-paper-primary flex min-h-[48px] w-full items-center justify-between gap-2 rounded-full px-5 py-3 sm:px-6 sm:py-3.5"
          >
            <span className="inline-flex items-center gap-2 text-xs font-bold sm:gap-2.5 sm:text-sm">
              <ShoppingBag className="h-4 w-4 shrink-0 text-[#DCE6DD]" />
              <span className="truncate">
                {ui
                  .viewTrayLabel(trayCount)
                  .replace(String(trayCount), formatDigits(trayCount, activeUiLang))}
              </span>
            </span>
            <span className="shrink-0 tabular-nums text-xs font-extrabold text-[#EEF4EE] sm:text-sm">
              {formatPrice(trayTotal, activeUiLang)}{' '}
              {displayMenu?.settings.currencyLabel ?? menu.settings.currencyLabel}
            </span>
          </button>
        </div>
      )}

      {/* 3D Product Customize & Inspection Modal */}
      <ItemDetail3DModal
        item={localizedInspectedItem}
        allItems={displayMenu?.items ?? menu.items}
        categories={displayMenu?.categories ?? menu.categories}
        categoryLabel={localizedInspectedItem ? categoryNameMap[localizedInspectedItem.categoryId] ?? '' : ''}
        currencyLabel={displayMenu?.settings.currencyLabel ?? menu.settings.currencyLabel}
        isFavorite={localizedInspectedItem ? favorites.includes(localizedInspectedItem.id) : false}
        onToggleFavorite={handleToggleFavorite}
        onSelectItem={setInspectedItem}
        onClose={() => setInspectedItem(null)}
        onAdd={handleAddToTray}
        lang={activeUiLang}
        showPrepTime={displayMenu?.settings.showPrepTime ?? true}
        showCalories={displayMenu?.settings.showCalories ?? true}
      />

      {/* Slide-over Table Order Tray with Complementary Suggestions */}
      <OrderTrayDrawer
        open={trayOpen}
        cafeSlug={menu.cafeSlug}
        items={localizedTray}
        allItems={displayMenu?.items ?? menu.items}
        categories={displayMenu?.categories ?? menu.categories}
        tableNumber={tableNumber}
        tableCount={menu.settings.tableCount}
        sessionId={traySessionId}
        currencyLabel={displayMenu?.settings.currencyLabel ?? menu.settings.currencyLabel}
        serviceChargePercent={menu.settings.serviceChargePercent}
        onClose={() => setTrayOpen(false)}
        onSelectTable={setTableNumber}
        onAddItem={(selected) => handleAddToTray(selected, 1, '')}
        onUpdateQty={handleUpdateTrayQty}
        onRemoveItem={(idx) => setTray((prev) => prev.filter((_, i) => i !== idx))}
        onClearAll={() => setTray([])}
        lang={activeUiLang}
      />

      {/* Social & SMS Share Menu Modal */}
      <ShareMenuModal
        open={shareOpen}
        cafeNameFa={displayMenu?.settings.nameFa ?? menu.settings.nameFa}
        cafeNameEn={menu.settings.nameEn}
        cafeSlug={menu.cafeSlug}
        tableNumber={tableNumber}
        onClose={() => setShareOpen(false)}
      />
    </div>
  );
}
