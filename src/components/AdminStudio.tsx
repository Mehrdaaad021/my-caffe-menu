import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  CheckCircle2,
  ClipboardList,
  Coffee,
  Edit3,
  FolderPlus,
  GripVertical,
  ImagePlus,
  KeyRound,
  LayoutGrid,
  LogOut,
  Palette,
  Plus,
  Printer,
  QrCode,
  ScrollText,
  Search,
  Settings,
  Sparkles,
  Store,
  Trash2,
  TrendingUp,
  Upload,
  Volume2,
  VolumeX,
  X,
} from '@/src/components/ClayCafeIcons';
import type {
  CustomerOrder,
  LiveTableMonitorResponse,
  MenuCategory,
  MenuDatabase,
  MenuItem,
  RestaurantSettings,
} from '@/src/types/menu';
import {
  announceNewOrder,
  playTestVoiceAlert,
  unlockVoiceAudio,
} from '@/src/lib/voiceNotification';
import { resolveMenuImage, STUDIO_3D_PRESETS } from '@/src/lib/imageAssets';
import { useTransparent3DCutout } from '@/src/lib/cutout3d';
import { formatPriceFa, toPersianDigits } from '@/src/lib/formatters';
import { QRCodeStudio } from '@/src/components/QRCodeStudio';
import { TableDashboard } from '@/src/components/TableDashboard';
import { LiveTableMonitor } from '@/src/components/LiveTableMonitor';
import { OrdersDashboard } from '@/src/components/OrdersDashboard';
import {
  PopularPairingsDashboard,
  type SuggestedMenuItemTemplate,
} from '@/src/components/PopularPairingsDashboard';
import { AppContentCustomizer } from '@/src/components/AppContentCustomizer';
import { VintagePrintMenuModal } from '@/src/components/VintagePrintMenuModal';
import { FontCustomizerPanel } from '@/src/components/FontCustomizerPanel';
import { SeoSettingsPanel } from '@/src/components/SeoSettingsPanel';
import { AdminAnalyticsDashboard } from '@/src/components/AdminAnalyticsDashboard';
import { applyAppFonts } from '@/src/lib/fontPresets';
import { applyCafeSeoHead } from '@/src/lib/seoHead';

interface AdminStudioProps {
  menu: MenuDatabase;
  token: string | null;
  onTokenChange: (token: string | null, cafeSlug?: string) => void;
  onMenuUpdated: (nextMenu: MenuDatabase) => void;
  onBackToMenu: () => void;
}

type AdminTab =
  | 'items'
  | 'monitor'
  | 'analytics'
  | 'categories'
  | 'tables'
  | 'orders'
  | 'pairings'
  | 'content'
  | 'qr'
  | 'settings';

interface ItemDraft {
  id?: string;
  categoryId: string;
  nameFa: string;
  nameEn: string;
  descriptionFa: string;
  price: string;
  prepTimeMinutes: string;
  calories: string;
  ingredientsText: string;
  imageUrl: string;
  isSignature: boolean;
  isAvailable: boolean;
}

const AdminRowThumb: React.FC<{ imageUrl: string; name: string }> = ({ imageUrl, name }) => {
  const { cutoutSrc } = useTransparent3DCutout(resolveMenuImage(imageUrl));
  return (
    <div className="paper-recess h-16 w-16 shrink-0 overflow-hidden rounded-xl p-1">
      <img
        src={cutoutSrc}
        alt={name}
        referrerPolicy="no-referrer"
        className="paper-cutout-shadow h-full w-full object-contain"
      />
    </div>
  );
};

const DraftPreviewImg: React.FC<{ imageUrl: string; alt: string }> = ({ imageUrl, alt }) => {
  const { cutoutSrc } = useTransparent3DCutout(resolveMenuImage(imageUrl));
  return (
    <img
      src={cutoutSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      style={{ filter: 'drop-shadow(0 16px 12px rgba(43, 27, 18, 0.24))' }}
      className="relative z-10 h-44 w-44 object-contain"
    />
  );
};

export const AdminStudio: React.FC<AdminStudioProps> = ({
  menu,
  token,
  onTokenChange,
  onMenuUpdated,
  onBackToMenu,
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [loginSlug, setLoginSlug] = useState(menu.cafeSlug);
  useEffect(() => {
    setLoginSlug(menu.cafeSlug);
  }, [menu.cafeSlug]);
  const [passcode, setPasscode] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [regForm, setRegForm] = useState({
    nameFa: '',
    nameEn: '',
    slug: '',
    ownerName: '',
    ownerPhone: '',
    passcode: '',
    tableCount: '12',
  });
  const [regLoading, setRegLoading] = useState(false);
  const [regSuccess, setRegSuccess] = useState('');
  const [regError, setRegError] = useState('');

  const [activeTab, setActiveTab] = useState<AdminTab>('items');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCat, setFilterCat] = useState('all');

  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [inlinePriceValue, setInlinePriceValue] = useState<string>('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null,
  );

  const [draft, setDraft] = useState<ItemDraft | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [newCatFa, setNewCatFa] = useState('');
  const [newCatEn, setNewCatEn] = useState('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatFa, setEditingCatFa] = useState('');
  const [editingCatEn, setEditingCatEn] = useState('');

  const [settingsForm, setSettingsForm] = useState<RestaurantSettings>(menu.settings);
  const [newAdminPasscode, setNewAdminPasscode] = useState('');
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [savingFonts, setSavingFonts] = useState(false);
  const [savingSeo, setSavingSeo] = useState(false);

  useEffect(() => {
    setSettingsForm(menu.settings);
  }, [menu.settings]);

  const [orderedCategories, setOrderedCategories] = useState<MenuCategory[]>(() =>
    [...menu.categories].sort((a, b) => a.order - b.order),
  );
  const [draggingCatId, setDraggingCatId] = useState<string | null>(null);
  const [dragOverCatId, setDragOverCatId] = useState<string | null>(null);
  const [savingCatOrder, setSavingCatOrder] = useState(false);

  useEffect(() => {
    setOrderedCategories([...menu.categories].sort((a, b) => a.order - b.order));
  }, [menu.categories]);

  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('cafe_voice_alert');
    return saved === null ? true : saved === 'true';
  });
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [liveActiveTablesCount, setLiveActiveTablesCount] = useState(0);
  const knownOrderIdsRef = useRef<Set<string> | null>(null);

  const showFeedback = useCallback((type: 'ok' | 'err', text: string) => {
    setFeedbackBanner({ type, text });
    setTimeout(() => {
      setFeedbackBanner((curr) => (curr?.text === text ? null : curr));
    }, 3500);
  }, []);

  const authHeaders = useMemo(
    () => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token ?? ''}`,
    }),
    [token],
  );

  const toggleVoiceAlerts = useCallback(async () => {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    localStorage.setItem('cafe_voice_alert', String(next));
    if (next) {
      await unlockVoiceAudio();
      showFeedback('ok', 'اعلان صوتی سفارش جدید فعال شد.');
    } else {
      showFeedback('ok', 'اعلان صوتی سفارش‌ها خاموش شد.');
    }
  }, [voiceEnabled, showFeedback]);

  const handleTestVoice = useCallback(async () => {
    await playTestVoiceAlert();
    showFeedback('ok', 'صدای هشدار سفارش جدید پخش شد.');
  }, [showFeedback]);

  useEffect(() => {
    if (!token) {
      knownOrderIdsRef.current = null;
      setPendingOrdersCount(0);
      setLiveActiveTablesCount(0);
      return;
    }

    let cancelled = false;

    const pollOrderAlerts = async () => {
      try {
        const [ordersRes, liveRes] = await Promise.all([
          fetch('/api/admin/orders', { headers: authHeaders }),
          fetch('/api/admin/live-tables', { headers: authHeaders }),
        ]);

        if (!cancelled && liveRes.ok) {
          const liveData = (await liveRes.json()) as LiveTableMonitorResponse;
          if (liveData?.stats) {
            setLiveActiveTablesCount(liveData.stats.activeTablesCount);
          }
        }

        if (!ordersRes.ok) return;
        const data = (await ordersRes.json()) as { orders?: CustomerOrder[] };
        if (cancelled || !data.orders) return;

        const pendingList = data.orders.filter((o) => o.status === 'pending');
        setPendingOrdersCount(pendingList.length);

        const nextIds = new Set(data.orders.map((o) => o.id));
        const prevIds = knownOrderIdsRef.current;

        if (prevIds === null) {
          knownOrderIdsRef.current = nextIds;
          return;
        }

        const newlyArrived = data.orders.filter(
          (o) => o.status === 'pending' && !prevIds.has(o.id),
        );
        knownOrderIdsRef.current = nextIds;

        if (newlyArrived.length > 0) {
          const newest = newlyArrived[0];
          const tableLabel = newest.tableNumber
            ? `میز شماره ${toPersianDigits(newest.tableNumber)}`
            : 'بیرون‌بر';
          showFeedback('ok', `سفارش جدید (#${newest.orderNumber} - ${tableLabel}) ثبت شد.`);
          if (voiceEnabled) {
            announceNewOrder(newest);
          }
        }
      } catch {
        // Silent background poll retry on next interval
      }
    };

    void pollOrderAlerts();
    const intervalId = window.setInterval(pollOrderAlerts, 6000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [token, authHeaders, voiceEnabled, showFeedback]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode, cafeSlug: loginSlug }),
      });
      const data = (await res.json()) as {
        token?: string;
        cafeSlug?: string;
        menu?: MenuDatabase;
        error?: string;
      };
      if (!res.ok || !data.token) {
        setAuthError(data.error || 'خطا در ورود به پنل مدیریت');
        return;
      }
      localStorage.setItem('ors_admin_token', data.token);
      void unlockVoiceAudio();
      if (data.menu) {
        onMenuUpdated(data.menu);
      }
      onTokenChange(data.token, data.cafeSlug);
      setPasscode('');
    } catch {
      setAuthError('ارتباط با سرور برقرار نشد.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegisterCafe = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    setRegSuccess('');
    setRegLoading(true);
    try {
      const res = await fetch('/api/cafes/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...regForm,
          tableCount: Number(regForm.tableCount) || 12,
        }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) {
        setRegError(data.error || 'ثبت درخواست با خطا مواجه شد.');
        return;
      }
      setRegSuccess(
        data.message ||
          'درخواست کافی‌شاپ شما ثبت شد و پس از تأیید مالک پلتفرم فعال خواهد شد.',
      );
      setRegForm({
        nameFa: '',
        nameEn: '',
        slug: '',
        ownerName: '',
        ownerPhone: '',
        passcode: '',
        tableCount: '12',
      });
    } catch {
      setRegError('ارتباط با سرور برقرار نشد.');
    } finally {
      setRegLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('ors_admin_token');
    onTokenChange(null);
  };

  const openCreateModal = () => {
    setDraft({
      categoryId: menu.categories[0]?.id ?? '',
      nameFa: '',
      nameEn: '',
      descriptionFa: '',
      price: '320000',
      prepTimeMinutes: '10',
      calories: '',
      ingredientsText: '',
      imageUrl: STUDIO_3D_PRESETS[0].key,
      isSignature: false,
      isAvailable: true,
    });
  };

  const openSuggestedItemModal = (template: SuggestedMenuItemTemplate) => {
    setDraft({
      categoryId: template.categoryId || (menu.categories[0]?.id ?? ''),
      nameFa: template.nameFa,
      nameEn: template.nameEn,
      descriptionFa: template.descriptionFa,
      price: template.price,
      prepTimeMinutes: template.prepTimeMinutes,
      calories: '',
      ingredientsText: template.ingredientsText,
      imageUrl: template.imageUrl || STUDIO_3D_PRESETS[0].key,
      isSignature: template.isSignature,
      isAvailable: true,
    });
  };

  const openEditModal = (item: MenuItem) => {
    setDraft({
      id: item.id,
      categoryId: item.categoryId,
      nameFa: item.nameFa,
      nameEn: item.nameEn,
      descriptionFa: item.descriptionFa,
      price: String(item.price),
      prepTimeMinutes: String(item.prepTimeMinutes),
      calories: item.calories ? String(item.calories) : '',
      ingredientsText: item.ingredientsFa.join('، '),
      imageUrl: item.imageUrl,
      isSignature: item.isSignature,
      isAvailable: item.isAvailable,
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !draft) return;
    setUploadingImage(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('خواندن فایل ناموفق بود'));
        reader.readAsDataURL(file);
      });

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ dataUrl }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        showFeedback('err', data.error || 'آپلود تصویر ناموفق بود.');
        return;
      }
      setDraft((prev) => (prev ? { ...prev, imageUrl: data.url! } : prev));
      showFeedback('ok', 'تصویر محصول با موفقیت آپلود شد.');
    } catch {
      showFeedback('err', 'خطا در آپلود تصویر.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    setSavingDraft(true);
    try {
      const payload = {
        categoryId: draft.categoryId,
        nameFa: draft.nameFa.trim(),
        nameEn: draft.nameEn.trim(),
        descriptionFa: draft.descriptionFa.trim(),
        price: Number(draft.price),
        prepTimeMinutes: Number(draft.prepTimeMinutes) || 10,
        calories: draft.calories ? Number(draft.calories) : undefined,
        ingredientsFa: draft.ingredientsText
          .split(/[،,·]/)
          .map((s) => s.trim())
          .filter(Boolean),
        imageUrl: draft.imageUrl.trim(),
        isSignature: draft.isSignature,
        isAvailable: draft.isAvailable,
      };

      const url = draft.id ? `/api/menu/items/${draft.id}` : '/api/menu/items';
      const method = draft.id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: authHeaders,
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { menu?: MenuDatabase; error?: string };
      if (res.status === 401) {
        handleLogout();
        return;
      }
      if (!res.ok || !data.menu) {
        showFeedback('err', data.error || 'ذخیره آیتم با خطا مواجه شد.');
        return;
      }
      onMenuUpdated(data.menu);
      setDraft(null);
      showFeedback('ok', draft.id ? 'آیتم با موفقیت ویرایش شد.' : 'آیتم جدید به منو اضافه شد.');
    } catch {
      showFeedback('err', 'ارتباط با سرور برقرار نشد.');
    } finally {
      setSavingDraft(false);
    }
  };

  const handleQuickPriceSave = async (itemId: string) => {
    const numeric = Number(inlinePriceValue);
    if (!Number.isFinite(numeric) || numeric < 0) {
      showFeedback('err', 'لطفاً یک مبلغ معتبر وارد کنید.');
      return;
    }
    try {
      const res = await fetch(`/api/menu/items/${itemId}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ price: numeric }),
      });
      const data = (await res.json()) as { menu?: MenuDatabase; error?: string };
      if (res.status === 401) {
        handleLogout();
        return;
      }
      if (!res.ok || !data.menu) {
        showFeedback('err', data.error || 'به‌روزرسانی قیمت ناموفق بود.');
        return;
      }
      onMenuUpdated(data.menu);
      setEditingPriceId(null);
      showFeedback('ok', 'قیمت آیتم ذخیره شد.');
    } catch {
      showFeedback('err', 'خطا در ذخیره قیمت.');
    }
  };

  const handleToggleItemFlag = async (item: MenuItem, field: 'isAvailable' | 'isSignature') => {
    try {
      const res = await fetch(`/api/menu/items/${item.id}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ [field]: !item[field] }),
      });
      const data = (await res.json()) as { menu?: MenuDatabase; error?: string };
      if (res.status === 401) {
        handleLogout();
        return;
      }
      if (res.ok && data.menu) {
        onMenuUpdated(data.menu);
      }
    } catch {
      showFeedback('err', 'خطا در تغییر وضعیت آیتم.');
    }
  };

  const handleQuickCategoryChange = async (itemId: string, categoryId: string) => {
    try {
      const res = await fetch(`/api/menu/items/${itemId}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ categoryId }),
      });
      const data = (await res.json()) as { menu?: MenuDatabase; error?: string };
      if (res.status === 401) {
        handleLogout();
        return;
      }
      if (!res.ok || !data.menu) {
        showFeedback('err', data.error || 'تغییر دسته‌بندی ناموفق بود.');
        return;
      }
      onMenuUpdated(data.menu);
      showFeedback('ok', 'دسته‌بندی آیتم به‌روزرسانی شد.');
    } catch {
      showFeedback('err', 'خطا در تغییر دسته‌بندی.');
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      const res = await fetch(`/api/menu/items/${id}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      const data = (await res.json()) as MenuDatabase & { error?: string };
      if (res.status === 401) {
        handleLogout();
        return;
      }
      if (!res.ok) {
        showFeedback('err', data.error || 'حذف آیتم ناموفق بود.');
        return;
      }
      onMenuUpdated(data);
      setConfirmDeleteId(null);
      showFeedback('ok', 'آیتم از منو حذف شد.');
    } catch {
      showFeedback('err', 'خطا در حذف آیتم.');
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatFa.trim()) return;
    try {
      const res = await fetch('/api/menu/categories', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ nameFa: newCatFa, nameEn: newCatEn }),
      });
      const data = (await res.json()) as { menu?: MenuDatabase; error?: string };
      if (!res.ok || !data.menu) {
        showFeedback('err', data.error || 'افزودن دسته‌بندی ناموفق بود.');
        return;
      }
      onMenuUpdated(data.menu);
      setNewCatFa('');
      setNewCatEn('');
      showFeedback('ok', 'دسته‌بندی جدید اضافه شد.');
    } catch {
      showFeedback('err', 'خطا در افزودن دسته‌بندی.');
    }
  };

  const handleUpdateCategory = async (
    catId: string,
    payload: { nameFa?: string; nameEn?: string; direction?: 'up' | 'down' },
  ) => {
    try {
      const res = await fetch(`/api/menu/categories/${catId}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as MenuDatabase & { error?: string };
      if (res.status === 401) {
        handleLogout();
        return;
      }
      if (!res.ok) {
        showFeedback('err', data.error || 'ویرایش دسته‌بندی ناموفق بود.');
        return;
      }
      onMenuUpdated(data);
      setEditingCatId(null);
      if (payload.nameFa) {
        showFeedback('ok', 'نام دسته‌بندی ویرایش شد.');
      }
    } catch {
      showFeedback('err', 'خطا در ویرایش دسته‌بندی.');
    }
  };

  const handleDeleteCategory = async (cat: MenuCategory) => {
    try {
      const res = await fetch(`/api/menu/categories/${cat.id}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      const data = (await res.json()) as MenuDatabase & { error?: string };
      if (!res.ok) {
        showFeedback('err', data.error || 'حذف دسته‌بندی امکان‌پذیر نیست.');
        return;
      }
      onMenuUpdated(data);
      showFeedback('ok', 'دسته‌بندی حذف شد و آیتم‌ها به دسته اول منتقل شدند.');
    } catch {
      showFeedback('err', 'خطا در حذف دسته‌بندی.');
    }
  };

  const commitCategoryOrder = useCallback(
    async (nextList: MenuCategory[]) => {
      const prevList = orderedCategories;
      setOrderedCategories(nextList);
      setSavingCatOrder(true);
      try {
        const res = await fetch('/api/menu/categories/reorder', {
          method: 'PUT',
          headers: authHeaders,
          body: JSON.stringify({ categoryIds: nextList.map((c) => c.id) }),
        });
        if (res.status === 401) {
          handleLogout();
          return;
        }
        const data = (await res.json()) as MenuDatabase & { error?: string };
        if (!res.ok) {
          setOrderedCategories(prevList);
          showFeedback('err', data.error || 'ذخیره ترتیب دسته‌بندی‌ها ناموفق بود.');
          return;
        }
        onMenuUpdated(data);
        showFeedback('ok', 'ترتیب نمایش دسته‌بندی‌های منو ذخیره شد.');
      } catch {
        setOrderedCategories(prevList);
        showFeedback('err', 'خطا در ذخیره ترتیب دسته‌بندی‌ها.');
      } finally {
        setSavingCatOrder(false);
      }
    },
    [orderedCategories, authHeaders, onMenuUpdated, showFeedback],
  );

  const handleCategoryDrop = (targetCatId: string) => {
    if (!draggingCatId || draggingCatId === targetCatId) {
      setDraggingCatId(null);
      setDragOverCatId(null);
      return;
    }
    const list = [...orderedCategories];
    const fromIdx = list.findIndex((c) => c.id === draggingCatId);
    const toIdx = list.findIndex((c) => c.id === targetCatId);
    if (fromIdx === -1 || toIdx === -1) {
      setDraggingCatId(null);
      setDragOverCatId(null);
      return;
    }
    const [moved] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, moved);
    setDraggingCatId(null);
    setDragOverCatId(null);
    void commitCategoryOrder(list);
  };

  const handleMoveCategoryByStep = (catId: string, delta: -1 | 1) => {
    const list = [...orderedCategories];
    const idx = list.findIndex((c) => c.id === catId);
    const nextIdx = idx + delta;
    if (idx === -1 || nextIdx < 0 || nextIdx >= list.length) return;
    const [moved] = list.splice(idx, 1);
    list.splice(nextIdx, 0, moved);
    void commitCategoryOrder(list);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/menu/settings', {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({
          settings: settingsForm,
          newPasscode: newAdminPasscode.trim() || undefined,
        }),
      });
      const data = (await res.json()) as MenuDatabase & { refreshedToken?: string; error?: string };
      if (!res.ok) {
        showFeedback('err', data.error || 'ذخیره تنظیمات ناموفق بود.');
        return;
      }
      if (data.refreshedToken) {
        localStorage.setItem('ors_admin_token', data.refreshedToken);
        onTokenChange(data.refreshedToken, data.cafeSlug);
      }
      onMenuUpdated(data);
      setNewAdminPasscode('');
      applyAppFonts(data.settings.fontFa, data.settings.fontEn);
      showFeedback('ok', 'تنظیمات رستوران با موفقیت ذخیره شد.');
    } catch {
      showFeedback('err', 'خطا در ذخیره تنظیمات.');
    }
  };

  const handleSaveFonts = async (fontFa: string, fontEn: string) => {
    setSavingFonts(true);
    try {
      const nextSettings: RestaurantSettings = {
        ...settingsForm,
        fontFa,
        fontEn,
      };
      const res = await fetch('/api/menu/settings', {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ settings: nextSettings }),
      });
      if (res.status === 401) {
        handleLogout();
        return;
      }
      const data = (await res.json()) as MenuDatabase & { error?: string };
      if (!res.ok) {
        showFeedback('err', data.error || 'ذخیره فونت‌ها ناموفق بود.');
        return;
      }
      onMenuUpdated(data);
      setSettingsForm(data.settings);
      applyAppFonts(data.settings.fontFa, data.settings.fontEn);
      showFeedback('ok', 'فونت‌های فارسی و انگلیسی کل اپلیکیشن با موفقیت ذخیره و اعمال شدند.');
    } catch {
      showFeedback('err', 'خطا در ذخیره فونت‌ها.');
    } finally {
      setSavingFonts(false);
    }
  };

  const handleResetFonts = () => {
    setSettingsForm((prev) => ({ ...prev, fontFa: 'vazirmatn', fontEn: 'cormorant' }));
    applyAppFonts('vazirmatn', 'cormorant');
    void handleSaveFonts('vazirmatn', 'cormorant');
  };

  const handleSaveSeo = async (metaTitle: string, metaDescription: string) => {
    setSavingSeo(true);
    try {
      const nextSettings: RestaurantSettings = {
        ...settingsForm,
        metaTitle: metaTitle.trim(),
        metaDescription: metaDescription.trim(),
      };
      const res = await fetch('/api/menu/settings', {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ settings: nextSettings }),
      });
      if (res.status === 401) {
        handleLogout();
        return;
      }
      const data = (await res.json()) as MenuDatabase & { error?: string };
      if (!res.ok) {
        showFeedback('err', data.error || 'ذخیره تنظیمات سئو ناموفق بود.');
        return;
      }
      onMenuUpdated(data);
      setSettingsForm(data.settings);
      applyCafeSeoHead(data);
      showFeedback('ok', 'عنوان و توضیحات سئو ذخیره و در <head> سایت اعمال شدند.');
    } catch {
      showFeedback('err', 'خطا در ذخیره تنظیمات سئو.');
    } finally {
      setSavingSeo(false);
    }
  };

  const handleResetSeo = () => {
    setSettingsForm((prev) => ({ ...prev, metaTitle: '', metaDescription: '' }));
    void handleSaveSeo('', '');
  };

  const categoryNameMap = useMemo(
    () => Object.fromEntries(menu.categories.map((c) => [c.id, c.nameFa])),
    [menu.categories],
  );

  const filteredItems = useMemo(() => {
    return menu.items.filter((item) => {
      const matchCat = filterCat === 'all' || item.categoryId === filterCat;
      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        item.nameFa.toLowerCase().includes(q) ||
        item.nameEn.toLowerCase().includes(q) ||
        item.descriptionFa.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [menu.items, filterCat, searchQuery]);

  if (!token) {
    return (
      <section className="mx-auto flex min-h-[75vh] max-w-lg flex-col justify-center px-6 py-12">
        <div className="paper-sheet rounded-3xl p-6 sm:p-8">
          <div className="paper-sheet-kraft mb-6 flex gap-1.5 rounded-2xl p-1.5">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setAuthError('');
              }}
              className={`flex-1 rounded-xl py-2.5 text-xs font-bold ${
                authMode === 'login' ? 'btn-paper-primary' : 'text-[#5A483C]'
              }`}
            >
              ورود مدیر کافی‌شاپ
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('register');
                setRegError('');
                setRegSuccess('');
              }}
              className={`flex-1 rounded-xl py-2.5 text-xs font-bold ${
                authMode === 'register' ? 'btn-paper-primary' : 'text-[#5A483C]'
              }`}
            >
              ثبت‌نام کافی‌شاپ جدید
            </button>
          </div>

          {authMode === 'login' ? (
            <>
              <div className="mb-5 flex items-center gap-3">
                <div className="paper-sheet-kraft flex h-11 w-11 items-center justify-center rounded-2xl text-[#2B1B12]">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-xl font-extrabold text-[#2B1B12]">ورود به پنل مدیریت کافه</h1>
                  <p className="text-xs text-[#6A574A]">
                    هر مدیر فقط به منو و میزهای کافی‌شاپ اختصاصی خود دسترسی دارد.
                  </p>
                </div>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label htmlFor="admin-slug-input" className="mb-1.5 block text-xs font-bold text-[#2B1B12]">
                    شناسه اختصاصی کافی‌شاپ (Slug)
                  </label>
                  <input
                    id="admin-slug-input"
                    type="text"
                    dir="ltr"
                    value={loginSlug}
                    onChange={(e) => setLoginSlug(e.target.value)}
                    placeholder="ors-atelier"
                    required
                    className="paper-recess w-full rounded-xl px-4 py-3 font-mono text-sm font-semibold text-[#2B1B12] focus:outline-2 focus:outline-[#2B1B12]"
                  />
                </div>

                <div>
                  <label htmlFor="admin-passcode-input" className="mb-1.5 block text-xs font-bold text-[#2B1B12]">
                    رمز عبور مدیریت
                  </label>
                  <input
                    id="admin-passcode-input"
                    type="password"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="رمز عبور را وارد کنید..."
                    required
                    className="paper-recess w-full rounded-xl px-4 py-3 text-sm font-semibold text-[#2B1B12] focus:outline-2 focus:outline-[#2B1B12]"
                  />
                </div>

                {authError && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-700">
                    {authError}
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="btn-paper-primary flex-1 rounded-xl px-5 py-3 text-sm font-bold disabled:opacity-60"
                  >
                    {authLoading ? 'در حال بررسی...' : 'ورود به مدیریت'}
                  </button>
                  <button
                    type="button"
                    onClick={onBackToMenu}
                    className="btn-paper-kraft rounded-xl px-4 py-3 text-sm font-bold"
                  >
                    بازگشت
                  </button>
                </div>
              </form>
            </>
          ) : (
            <>
              <div className="mb-5 flex items-center gap-3">
                <div className="paper-sheet-kraft flex h-11 w-11 items-center justify-center rounded-2xl text-[#2B1B12]">
                  <Store className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-xl font-extrabold text-[#2B1B12]">درخواست پنل کافی‌شاپ جدید</h1>
                  <p className="text-xs text-[#6A574A]">
                    پس از ثبت درخواست و تأیید مالک پلتفرم، منوی QR و داشبورد اختصاصی شما فعال می‌شود.
                  </p>
                </div>
              </div>

              {regSuccess ? (
                <div className="paper-sheet-sage space-y-4 rounded-2xl p-5 text-center">
                  <CheckCircle2 className="mx-auto h-8 w-8 text-[#445733]" />
                  <p className="text-sm font-bold text-[#24301B]">{regSuccess}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setRegSuccess('');
                      setAuthMode('login');
                    }}
                    className="btn-paper-primary rounded-xl px-5 py-2.5 text-xs font-bold"
                  >
                    بازگشت به صفحه ورود
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRegisterCafe} className="space-y-3.5">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-bold text-[#2B1B12]">نام کافی‌شاپ (فارسی)</label>
                      <input
                        type="text"
                        required
                        value={regForm.nameFa}
                        onChange={(e) => setRegForm({ ...regForm, nameFa: e.target.value })}
                        placeholder="مثلاً: کافه آرتا"
                        className="paper-recess w-full rounded-xl px-3.5 py-2.5 text-sm text-[#2B1B12] focus:outline-2 focus:outline-[#2B1B12]"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold text-[#2B1B12]">نام انگلیسی</label>
                      <input
                        type="text"
                        dir="ltr"
                        value={regForm.nameEn}
                        onChange={(e) => setRegForm({ ...regForm, nameEn: e.target.value })}
                        placeholder="Cafe Arta"
                        className="paper-recess w-full rounded-xl px-3.5 py-2.5 text-sm text-[#2B1B12] focus:outline-2 focus:outline-[#2B1B12]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold text-[#2B1B12]">
                      شناسه لینک اختصاصی کافه (انگلیسی)
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      required
                      value={regForm.slug}
                      onChange={(e) => setRegForm({ ...regForm, slug: e.target.value })}
                      placeholder="cafe-arta"
                      className="paper-recess w-full rounded-xl px-3.5 py-2.5 font-mono text-sm text-[#2B1B12] focus:outline-2 focus:outline-[#2B1B12]"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-bold text-[#2B1B12]">نام مدیر</label>
                      <input
                        type="text"
                        required
                        value={regForm.ownerName}
                        onChange={(e) => setRegForm({ ...regForm, ownerName: e.target.value })}
                        placeholder="نام کامل"
                        className="paper-recess w-full rounded-xl px-3.5 py-2.5 text-sm text-[#2B1B12] focus:outline-2 focus:outline-[#2B1B12]"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold text-[#2B1B12]">شماره تماس</label>
                      <input
                        type="text"
                        dir="ltr"
                        required
                        value={regForm.ownerPhone}
                        onChange={(e) => setRegForm({ ...regForm, ownerPhone: e.target.value })}
                        placeholder="0912..."
                        className="paper-recess w-full rounded-xl px-3.5 py-2.5 text-sm text-[#2B1B12] focus:outline-2 focus:outline-[#2B1B12]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-bold text-[#2B1B12]">
                        رمز ورود پنل کافه
                      </label>
                      <input
                        type="password"
                        required
                        minLength={4}
                        value={regForm.passcode}
                        onChange={(e) => setRegForm({ ...regForm, passcode: e.target.value })}
                        placeholder="حداقل ۴ کاراکتر"
                        className="paper-recess w-full rounded-xl px-3.5 py-2.5 text-sm text-[#2B1B12] focus:outline-2 focus:outline-[#2B1B12]"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold text-[#2B1B12]">تعداد میزها</label>
                      <input
                        type="number"
                        min={1}
                        max={200}
                        value={regForm.tableCount}
                        onChange={(e) => setRegForm({ ...regForm, tableCount: e.target.value })}
                        className="paper-recess w-full rounded-xl px-3.5 py-2.5 tabular-nums text-sm text-[#2B1B12] focus:outline-2 focus:outline-[#2B1B12]"
                      />
                    </div>
                  </div>

                  {regError && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-700">
                      {regError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={regLoading}
                    className="btn-paper-primary w-full rounded-xl py-3 text-sm font-bold disabled:opacity-60"
                  >
                    {regLoading ? 'در حال ثبت درخواست...' : 'ثبت درخواست و ارسال برای تأیید مالک'}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="admin-shell-content mx-auto max-w-7xl px-3 py-6 sm:px-8 sm:py-10">
      {/* Top Admin Header */}
      <div className="mb-6 flex flex-col gap-4 border-b border-dashed border-[#2B1B12]/15 pb-5 sm:mb-8 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:pb-6">
        <div className="min-w-0">
          <p className="mb-1 text-xs font-bold text-[#96522B]">مدیریت زنده منو و قیمت‌ها</p>
          <h1 className="truncate text-xl font-extrabold text-[#2B1B12] sm:text-3xl">
            پنل مدیریت {menu.settings.nameFa}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="paper-sheet-kraft inline-flex items-center gap-1 rounded-2xl p-1">
            <button
              type="button"
              onClick={() => void toggleVoiceAlerts()}
              className={`inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-bold ${
                voiceEnabled ? 'btn-paper-sage' : 'btn-paper-cream text-[#6A574A]'
              }`}
              title="اعلان صوتی هنگام ثبت سفارش جدید"
            >
              {voiceEnabled ? (
                <Volume2 className="h-3.5 w-3.5" />
              ) : (
                <VolumeX className="h-3.5 w-3.5" />
              )}
              <span>{voiceEnabled ? 'اعلان صوتی: فعال' : 'اعلان صوتی: خاموش'}</span>
            </button>

            <button
              type="button"
              onClick={() => void handleTestVoice()}
              className="btn-paper-cream inline-flex min-h-[40px] items-center whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-bold"
            >
              تست صدا
            </button>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="btn-paper-primary inline-flex min-h-[42px] items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-bold sm:px-4 sm:text-sm"
          >
            <Plus className="h-4 w-4 text-[#E5A77B]" />
            <span>افزودن آیتم جدید</span>
          </button>

          <button
            type="button"
            onClick={onBackToMenu}
            className="btn-paper-kraft inline-flex min-h-[42px] items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-bold sm:px-4 sm:text-sm"
          >
            <span>نمایش منوی مشتری</span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="btn-paper-cream inline-flex min-h-[42px] items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-bold text-rose-700"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>خروج</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackBanner && (
        <div
          className={`mb-6 flex items-center justify-between gap-2 rounded-2xl px-4 py-3 text-xs font-semibold sm:text-sm ${
            feedbackBanner.type === 'ok'
              ? 'paper-sheet-kraft text-[#2B1B12]'
              : 'border border-rose-200 bg-rose-50 text-rose-800'
          }`}
        >
          <span>{feedbackBanner.text}</span>
          <button type="button" onClick={() => setFeedbackBanner(null)} className="shrink-0 p-1">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Segmented Paper Index Tabs */}
      <div className="paper-sheet-kraft no-scrollbar mb-6 flex items-center gap-2 overflow-x-auto rounded-2xl p-1.5 sm:mb-8 sm:flex-wrap">
        <button
          type="button"
          onClick={() => setActiveTab('items')}
          className={`inline-flex min-h-[42px] shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-bold sm:px-4 ${
            activeTab === 'items' ? 'btn-paper-primary' : 'btn-paper-cream'
          }`}
        >
          <Edit3 className="h-3.5 w-3.5" />
          <span>آیتم‌ها و قیمت‌ها ({toPersianDigits(menu.items.length)})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('monitor')}
          className={`inline-flex min-h-[42px] shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-bold sm:px-4 ${
            activeTab === 'monitor' ? 'btn-paper-primary' : 'btn-paper-cream'
          }`}
        >
          <Coffee className="h-3.5 w-3.5" />
          <span>مانیتور زنده میزها</span>
          {liveActiveTablesCount > 0 && (
            <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#536F60] px-1.5 tabular-nums text-[11px] font-extrabold text-white">
              {toPersianDigits(liveActiveTablesCount)}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('categories')}
          className={`inline-flex min-h-[42px] shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-bold sm:px-4 ${
            activeTab === 'categories' ? 'btn-paper-primary' : 'btn-paper-cream'
          }`}
        >
          <FolderPlus className="h-3.5 w-3.5" />
          <span>دسته‌بندی‌ها ({toPersianDigits(menu.categories.length)})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tables')}
          className={`inline-flex min-h-[42px] shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-bold sm:px-4 ${
            activeTab === 'tables' ? 'btn-paper-primary' : 'btn-paper-cream'
          }`}
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          <span>داشبورد میزها ({toPersianDigits(menu.tables?.length ?? menu.settings.tableCount)})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`inline-flex min-h-[42px] shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-bold sm:px-4 ${
            activeTab === 'orders' ? 'btn-paper-primary' : 'btn-paper-cream'
          }`}
        >
          <ClipboardList className="h-3.5 w-3.5" />
          <span>سفارشات مشتریان</span>
          {pendingOrdersCount > 0 && (
            <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#C27445] px-1.5 tabular-nums text-[11px] font-extrabold text-white">
              {toPersianDigits(pendingOrdersCount)}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          className={`inline-flex min-h-[40px] items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-xs font-bold ${
            activeTab === 'analytics' ? 'btn-paper-primary' : 'btn-paper-cream'
          }`}
        >
          <TrendingUp className="h-3.5 w-3.5" />
          <span>داشبورد آمار و فروش</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pairings')}
          className={`inline-flex min-h-[40px] items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-xs font-bold ${
            activeTab === 'pairings' ? 'btn-paper-primary' : 'btn-paper-cream'
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>جفت‌های محبوب طعم</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('content')}
          className={`inline-flex min-h-[40px] items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-xs font-bold ${
            activeTab === 'content' ? 'btn-paper-primary' : 'btn-paper-cream'
          }`}
        >
          <Palette className="h-3.5 w-3.5" />
          <span>شخصی‌سازی کامل منو</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('qr')}
          className={`inline-flex min-h-[40px] items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-xs font-bold ${
            activeTab === 'qr' ? 'btn-paper-primary' : 'btn-paper-cream'
          }`}
        >
          <QrCode className="h-3.5 w-3.5" />
          <span>کدهای QR میزها</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setSettingsForm(menu.settings);
            setActiveTab('settings');
          }}
          className={`inline-flex min-h-[40px] items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-xs font-bold ${
            activeTab === 'settings' ? 'btn-paper-primary' : 'btn-paper-cream'
          }`}
        >
          <Settings className="h-3.5 w-3.5" />
          <span>تنظیمات رستوران</span>
        </button>
      </div>

      {/* Tab 1: Items & Inline Price Management */}
      {activeTab === 'items' && (
        <div className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="paper-recess relative flex-1 rounded-xl sm:max-w-sm">
              <Search className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6A574A]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجوی نام غذا، نوشیدنی یا توضیحات..."
                className="w-full bg-transparent py-2.5 pl-4 pr-10 text-sm font-medium text-[#2B1B12] placeholder:text-[#8E7C6D] focus:outline-none"
              />
            </div>

            <select
              value={filterCat}
              onChange={(e) => setFilterCat(e.target.value)}
              className="paper-sheet rounded-xl px-4 py-2.5 text-sm font-semibold text-[#2B1B12] focus:outline-2 focus:outline-[#2B1B12]"
            >
              <option value="all">همه دسته‌بندی‌ها</option>
              {menu.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nameFa}
                </option>
              ))}
            </select>
          </div>

          {filteredItems.length === 0 ? (
            <div className="paper-sheet rounded-2xl p-12 text-center">
              <p className="mb-3 text-base font-bold text-[#2B1B12]">آیتمی با این مشخصات یافت نشد</p>
              <button
                type="button"
                onClick={openCreateModal}
                className="btn-paper-primary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold"
              >
                <Plus className="h-4 w-4 text-[#E5A77B]" />
                <span>افزودن اولین آیتم</span>
              </button>
            </div>
          ) : (
            <div className="paper-sheet divide-y divide-dashed divide-[#2B1B12]/15 overflow-hidden rounded-3xl">
              {filteredItems.map((item) => {
                const isEditingPrice = editingPriceId === item.id;
                const isConfirmDelete = confirmDeleteId === item.id;

                return (
                  <div
                    key={item.id}
                    className="flex flex-col gap-4 p-4 transition-colors hover:bg-[#F7F1E5]/60 lg:flex-row lg:items-center lg:justify-between lg:px-6"
                  >
                    <div className="flex items-center gap-4">
                      <AdminRowThumb imageUrl={item.imageUrl} name={item.nameFa} />

                      <div className="min-w-0">
                        <div className="mb-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-[#96522B]">
                          <span>{categoryNameMap[item.categoryId] ?? 'سایر'}</span>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums">{toPersianDigits(item.prepTimeMinutes)} دقیقه</span>
                          {item.isSignature && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-bold text-[#2B1B12]">پیشنهاد ویژه</span>
                            </>
                          )}
                        </div>
                        <h3 className="text-base font-extrabold text-[#2B1B12]">{item.nameFa}</h3>
                        <p className="line-clamp-1 text-xs text-[#6A574A]">{item.descriptionFa}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <select
                        aria-label={`دسته‌بندی ${item.nameFa}`}
                        value={item.categoryId}
                        onChange={(e) => handleQuickCategoryChange(item.id, e.target.value)}
                        className="paper-recess min-h-[36px] rounded-xl px-2.5 py-1.5 text-xs font-semibold text-[#2B1B12] focus:outline-2 focus:outline-[#2B1B12]"
                      >
                        {menu.categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.nameFa}
                          </option>
                        ))}
                      </select>

                      {isEditingPrice ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            value={inlinePriceValue}
                            onChange={(e) => setInlinePriceValue(e.target.value)}
                            className="paper-recess w-32 rounded-xl px-2.5 py-1.5 tabular-nums text-sm font-bold text-[#2B1B12] focus:outline-2 focus:outline-[#2B1B12]"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleQuickPriceSave(item.id)}
                            aria-label="ذخیره قیمت"
                            className="btn-paper-primary flex h-8 w-8 items-center justify-center rounded-xl"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingPriceId(null)}
                            aria-label="لغو"
                            className="btn-paper-cream flex h-8 w-8 items-center justify-center rounded-xl"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPriceId(item.id);
                            setInlinePriceValue(String(item.price));
                          }}
                          title="برای ویرایش سریع قیمت کلیک کنید"
                          className="btn-paper-kraft rounded-xl px-3 py-1.5 tabular-nums text-sm font-extrabold"
                        >
                          {formatPriceFa(item.price)} {menu.settings.currencyLabel}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleToggleItemFlag(item, 'isAvailable')}
                        className={`min-h-[36px] whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-bold ${
                          item.isAvailable
                            ? 'paper-sheet-sage text-[#24301B]'
                            : 'btn-paper-cream text-[#6A574A]'
                        }`}
                      >
                        {item.isAvailable ? 'موجود' : 'ناموجود'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleItemFlag(item, 'isSignature')}
                        className={`min-h-[36px] whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-bold ${
                          item.isSignature ? 'btn-paper-primary' : 'btn-paper-cream'
                        }`}
                      >
                        پیشنهاد ویژه
                      </button>

                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        className="btn-paper-cream inline-flex min-h-[36px] items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-bold"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        <span>ویرایش</span>
                      </button>

                      {isConfirmDelete ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white shadow-[0_3px_0_#9f1239]"
                          >
                            حذف قطعی
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="btn-paper-cream rounded-xl px-2.5 py-1.5 text-xs font-bold"
                          >
                            انصراف
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(item.id)}
                          aria-label={`حذف ${item.nameFa}`}
                          className="btn-paper-cream flex h-9 w-9 items-center justify-center rounded-xl text-rose-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Categories */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <form
            onSubmit={handleAddCategory}
            className="paper-sheet space-y-4 rounded-3xl p-6 lg:col-span-5"
          >
            <h2 className="text-lg font-extrabold text-[#2B1B12]">افزودن دسته‌بندی جدید</h2>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-[#2B1B12]">نام فارسی دسته‌بندی</label>
              <input
                type="text"
                required
                value={newCatFa}
                onChange={(e) => setNewCatFa(e.target.value)}
                placeholder="مثلاً: فراپه و اسموتی"
                className="paper-recess w-full rounded-xl px-4 py-2.5 text-sm font-medium text-[#2B1B12] focus:outline-2 focus:outline-[#2B1B12]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-[#2B1B12]">عنوان لاتین (اختیاری)</label>
              <input
                type="text"
                dir="ltr"
                value={newCatEn}
                onChange={(e) => setNewCatEn(e.target.value)}
                placeholder="Frappe & Smoothies"
                className="paper-recess w-full rounded-xl px-4 py-2.5 text-sm font-medium text-[#2B1B12] focus:outline-2 focus:outline-[#2B1B12]"
              />
            </div>
            <button
              type="submit"
              className="btn-paper-primary w-full rounded-xl py-2.5 text-sm font-bold"
            >
              ثبت دسته‌بندی
            </button>
          </form>

          <div className="paper-sheet divide-y divide-dashed divide-[#2B1B12]/15 overflow-hidden rounded-3xl lg:col-span-7">
            {orderedCategories.map((cat, idx) => {
              const count = menu.items.filter((i) => i.categoryId === cat.id).length;
              const isEditingCat = editingCatId === cat.id;
              const isDragging = draggingCatId === cat.id;
              const isDragTarget = dragOverCatId === cat.id && draggingCatId !== cat.id;

              return (
                <div
                  key={cat.id}
                  draggable={!isEditingCat}
                  onDragStart={(e) => {
                    setDraggingCatId(cat.id);
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', cat.id);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (dragOverCatId !== cat.id) setDragOverCatId(cat.id);
                  }}
                  onDragLeave={() => {
                    if (dragOverCatId === cat.id) setDragOverCatId(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleCategoryDrop(cat.id);
                  }}
                  onDragEnd={() => {
                    setDraggingCatId(null);
                    setDragOverCatId(null);
                  }}
                  className={`flex flex-wrap items-center justify-between gap-3 px-6 py-4 transition-all ${
                    isDragging ? 'opacity-45 scale-[0.99]' : ''
                  } ${isDragTarget ? 'bg-[#E3EBE4]/70 ring-2 ring-inset ring-[#5C7A68]/50' : ''}`}
                >
                  {isEditingCat ? (
                    <div className="flex flex-1 flex-wrap items-center gap-2">
                      <input
                        type="text"
                        value={editingCatFa}
                        onChange={(e) => setEditingCatFa(e.target.value)}
                        placeholder="نام فارسی"
                        className="paper-recess min-w-[140px] flex-1 rounded-xl px-3 py-1.5 text-sm font-bold text-[#2B1B12] focus:outline-2 focus:outline-[#2B1B12]"
                      />
                      <input
                        type="text"
                        dir="ltr"
                        value={editingCatEn}
                        onChange={(e) => setEditingCatEn(e.target.value)}
                        placeholder="English name"
                        className="paper-recess min-w-[120px] rounded-xl px-3 py-1.5 text-xs font-medium text-[#2B1B12] focus:outline-2 focus:outline-[#2B1B12]"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateCategory(cat.id, {
                            nameFa: editingCatFa,
                            nameEn: editingCatEn,
                          })
                        }
                        aria-label="ذخیره دسته‌بندی"
                        className="btn-paper-primary flex h-8 w-8 items-center justify-center rounded-xl"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingCatId(null)}
                        aria-label="لغو"
                        className="btn-paper-cream flex h-8 w-8 items-center justify-center rounded-xl"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <span
                          title="بکشید و رها کنید"
                          className="paper-sheet-kraft flex h-8 w-8 shrink-0 cursor-grab items-center justify-center rounded-xl active:cursor-grabbing"
                        >
                          <GripVertical className="h-4 w-4" />
                        </span>
                        <div>
                          <h3 className="text-base font-bold text-[#2B1B12]">{cat.nameFa}</h3>
                          <p className="text-xs text-[#6A574A]">
                            {cat.nameEn} · {toPersianDigits(count)} آیتم
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleUpdateCategory(cat.id, { direction: 'up' })}
                          disabled={idx === 0}
                          aria-label="انتقال به بالا"
                          className="btn-paper-cream flex h-8 w-8 items-center justify-center rounded-xl disabled:opacity-35"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateCategory(cat.id, { direction: 'down' })}
                          disabled={idx === menu.categories.length - 1}
                          aria-label="انتقال به پایین"
                          className="btn-paper-cream flex h-8 w-8 items-center justify-center rounded-xl disabled:opacity-35"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCatId(cat.id);
                            setEditingCatFa(cat.nameFa);
                            setEditingCatEn(cat.nameEn);
                          }}
                          className="btn-paper-cream inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span>ویرایش</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat)}
                          disabled={menu.categories.length <= 1}
                          className="btn-paper-cream inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold text-rose-700 disabled:opacity-40"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>حذف</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab: Live Table Monitor */}
      {activeTab === 'monitor' && (
        <LiveTableMonitor
          currencyLabel={menu.settings.currencyLabel}
          authHeaders={authHeaders}
          onMenuUpdated={onMenuUpdated}
          onUnauthorized={handleLogout}
          onFeedback={showFeedback}
          onActiveCountChange={setLiveActiveTablesCount}
        />
      )}

      {/* Tab 3: Visual Table Occupancy Dashboard */}
      {activeTab === 'tables' && (
        <TableDashboard
          menu={menu}
          authHeaders={authHeaders}
          onMenuUpdated={onMenuUpdated}
          onUnauthorized={handleLogout}
          onFeedback={showFeedback}
        />
      )}

      {/* Tab 4: Customer Orders Dashboard */}
      {activeTab === 'orders' && (
        <OrdersDashboard
          currencyLabel={menu.settings.currencyLabel}
          authHeaders={authHeaders}
          onUnauthorized={handleLogout}
          onFeedback={showFeedback}
          voiceEnabled={voiceEnabled}
          onToggleVoice={() => void toggleVoiceAlerts()}
          onTestVoice={() => void handleTestVoice()}
        />
      )}

      {/* Tab: Analytics Dashboard (Recharts) */}
      {activeTab === 'analytics' && (
        <AdminAnalyticsDashboard
          currencyLabel={menu.settings.currencyLabel}
          authHeaders={authHeaders}
          onUnauthorized={handleLogout}
        />
      )}

      {/* Tab 5: Popular Pairings Analytics */}
      {activeTab === 'pairings' && (
        <PopularPairingsDashboard
          token={token}
          items={menu.items}
          categories={menu.categories}
          currencyLabel={menu.settings.currencyLabel}
          onUnauthorized={handleLogout}
          onCreateSuggestedItem={openSuggestedItemModal}
        />
      )}

      {/* Tab 6: Owner-Gated Full App Content & Images Customizer */}
      {activeTab === 'content' && (
        <AppContentCustomizer
          menu={menu}
          token={token}
          onMenuUpdated={onMenuUpdated}
          onNotify={showFeedback}
          onUnauthorized={handleLogout}
        />
      )}

      {/* Tab 7: Printable Table QR Code Sheets */}
      {activeTab === 'qr' && (
        <div className="paper-sheet rounded-3xl p-6 sm:p-8">
          <QRCodeStudio
            cafeSlug={menu.cafeSlug}
            restaurantNameFa={menu.settings.nameFa}
            restaurantNameEn={menu.settings.nameEn}
            tableCount={menu.settings.tableCount}
            tables={menu.tables}
            generalQrScans={menu.generalQrScans ?? 0}
            brandLogoUrl={menu.contentOverrides?.brandLogoUrl}
            authHeaders={authHeaders}
            onMenuUpdated={onMenuUpdated}
            onUnauthorized={handleLogout}
            onNotify={showFeedback}
          />
        </div>
      )}

      {/* Tab 6: Settings */}
      {activeTab === 'settings' && (
        <div className="ui-smooth-enter space-y-6">
          {/* App-wide Persian & English Font Selector with Live Instant Preview */}
          <FontCustomizerPanel
            cafeNameFa={settingsForm.nameFa || menu.settings.nameFa}
            cafeNameEn={settingsForm.nameEn || menu.settings.nameEn}
            currencyLabel={settingsForm.currencyLabel || menu.settings.currencyLabel}
            selectedFontFa={settingsForm.fontFa ?? menu.settings.fontFa ?? 'vazirmatn'}
            selectedFontEn={settingsForm.fontEn ?? menu.settings.fontEn ?? 'cormorant'}
            savedFontFa={menu.settings.fontFa ?? 'vazirmatn'}
            savedFontEn={menu.settings.fontEn ?? 'cormorant'}
            saving={savingFonts}
            onSelectFontFa={(fontId) =>
              setSettingsForm((prev) => ({ ...prev, fontFa: fontId }))
            }
            onSelectFontEn={(fontId) =>
              setSettingsForm((prev) => ({ ...prev, fontEn: fontId }))
            }
            onSaveFonts={() =>
              void handleSaveFonts(
                settingsForm.fontFa ?? menu.settings.fontFa ?? 'vazirmatn',
                settingsForm.fontEn ?? menu.settings.fontEn ?? 'cormorant',
              )
            }
            onResetFonts={handleResetFonts}
          />

          {/* Per-Cafe SEO Meta Title & Description Settings with Google SERP Preview */}
          <SeoSettingsPanel
            cafeSlug={menu.cafeSlug}
            settings={settingsForm}
            metaTitle={settingsForm.metaTitle ?? ''}
            metaDescription={settingsForm.metaDescription ?? ''}
            savedMetaTitle={menu.settings.metaTitle ?? ''}
            savedMetaDescription={menu.settings.metaDescription ?? ''}
            saving={savingSeo}
            onChangeMetaTitle={(value) =>
              setSettingsForm((prev) => ({ ...prev, metaTitle: value }))
            }
            onChangeMetaDescription={(value) =>
              setSettingsForm((prev) => ({ ...prev, metaDescription: value }))
            }
            onSaveSeo={() =>
              void handleSaveSeo(
                settingsForm.metaTitle ?? '',
                settingsForm.metaDescription ?? '',
              )
            }
            onResetSeo={handleResetSeo}
          />

          <form
            onSubmit={handleSaveSettings}
            className="paper-sheet grid grid-cols-1 gap-6 rounded-3xl p-6 sm:grid-cols-2 sm:p-8"
          >
            <div>
              <label className="mb-1.5 block text-xs font-bold text-[#2B1B12]">نام برند (فارسی)</label>
              <input
                type="text"
                value={settingsForm.nameFa}
                onChange={(e) => setSettingsForm({ ...settingsForm, nameFa: e.target.value })}
                className="paper-recess w-full rounded-xl px-4 py-2.5 text-sm font-medium text-[#2B1B12] focus:outline-2 focus:outline-[#2B1B12]"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-[#2B1B12]">نام برند (لاتین)</label>
              <input
                type="text"
                dir="ltr"
                value={settingsForm.nameEn}
                onChange={(e) => setSettingsForm({ ...settingsForm, nameEn: e.target.value })}
                className="paper-recess w-full rounded-xl px-4 py-2.5 text-sm font-medium text-[#2B1B12] focus:outline-2 focus:outline-[#2B1B12]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-bold text-[#2B1B12]">شعار معرفی در صفحه اول</label>
              <input
                type="text"
                value={settingsForm.taglineFa}
                onChange={(e) => setSettingsForm({ ...settingsForm, taglineFa: e.target.value })}
                className="paper-recess w-full rounded-xl px-4 py-2.5 text-sm font-medium text-[#2B1B12] focus:outline-2 focus:outline-[#2B1B12]"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-[#2B1B12]">نشانی رستوران</label>
              <input
                type="text"
                value={settingsForm.addressFa}
                onChange={(e) => setSettingsForm({ ...settingsForm, addressFa: e.target.value })}
                className="paper-recess w-full rounded-xl px-4 py-2.5 text-sm font-medium text-[#2B1B12] focus:outline-2 focus:outline-[#2B1B12]"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-[#2B1B12]">ساعات کاری</label>
              <input
                type="text"
                value={settingsForm.hoursFa}
                onChange={(e) => setSettingsForm({ ...settingsForm, hoursFa: e.target.value })}
                className="paper-recess w-full rounded-xl px-4 py-2.5 text-sm font-medium text-[#2B1B12] focus:outline-2 focus:outline-[#2B1B12]"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-[#2B1B12]">تعداد میزها (برای QR کد)</label>
              <input
                type="number"
                min={1}
                max={200}
                value={settingsForm.tableCount}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, tableCount: Number(e.target.value) || 1 })
                }
                className="paper-recess w-full rounded-xl px-4 py-2.5 tabular-nums text-sm font-medium text-[#2B1B12] focus:outline-2 focus:outline-[#2B1B12]"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-[#2B1B12]">واحد پول و درصد حق سرویس</label>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={settingsForm.currencyLabel}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, currencyLabel: e.target.value })
                  }
                  className="paper-recess w-full rounded-xl px-4 py-2.5 text-sm font-medium text-[#2B1B12] focus:outline-2 focus:outline-[#2B1B12]"
                />
                <input
                  type="number"
                  min={0}
                  max={30}
                  value={settingsForm.serviceChargePercent}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      serviceChargePercent: Number(e.target.value) || 0,
                    })
                  }
                  className="paper-recess w-full rounded-xl px-4 py-2.5 tabular-nums text-sm font-medium text-[#2B1B12] focus:outline-2 focus:outline-[#2B1B12]"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-bold text-[#2B1B12]">
                تغییر رمز عبور مدیریت (اختیاری - حداقل ۴ کاراکتر)
              </label>
              <input
                type="password"
                value={newAdminPasscode}
                onChange={(e) => setNewAdminPasscode(e.target.value)}
                placeholder="در صورت عدم نیاز به تغییر خالی بگذارید"
                className="paper-recess w-full rounded-xl px-4 py-2.5 text-sm font-medium text-[#2B1B12] focus:outline-2 focus:outline-[#2B1B12]"
              />
            </div>

            <div className="sm:col-span-2">
              <button
                type="submit"
                className="btn-paper-primary rounded-xl px-6 py-3 text-sm font-bold"
              >
                ذخیره تنظیمات رستوران
              </button>
            </div>
          </form>

          {/* Drag-and-Drop Category Display Order Manager Inside Settings */}
          <div className="paper-sheet rounded-3xl p-6 sm:p-8">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-dashed border-[#2B1B12]/15 pb-4">
              <div className="flex items-start gap-3.5">
                <div className="paper-sheet-sage flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl">
                  <GripVertical className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#2B1B12] sm:text-lg">
                    ترتیب نمایش دسته‌بندی‌های منو (کشیدن و رها کردن)
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-[#6A574A]">
                    با گرفتن دستگیره هر ردیف و کشیدن آن به جایگاه دلخواه، ترتیب نمایش بخش‌های منوی مشتری
                    را به‌صورت زنده مرتب کنید.
                  </p>
                </div>
              </div>

              {savingCatOrder && (
                <span className="paper-sheet-kraft rounded-xl px-3 py-1.5 text-xs font-bold text-[#5A483C]">
                  در حال ذخیره ترتیب...
                </span>
              )}
            </div>

            <div className="space-y-2.5">
              {orderedCategories.map((cat, idx) => {
                const itemsCount = menu.items.filter((i) => i.categoryId === cat.id).length;
                const isDragging = draggingCatId === cat.id;
                const isDragTarget = dragOverCatId === cat.id && draggingCatId !== cat.id;

                return (
                  <div
                    key={`settings-dnd-${cat.id}`}
                    draggable
                    onDragStart={(e) => {
                      setDraggingCatId(cat.id);
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', cat.id);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      if (dragOverCatId !== cat.id) setDragOverCatId(cat.id);
                    }}
                    onDragLeave={() => {
                      if (dragOverCatId === cat.id) setDragOverCatId(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleCategoryDrop(cat.id);
                    }}
                    onDragEnd={() => {
                      setDraggingCatId(null);
                      setDragOverCatId(null);
                    }}
                    className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3 transition-all select-none ${
                      isDragTarget
                        ? 'paper-sheet-sage ring-2 ring-[#5C7A68]/60 scale-[1.01]'
                        : 'paper-sheet-kraft hover:brightness-[1.01]'
                    } ${isDragging ? 'opacity-45 scale-[0.98]' : 'cursor-grab active:cursor-grabbing'}`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        title="بکشید و رها کنید"
                        className="btn-paper-cream flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                      >
                        <GripVertical className="h-4 w-4" />
                      </span>

                      <span className="paper-sheet flex h-8 min-w-[32px] items-center justify-center rounded-xl px-2 tabular-nums text-xs font-extrabold text-[#536F60]">
                        #{toPersianDigits(idx + 1)}
                      </span>

                      <div>
                        <div className="text-sm font-extrabold text-[#2B1B12]">{cat.nameFa}</div>
                        <div className="text-[11px] text-[#6A574A]">
                          {cat.nameEn} · {toPersianDigits(itemsCount)} آیتم
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleMoveCategoryByStep(cat.id, -1)}
                        disabled={idx === 0 || savingCatOrder}
                        aria-label={`انتقال ${cat.nameFa} به بالا`}
                        className="btn-paper-cream flex h-8 w-8 items-center justify-center rounded-xl disabled:opacity-35"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveCategoryByStep(cat.id, 1)}
                        disabled={idx === orderedCategories.length - 1 || savingCatOrder}
                        aria-label={`انتقال ${cat.nameFa} به پایین`}
                        className="btn-paper-cream flex h-8 w-8 items-center justify-center rounded-xl disabled:opacity-35"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Print-Ready Classic Vintage Menu Card Inside Settings */}
          <div className="paper-sheet-kraft flex flex-col justify-between gap-5 rounded-3xl p-6 sm:flex-row sm:items-center sm:p-8">
            <div className="flex items-start gap-4">
              <div className="paper-sheet flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[#96522B]">
                <ScrollText className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#2B1B12] sm:text-lg">
                  پیش‌نمایش چاپی منو با استایل کاغذ قدیمی و کلاسیک (Print-Ready / PDF)
                </h3>
                <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[#5A483C]">
                  نسخه آماده چاپ منوی کافه را با حاشیه کلاسیک حکاکی‌شده، فونت‌های تحریری و پس‌زمینه کاغذ
                  کاهی قدیمی (Aged Parchment) یا عاجی مشاهده کنید و خروجی PDF باکیفیت برای چاپ روی میز یا
                  دفترچه منو تهیه نمایید.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setPrintModalOpen(true)}
              className="btn-paper-terracotta inline-flex min-h-[46px] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-5 py-3 text-xs font-extrabold"
            >
              <Printer className="h-4 w-4" />
              <span>پیش‌نمایش چاپی و خروجی PDF</span>
            </button>
          </div>
        </div>
      )}

      {/* Create / Edit Item Modal */}
      {draft && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F130C]/55 p-2.5 backdrop-blur-xs sm:p-4"
          onClick={() => setDraft(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="paper-sheet cafe-shadow-deep max-h-[94dvh] w-full max-w-4xl overflow-y-auto rounded-3xl p-4 sm:p-8"
          >
            <div className="mb-5 flex items-center justify-between border-b border-dashed border-[#2B1B12]/15 pb-3.5 sm:mb-6 sm:pb-4">
              <h2 className="text-lg font-extrabold text-[#2B1B12] sm:text-xl">
                {draft.id ? 'ویرایش آیتم منو' : 'افزودن آیتم جدید به منو'}
              </h2>
              <button
                type="button"
                onClick={() => setDraft(null)}
                className="btn-paper-cream flex h-10 w-10 items-center justify-center rounded-full"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDraft} className="grid grid-cols-1 gap-8 lg:grid-cols-12">
              <div className="space-y-4 lg:col-span-7">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-[#2B1B12]">نام آیتم (فارسی)</label>
                    <input
                      type="text"
                      required
                      value={draft.nameFa}
                      onChange={(e) => setDraft({ ...draft, nameFa: e.target.value })}
                      placeholder="مثلاً: موکا فندق کاراملی"
                      className="paper-recess w-full rounded-xl px-3.5 py-2.5 text-sm font-medium text-[#2B1B12] focus:outline-2 focus:outline-[#2B1B12]"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-[#2B1B12]">عنوان لاتین</label>
                    <input
                      type="text"
                      dir="ltr"
                      value={draft.nameEn}
                      onChange={(e) => setDraft({ ...draft, nameEn: e.target.value })}
                      placeholder="Caramel Hazelnut Mocha"
                      className="paper-recess w-full rounded-xl px-3.5 py-2.5 text-sm font-medium text-[#2B1B12] focus:outline-2 focus:outline-[#2B1B12]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-[#2B1B12]">دسته‌بندی</label>
                    <select
                      value={draft.categoryId}
                      onChange={(e) => setDraft({ ...draft, categoryId: e.target.value })}
                      className="paper-recess w-full rounded-xl px-3.5 py-2.5 text-sm font-medium text-[#2B1B12] focus:outline-2 focus:outline-[#2B1B12]"
                    >
                      {menu.categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nameFa}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-[#2B1B12]">
                      قیمت ({menu.settings.currencyLabel})
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={draft.price}
                      onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                      className="paper-recess w-full rounded-xl px-3.5 py-2.5 tabular-nums text-sm font-bold text-[#2B1B12] focus:outline-2 focus:outline-[#2B1B12]"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-[#2B1B12]">زمان آماده (دقیقه)</label>
                    <input
                      type="number"
                      min={1}
                      max={120}
                      value={draft.prepTimeMinutes}
                      onChange={(e) => setDraft({ ...draft, prepTimeMinutes: e.target.value })}
                      className="paper-recess w-full rounded-xl px-3.5 py-2.5 tabular-nums text-sm font-bold text-[#2B1B12] focus:outline-2 focus:outline-[#2B1B12]"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-[#2B1B12]">توضیحات منو</label>
                  <textarea
                    rows={3}
                    value={draft.descriptionFa}
                    onChange={(e) => setDraft({ ...draft, descriptionFa: e.target.value })}
                    placeholder="توضیح کوتاه و جذاب درباره طعم و بافت غذا یا نوشیدنی..."
                    className="paper-recess w-full rounded-xl px-3.5 py-2.5 text-sm font-medium text-[#2B1B12] focus:outline-2 focus:outline-[#2B1B12]"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-[#2B1B12]">
                    مواد تشکیل‌دهنده (با ویرگول جدا کنید)
                  </label>
                  <input
                    type="text"
                    value={draft.ingredientsText}
                    onChange={(e) => setDraft({ ...draft, ingredientsText: e.target.value })}
                    placeholder="اسپرسو، شیر تازه، فندق برشته، کارامل نمکی"
                    className="paper-recess w-full rounded-xl px-3.5 py-2.5 text-sm font-medium text-[#2B1B12] focus:outline-2 focus:outline-[#2B1B12]"
                  />
                </div>

                <div className="paper-sheet-kraft space-y-3 rounded-2xl p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2B1B12]">
                      <ImagePlus className="h-4 w-4 text-[#96522B]" />
                      <span>تصویر سه‌بعدی محصول</span>
                    </span>

                    <label className="btn-paper-primary inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold">
                      <Upload className="h-3.5 w-3.5 text-[#E5A77B]" />
                      <span>{uploadingImage ? 'در حال آپلود...' : 'آپلود تصویر'}</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <input
                    type="text"
                    dir="ltr"
                    value={draft.imageUrl}
                    onChange={(e) => setDraft({ ...draft, imageUrl: e.target.value })}
                    placeholder="لینک تصویر یا انتخاب از گالری سه‌بعدی زیر"
                    className="paper-sheet w-full rounded-xl px-3 py-2 text-xs text-[#2B1B12] focus:outline-none"
                  />

                  <div className="grid grid-cols-4 gap-2">
                    {STUDIO_3D_PRESETS.map((preset) => (
                      <button
                        key={preset.key}
                        type="button"
                        onClick={() => setDraft({ ...draft, imageUrl: preset.key })}
                        title={preset.labelFa}
                        className={`overflow-hidden rounded-xl p-1 transition-all ${
                          draft.imageUrl === preset.key
                            ? 'paper-sheet ring-2 ring-[#2B1B12]'
                            : 'paper-recess opacity-80 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={preset.src}
                          alt={preset.labelFa}
                          className="aspect-square w-full object-contain"
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-6 pt-1 text-xs font-bold text-[#2B1B12]">
                  <label className="inline-flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={draft.isAvailable}
                      onChange={(e) => setDraft({ ...draft, isAvailable: e.target.checked })}
                      className="h-4 w-4 accent-[#2B1B12]"
                    />
                    <span>موجود در منو</span>
                  </label>
                  <label className="inline-flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={draft.isSignature}
                      onChange={(e) => setDraft({ ...draft, isSignature: e.target.checked })}
                      className="h-4 w-4 accent-[#2B1B12]"
                    />
                    <span>نشان پیشنهاد ویژه</span>
                  </label>
                </div>
              </div>

              {/* Live Paper-Cut 3D Card Preview */}
              <div className="paper-sheet-kraft flex flex-col justify-between rounded-2xl p-6 lg:col-span-5">
                <div>
                  <p className="mb-10 text-center text-xs font-bold text-[#6A574A]">
                    پیش‌نمایش کارت کاغذی سه‌بعدی در منو
                  </p>
                  <div className="paper-sheet relative mx-auto max-w-[260px] rounded-2xl p-3.5">
                    <div className="paper-recess relative mb-3 flex h-40 items-center justify-center rounded-xl">
                      <div className="-mt-8">
                        <DraftPreviewImg
                          imageUrl={draft.imageUrl}
                          alt={draft.nameFa || 'پیش‌نمایش'}
                        />
                      </div>
                    </div>
                    <div className="px-1">
                      <p className="mb-1 text-[11px] font-semibold text-[#96522B]">
                        {categoryNameMap[draft.categoryId] ?? 'دسته‌بندی'} ·{' '}
                        {toPersianDigits(draft.prepTimeMinutes || 10)} دقیقه
                      </p>
                      <h4 className="mb-1 text-base font-extrabold text-[#2B1B12]">
                        {draft.nameFa || 'نام محصول جدید'}
                      </h4>
                      <p className="mb-4 line-clamp-2 text-xs text-[#6A574A]">
                        {draft.descriptionFa || 'توضیحات محصول در اینجا نمایش داده می‌شود.'}
                      </p>
                      <div className="flex items-center justify-between pt-1">
                        <span className="tabular-nums text-sm font-extrabold text-[#2B1B12]">
                          {formatPriceFa(Number(draft.price) || 0)} {menu.settings.currencyLabel}
                        </span>
                        <span className="btn-paper-primary flex h-8 w-8 items-center justify-center rounded-xl text-sm font-bold">
                          +
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={savingDraft}
                    className="btn-paper-primary flex-1 rounded-xl py-3 text-sm font-bold disabled:opacity-60"
                  >
                    {savingDraft ? 'در حال ذخیره...' : draft.id ? 'ثبت تغییرات' : 'افزودن به منو'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraft(null)}
                    className="btn-paper-cream rounded-xl px-4 py-3 text-sm font-bold"
                  >
                    انصراف
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      </section>

      <VintagePrintMenuModal
        open={printModalOpen}
        menu={menu}
        onClose={() => setPrintModalOpen(false)}
      />
    </>
  );
};
