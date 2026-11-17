import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  KeyRound,
  Lock,
  LogOut,
  Palette,
  PauseCircle,
  Plus,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Store,
  Trash2,
  Upload,
  UserCheck,
  X,
} from '@/src/components/ClayCafeIcons';
import type { CafeStatus, CafeSummary, LandingTemplateId } from '@/src/types/menu';
import { toPersianDigits } from '@/src/lib/formatters';
import { getLandingTemplatePreset, normalizeLandingTemplate } from '@/src/lib/landingTemplates';
import { LandingTemplateCards } from '@/src/components/LandingTemplateCards';
import { OwnerLandingCustomizerModal } from '@/src/components/OwnerLandingCustomizerModal';
import { OwnerQrGeneratorSection } from '@/src/components/OwnerQrGeneratorSection';

interface OwnerPanelProps {
  ownerToken: string | null;
  onOwnerTokenChange: (token: string | null) => void;
  onOpenCafe: (slug: string, targetMode?: 'menu' | 'admin', tableParam?: number | null) => void;
  onBackToMenu: () => void;
}

const STATUS_BADGE: Record<CafeStatus, { label: string; cls: string }> = {
  approved: {
    label: 'تأییدشده و فعال',
    cls: 'paper-sheet-sage text-[#24301B]',
  },
  pending: {
    label: 'در انتظار تأیید مالک',
    cls: 'bg-[#F5E1CF] text-[#824421] border border-[#C27445]/40',
  },
  suspended: {
    label: 'معلق / غیرفعال',
    cls: 'border border-rose-200 bg-rose-50 text-rose-700',
  },
};

export const OwnerPanel: React.FC<OwnerPanelProps> = ({
  ownerToken,
  onOwnerTokenChange,
  onOpenCafe,
  onBackToMenu,
}) => {
  const [passcode, setPasscode] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [cafes, setCafes] = useState<CafeSummary[]>([]);
  const [loadingCafes, setLoadingCafes] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | CafeStatus>('all');
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newCafe, setNewCafe] = useState({
    nameFa: '',
    nameEn: '',
    slug: '',
    ownerName: '',
    ownerPhone: '',
    passcode: '',
    tableCount: '12',
    status: 'approved' as CafeStatus,
    allowContentCustomization: false,
  });

  const [resetPassModal, setResetPassModal] = useState<CafeSummary | null>(null);
  const [cafeNewPasscode, setCafeNewPasscode] = useState('');

  const [ownerNewPasscode, setOwnerNewPasscode] = useState('');
  const [showOwnerPassBox, setShowOwnerPassBox] = useState(false);
  const [landingCafe, setLandingCafe] = useState<CafeSummary | null>(null);
  const [selectedTemplateCafeId, setSelectedTemplateCafeId] = useState<string>('');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const showToast = (type: 'ok' | 'err', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => {
      setFeedback((curr) => (curr?.text === text ? null : curr));
    }, 3800);
  };

  const authHeaders = useMemo(
    () => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken ?? ''}`,
    }),
    [ownerToken],
  );

  const fetchCafes = useCallback(async () => {
    if (!ownerToken) return;
    setLoadingCafes(true);
    try {
      const res = await fetch('/api/owner/cafes', {
        headers: { Authorization: `Bearer ${ownerToken}` },
      });
      if (res.status === 401) {
        localStorage.removeItem('ors_owner_token');
        onOwnerTokenChange(null);
        return;
      }
      const data = (await res.json()) as { cafes?: CafeSummary[] };
      if (res.ok && data.cafes) {
        setCafes(data.cafes);
      }
    } catch {
      showToast('err', 'خطا در دریافت فهرست کافی‌شاپ‌ها.');
    } finally {
      setLoadingCafes(false);
    }
  }, [ownerToken, onOwnerTokenChange]);

  useEffect(() => {
    if (ownerToken) {
      fetchCafes();
    }
  }, [ownerToken, fetchCafes]);

  useEffect(() => {
    if (cafes.length === 0) {
      setSelectedTemplateCafeId('');
      return;
    }
    if (!cafes.some((c) => c.id === selectedTemplateCafeId)) {
      setSelectedTemplateCafeId(cafes[0].id);
    }
  }, [cafes, selectedTemplateCafeId]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      const res = await fetch('/api/owner/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode }),
      });
      const data = (await res.json()) as { token?: string; error?: string };
      if (!res.ok || !data.token) {
        setAuthError(data.error || 'رمز مالک پلتفرم نادرست است.');
        return;
      }
      localStorage.setItem('ors_owner_token', data.token);
      onOwnerTokenChange(data.token);
      setPasscode('');
    } catch {
      setAuthError('ارتباط با سرور برقرار نشد.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('ors_owner_token');
    onOwnerTokenChange(null);
  };

  const handleStatusChange = async (cafeId: string, status: CafeStatus) => {
    try {
      const res = await fetch(`/api/owner/cafes/${cafeId}/status`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ status }),
      });
      const data = (await res.json()) as { cafes?: CafeSummary[]; error?: string };
      if (!res.ok || !data.cafes) {
        showToast('err', data.error || 'تغییر وضعیت ناموفق بود.');
        return;
      }
      setCafes(data.cafes);
      showToast(
        'ok',
        status === 'approved'
          ? 'کافی‌شاپ تأیید و منو و پنل مدیریت آن فعال شد.'
          : status === 'suspended'
            ? 'دسترسی کافی‌شاپ موقتاً معلق شد.'
            : 'وضعیت به در انتظار تأیید تغییر یافت.',
      );
    } catch {
      showToast('err', 'ارتباط با سرور برقرار نشد.');
    }
  };

  const handleToggleCustomizationPermission = async (
    cafeId: string,
    nextAllowed: boolean,
  ) => {
    try {
      const res = await fetch(`/api/owner/cafes/${cafeId}/customization-permission`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ allowContentCustomization: nextAllowed }),
      });
      const data = (await res.json()) as { cafes?: CafeSummary[]; error?: string };
      if (!res.ok || !data.cafes) {
        showToast('err', data.error || 'تغییر مجوز شخصی‌سازی ناموفق بود.');
        return;
      }
      setCafes(data.cafes);
      showToast(
        'ok',
        nextAllowed
          ? 'اجازه شخصی‌سازی متن‌ها و تصاویر اپلیکیشن برای ادمین این کافه فعال شد.'
          : 'دسترسی شخصی‌سازی متن و تصاویر برای این کافه بسته شد.',
      );
    } catch {
      showToast('err', 'ارتباط با سرور برقرار نشد.');
    }
  };

  const handleSelectCafeTemplate = async (
    cafeId: string,
    landingTemplate: LandingTemplateId,
  ) => {
    setSavingTemplate(true);
    try {
      const res = await fetch(`/api/owner/cafes/${cafeId}/template`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ landingTemplate }),
      });
      if (res.status === 401) {
        handleLogout();
        return;
      }
      const data = (await res.json()) as { cafes?: CafeSummary[]; error?: string };
      if (!res.ok || !data.cafes) {
        showToast('err', data.error || 'تغییر قالب لندینگ‌پیج ناموفق بود.');
        return;
      }
      setCafes(data.cafes);
      const target = data.cafes.find((c) => c.id === cafeId);
      const preset = getLandingTemplatePreset(landingTemplate);
      showToast(
        'ok',
        `قالب «${preset.titleFa}» برای لندینگ‌پیج «${target?.nameFa ?? 'کافه'}» فعال شد.`,
      );
    } catch {
      showToast('err', 'ارتباط با سرور برای تغییر قالب برقرار نشد.');
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleDeleteCafe = async (cafeId: string) => {
    try {
      const res = await fetch(`/api/owner/cafes/${cafeId}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      const data = (await res.json()) as { cafes?: CafeSummary[]; error?: string };
      if (!res.ok || !data.cafes) {
        showToast('err', data.error || 'حذف کافی‌شاپ امکان‌پذیر نیست.');
        return;
      }
      setCafes(data.cafes);
      showToast('ok', 'کافی‌شاپ از پلتفرم حذف شد.');
    } catch {
      showToast('err', 'خطا در حذف کافی‌شاپ.');
    }
  };

  const handleCreateCafe = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch('/api/owner/cafes', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          ...newCafe,
          tableCount: Number(newCafe.tableCount) || 12,
        }),
      });
      const data = (await res.json()) as { cafes?: CafeSummary[]; error?: string };
      if (!res.ok || !data.cafes) {
        showToast('err', data.error || 'ثبت کافی‌شاپ ناموفق بود.');
        return;
      }
      setCafes(data.cafes);
      setCreateOpen(false);
      setNewCafe({
        nameFa: '',
        nameEn: '',
        slug: '',
        ownerName: '',
        ownerPhone: '',
        passcode: '',
        tableCount: '12',
        status: 'approved',
        allowContentCustomization: false,
      });
      showToast('ok', 'کافی‌شاپ جدید با موفقیت به پلتفرم اضافه شد.');
    } catch {
      showToast('err', 'خطا در ثبت کافی‌شاپ جدید.');
    } finally {
      setCreating(false);
    }
  };

  const handleResetCafePasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPassModal) return;
    try {
      const res = await fetch(`/api/owner/cafes/${resetPassModal.id}/passcode`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ newPasscode: cafeNewPasscode }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        showToast('err', data.error || 'تغییر رمز ناموفق بود.');
        return;
      }
      setResetPassModal(null);
      setCafeNewPasscode('');
      showToast('ok', `رمز مدیریت ${resetPassModal.nameFa} تغییر یافت.`);
    } catch {
      showToast('err', 'خطا در تغییر رمز ادمین.');
    }
  };

  const handleUpdateOwnerPasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/owner/passcode', {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ newPasscode: ownerNewPasscode }),
      });
      const data = (await res.json()) as { ok?: boolean; token?: string; error?: string };
      if (!res.ok) {
        showToast('err', data.error || 'تغییر رمز مالک ناموفق بود.');
        return;
      }
      if (data.token) {
        localStorage.setItem('ors_owner_token', data.token);
        onOwnerTokenChange(data.token);
      }
      setOwnerNewPasscode('');
      setShowOwnerPassBox(false);
      showToast('ok', 'رمز عبور اختصاصی مالک پلتفرم به‌روزرسانی شد.');
    } catch {
      showToast('err', 'خطا در تغییر رمز مالک.');
    }
  };

  const handleDownloadBackup = async () => {
    if (!ownerToken) return;
    setBackingUp(true);
    try {
      const res = await fetch('/api/owner/backup', {
        headers: { Authorization: `Bearer ${ownerToken}` },
      });
      if (res.status === 401) {
        handleLogout();
        return;
      }
      if (!res.ok) {
        showToast('err', 'تهیه نسخه پشتیبان ناموفق بود.');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mycafe-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast('ok', 'فایل پشتیبان کامل دیتابیس دانلود شد.');
    } catch {
      showToast('err', 'خطا در دانلود فایل پشتیبان.');
    } finally {
      setBackingUp(false);
    }
  };

  const handleRestoreBackup = async (file?: File) => {
    if (!file || !ownerToken) return;
    setRestoring(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      const res = await fetch('/api/owner/restore', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(parsed),
      });
      if (res.status === 401) {
        handleLogout();
        return;
      }
      const data = (await res.json()) as { ok?: boolean; cafes?: CafeSummary[]; error?: string };
      if (!res.ok || !data.cafes) {
        showToast('err', data.error || 'بازیابی فایل پشتیبان ناموفق بود.');
        return;
      }
      setCafes(data.cafes);
      showToast('ok', 'دیتابیس با موفقیت از نسخه پشتیبان بازیابی شد.');
    } catch {
      showToast('err', 'فایل انتخاب‌شده JSON معتبر نیست.');
    } finally {
      setRestoring(false);
    }
  };

  const copyLink = async (key: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      // Ignored cleanly
    }
  };

  const stats = useMemo(() => {
    return {
      total: cafes.length,
      approved: cafes.filter((c) => c.status === 'approved').length,
      pending: cafes.filter((c) => c.status === 'pending').length,
      totalTables: cafes.reduce((sum, c) => sum + c.tableCount, 0),
    };
  }, [cafes]);

  const filteredCafes = useMemo(() => {
    if (filterStatus === 'all') return cafes;
    return cafes.filter((c) => c.status === filterStatus);
  }, [cafes, filterStatus]);

  const selectedTemplateCafe = useMemo(
    () => cafes.find((c) => c.id === selectedTemplateCafeId) ?? cafes[0] ?? null,
    [cafes, selectedTemplateCafeId],
  );

  if (!ownerToken) {
    return (
      <section className="mx-auto flex min-h-[75vh] max-w-md flex-col justify-center px-6 py-16">
        <div className="paper-sheet rounded-3xl p-8">
          <div className="paper-sheet-espresso mb-6 flex h-12 w-12 items-center justify-center rounded-2xl text-[#E5A77B]">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="mb-2 text-2xl font-extrabold text-[#2B1B12]">پنل اختصاصی مالک پلتفرم</h1>
          <p className="mb-6 text-sm leading-relaxed text-[#6A574A]">
            این بخش منحصراً برای مالک اصلی اپلیکیشن جهت مدیریت، تأیید و فعال‌سازی کافی‌شاپ‌های خریدار است.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="owner-passcode-input" className="mb-2 block text-xs font-bold text-[#2B1B12]">
                رمز عبور مستر مالک
              </label>
              <input
                id="owner-passcode-input"
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="رمز عبور مالک را وارد کنید..."
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
                {authLoading ? 'در حال احراز هویت...' : 'ورود به پنل مالک'}
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
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-dashed border-[#2B1B12]/15 pb-6">
        <div>
          <p className="mb-1 text-xs font-bold text-[#96522B]">مدیریت مرکزی فروش و اشتراک کافی‌شاپ‌ها</p>
          <h1 className="text-2xl font-extrabold text-[#2B1B12] sm:text-3xl">
            پنل مالک پلتفرم
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="btn-paper-primary inline-flex min-h-[42px] items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold"
          >
            <Plus className="h-4 w-4 text-[#E5A77B]" />
            <span>افزودن کافی‌شاپ جدید</span>
          </button>

          <button
            type="button"
            onClick={() => void handleDownloadBackup()}
            disabled={backingUp}
            className="btn-paper-sage inline-flex min-h-[42px] items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-60"
          >
            <Download className="h-3.5 w-3.5" />
            <span>{backingUp ? 'در حال دریافت...' : 'بکاپ دیتابیس'}</span>
          </button>

          <label className="btn-paper-cream inline-flex min-h-[42px] cursor-pointer items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold">
            <Upload className="h-3.5 w-3.5" />
            <span>{restoring ? 'در حال بازیابی...' : 'بازیابی بکاپ'}</span>
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                void handleRestoreBackup(file);
              }}
            />
          </label>

          <button
            type="button"
            onClick={() => setShowOwnerPassBox((prev) => !prev)}
            className="btn-paper-kraft inline-flex min-h-[42px] items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold"
          >
            <Lock className="h-3.5 w-3.5" />
            <span>تغییر رمز مالک</span>
          </button>

          <button
            type="button"
            onClick={fetchCafes}
            title="به‌روزرسانی لیست"
            className="btn-paper-cream flex h-[42px] w-[42px] items-center justify-center rounded-xl"
          >
            <RefreshCw className={`h-4 w-4 ${loadingCafes ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="btn-paper-cream inline-flex min-h-[42px] items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold text-rose-700"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>خروج مالک</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`mb-6 flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold ${
            feedback.type === 'ok'
              ? 'paper-sheet-kraft text-[#2B1B12]'
              : 'border border-rose-200 bg-rose-50 text-rose-800'
          }`}
        >
          <span>{feedback.text}</span>
          <button type="button" onClick={() => setFeedback(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Owner Passcode Change Drawer */}
      {showOwnerPassBox && (
        <form
          onSubmit={handleUpdateOwnerPasscode}
          className="paper-sheet mb-6 flex flex-wrap items-end gap-3 rounded-2xl p-5"
        >
          <div className="min-w-[220px] flex-1">
            <label className="mb-1.5 block text-xs font-bold text-[#2B1B12]">
              رمز جدید مالک پلتفرم (حداقل ۴ کاراکتر)
            </label>
            <input
              type="password"
              required
              minLength={4}
              value={ownerNewPasscode}
              onChange={(e) => setOwnerNewPasscode(e.target.value)}
              placeholder="رمز جدید را وارد کنید..."
              className="paper-recess w-full rounded-xl px-3.5 py-2 text-sm text-[#2B1B12] focus:outline-2 focus:outline-[#2B1B12]"
            />
          </div>
          <button
            type="submit"
            className="btn-paper-primary rounded-xl px-5 py-2.5 text-xs font-bold"
          >
            ذخیره رمز مالک
          </button>
          <button
            type="button"
            onClick={() => setShowOwnerPassBox(false)}
            className="btn-paper-kraft rounded-xl px-4 py-2.5 text-xs font-bold"
          >
            انصراف
          </button>
        </form>
      )}

      {/* Platform KPI Strip */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="paper-sheet rounded-2xl p-5">
          <p className="mb-1 text-xs font-semibold text-[#6A574A]">کل کافی‌شاپ‌ها</p>
          <p className="tabular-nums text-2xl font-extrabold text-[#2B1B12]">
            {toPersianDigits(stats.total)}
          </p>
        </div>

        <div className="paper-sheet-sage rounded-2xl p-5">
          <p className="mb-1 text-xs font-semibold text-[#354428]">کافی‌شاپ‌های فعال</p>
          <p className="tabular-nums text-2xl font-extrabold text-[#24301B]">
            {toPersianDigits(stats.approved)}
          </p>
        </div>

        <div
          className={`rounded-2xl p-5 ${
            stats.pending > 0 ? 'paper-sheet-kraft border-2 border-[#C27445]/45' : 'paper-sheet'
          }`}
        >
          <p className="mb-1 text-xs font-semibold text-[#96522B]">در انتظار تأیید شما</p>
          <p className="tabular-nums text-2xl font-extrabold text-[#2B1B12]">
            {toPersianDigits(stats.pending)}
          </p>
        </div>

        <div className="paper-sheet-espresso rounded-2xl p-5 text-[#FCF9F2]">
          <p className="mb-1 text-xs font-semibold text-[#E9DEC9]">کل میزهای تحت پوشش</p>
          <p className="tabular-nums text-2xl font-extrabold">
            {toPersianDigits(stats.totalTables)}
          </p>
        </div>
      </div>

      {/* Dedicated Landing Page Layout & Base Color Palette Studio */}
      {selectedTemplateCafe && (
        <section
          aria-labelledby="owner-landing-template-studio"
          className="paper-sheet mb-6 rounded-3xl border border-[#2B1B12]/12 p-5 sm:p-6"
        >
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-dashed border-[#2B1B12]/15 pb-4">
            <div className="flex items-start gap-3">
              <div className="paper-sheet-espresso flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-[#E5A77B]">
                <Palette className="h-5 w-5" />
              </div>
              <div>
                <h2
                  id="owner-landing-template-studio"
                  className="text-base font-extrabold text-[#2B1B12] sm:text-lg"
                >
                  قالب چیدمان و رنگ‌بندی پایه لندینگ‌پیج کافه‌ها
                </h2>
                <p className="mt-0.5 text-xs text-[#6A574A]">
                  برای هر کافی‌شاپ یکی از ۳ قالب آماده (چیدمان بخش اول + پالت رنگ پایه) را انتخاب و
                  بلافاصله روی منوی زنده اعمال کنید.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <label htmlFor="owner-template-cafe-select" className="text-xs font-bold text-[#2B1B12]">
                کافی‌شاپ هدف:
              </label>
              <select
                id="owner-template-cafe-select"
                value={selectedTemplateCafe.id}
                onChange={(e) => setSelectedTemplateCafeId(e.target.value)}
                className="paper-recess min-w-[190px] rounded-xl px-3.5 py-2 text-xs font-extrabold text-[#2B1B12] focus:outline-2 focus:outline-[#2B1B12]"
              >
                {cafes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nameFa} ({c.slug})
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => onOpenCafe(selectedTemplateCafe.slug, 'menu')}
                className="btn-paper-kraft inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>پیش‌نمایش زنده</span>
              </button>
            </div>
          </div>

          <LandingTemplateCards
            selectedId={normalizeLandingTemplate(selectedTemplateCafe.landingTemplate)}
            disabled={savingTemplate}
            onSelect={(templateId) =>
              void handleSelectCafeTemplate(selectedTemplateCafe.id, templateId)
            }
          />
        </section>
      )}

      {/* Owner Table QR Code Generator Studio */}
      {cafes.length > 0 && selectedTemplateCafe && (
        <OwnerQrGeneratorSection
          cafes={cafes}
          selectedCafeId={selectedTemplateCafe.id}
          onSelectCafeId={setSelectedTemplateCafeId}
          onOpenCafeTable={(slug, tableNum) => onOpenCafe(slug, 'menu', tableNum)}
          onNotify={showToast}
        />
      )}

      {/* Filter Tabs */}
      <div className="paper-sheet-kraft mb-6 flex flex-wrap items-center gap-2 rounded-2xl p-1.5">
        {(
          [
            { key: 'all', label: `همه (${toPersianDigits(cafes.length)})` },
            {
              key: 'pending',
              label: `در انتظار تأیید (${toPersianDigits(cafes.filter((c) => c.status === 'pending').length)})`,
            },
            {
              key: 'approved',
              label: `تأییدشده (${toPersianDigits(cafes.filter((c) => c.status === 'approved').length)})`,
            },
            {
              key: 'suspended',
              label: `معلق (${toPersianDigits(cafes.filter((c) => c.status === 'suspended').length)})`,
            },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilterStatus(tab.key)}
            className={`rounded-xl px-4 py-2 text-xs font-bold ${
              filterStatus === tab.key ? 'btn-paper-primary' : 'btn-paper-cream'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Cafe List */}
      {filteredCafes.length === 0 ? (
        <div className="paper-sheet rounded-2xl p-12 text-center">
          <Store className="mx-auto mb-3 h-8 w-8 text-[#96522B]" />
          <p className="text-sm font-bold text-[#2B1B12]">کافی‌شاپی در این بخش وجود ندارد.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {filteredCafes.map((cafe) => {
            const badge = STATUS_BADGE[cafe.status];
            const origin = typeof window !== 'undefined' ? window.location.origin : '';
            const menuUrl = `${origin}/?cafe=${cafe.slug}`;
            const adminUrl = `${origin}/admin/${cafe.slug}`;

            return (
              <div
                key={cafe.id}
                className="paper-sheet paper-sheet-hover flex flex-col justify-between rounded-3xl p-6"
              >
                <div>
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="mb-1 flex items-center gap-2">
                        <h3 className="text-lg font-extrabold text-[#2B1B12]">{cafe.nameFa}</h3>
                        <span className="font-mono text-xs font-semibold text-[#96522B]">
                          ({cafe.slug})
                        </span>
                      </div>
                      <p className="text-xs font-medium text-[#6A574A]">
                        مدیر: {cafe.ownerName} · تماس: {cafe.ownerPhone}
                      </p>
                    </div>

                    <span className={`rounded-xl px-3 py-1 text-xs font-bold ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </div>

                  {/* Quick Metrics */}
                  <div className="paper-recess mb-4 grid grid-cols-3 gap-2 rounded-2xl p-3 text-center">
                    <div>
                      <p className="text-[11px] text-[#6A574A]">آیتم منو</p>
                      <p className="tabular-nums text-sm font-extrabold text-[#2B1B12]">
                        {toPersianDigits(cafe.itemsCount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-[#6A574A]">کل میزها</p>
                      <p className="tabular-nums text-sm font-extrabold text-[#2B1B12]">
                        {toPersianDigits(cafe.tableCount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-[#6A574A]">میز اشغال</p>
                      <p className="tabular-nums text-sm font-extrabold text-[#96522B]">
                        {toPersianDigits(cafe.occupiedTablesCount)}
                      </p>
                    </div>
                  </div>

                  {/* Dedicated Isolated Links */}
                  <div className="paper-sheet-kraft mb-5 space-y-2 rounded-2xl p-3 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="shrink-0 font-bold text-[#2B1B12]">لینک منوی اختصاصی:</span>
                      <div className="flex min-w-0 items-center gap-1.5">
                        <code dir="ltr" className="truncate font-mono text-[11px] text-[#5A483C]">
                          /?cafe={cafe.slug}
                        </code>
                        <button
                          type="button"
                          onClick={() => copyLink(`menu-${cafe.id}`, menuUrl)}
                          className="btn-paper-cream rounded-lg px-2 py-1 text-[11px] font-bold"
                        >
                          {copiedKey === `menu-${cafe.id}` ? 'کپی شد' : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="shrink-0 font-bold text-[#2B1B12]">لینک پنل ادمین کافه:</span>
                      <div className="flex min-w-0 items-center gap-1.5">
                        <code dir="ltr" className="truncate font-mono text-[11px] text-[#5A483C]">
                          /admin/{cafe.slug}
                        </code>
                        <button
                          type="button"
                          onClick={() => copyLink(`admin-${cafe.id}`, adminUrl)}
                          className="btn-paper-cream rounded-lg px-2 py-1 text-[11px] font-bold"
                        >
                          {copiedKey === `admin-${cafe.id}` ? 'کپی شد' : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 border-t border-dashed border-[#2B1B12]/15 pt-2">
                      <span className="font-bold text-[#2B1B12]">قالب چیدمان و رنگ لندینگ:</span>
                      <button
                        type="button"
                        onClick={() => setSelectedTemplateCafeId(cafe.id)}
                        className="btn-paper-cream inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[11px] font-bold text-[#2B1B12]"
                      >
                        <Palette className="h-3 w-3 text-[#96522B]" />
                        <span>{getLandingTemplatePreset(cafe.landingTemplate).titleFa}</span>
                      </button>
                    </div>
                    <div className="flex items-center justify-between gap-2 border-t border-dashed border-[#2B1B12]/15 pt-2">
                      <span className="font-bold text-[#2B1B12]">شخصی‌سازی متن و تصاویر اپ:</span>
                      <button
                        type="button"
                        onClick={() =>
                          handleToggleCustomizationPermission(
                            cafe.id,
                            !cafe.allowContentCustomization,
                          )
                        }
                        className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[11px] font-bold ${
                          cafe.allowContentCustomization
                            ? 'btn-paper-terracotta'
                            : 'btn-paper-cream text-[#6A574A]'
                        }`}
                      >
                        {cafe.allowContentCustomization ? (
                          <>
                            <Palette className="h-3 w-3" />
                            <span>مجاز (تایید مالک)</span>
                          </>
                        ) : (
                          <>
                            <Lock className="h-3 w-3" />
                            <span>مسدود — اعطای اجازه</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Owner Actions */}
                <div className="flex flex-wrap items-center gap-2 border-t border-dashed border-[#2B1B12]/15 pt-4">
                  {cafe.status !== 'approved' ? (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(cafe.id, 'approved')}
                      className="btn-paper-terracotta inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>تأیید و فعال‌سازی</span>
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => onOpenCafe(cafe.slug, 'menu')}
                        className="btn-paper-primary inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold"
                      >
                        <ExternalLink className="h-3.5 w-3.5 text-[#E5A77B]" />
                        <span>مشاهده منو</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStatusChange(cafe.id, 'suspended')}
                        className="btn-paper-kraft inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold"
                      >
                        <PauseCircle className="h-3.5 w-3.5" />
                        <span>تعلیق موقت</span>
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => setLandingCafe(cafe)}
                    className="btn-paper-lavender inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>شخصی‌سازی لندینگ‌پیج</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTemplateCafeId(cafe.id);
                      document
                        .getElementById('owner-qr-generator')
                        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="btn-paper-cream inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-[#2B1B12]"
                  >
                    <QrCode className="h-3.5 w-3.5" />
                    <span>ساخت QR میزها</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setResetPassModal(cafe);
                      setCafeNewPasscode('');
                    }}
                    className="btn-paper-cream inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold"
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    <span>تغییر رمز ادمین</span>
                  </button>

                  {cafes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleDeleteCafe(cafe.id)}
                      className="btn-paper-cream inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold text-rose-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>حذف</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Owner Direct Add Cafe Modal */}
      {createOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F130C]/55 p-4 backdrop-blur-xs"
          onClick={() => setCreateOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="paper-sheet cafe-shadow-deep max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl p-6 sm:p-8"
          >
            <div className="mb-5 flex items-center justify-between border-b border-dashed border-[#2B1B12]/15 pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-[#96522B]" />
                <h2 className="text-lg font-extrabold text-[#2B1B12]">ایجاد کافی‌شاپ جدید</h2>
              </div>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="btn-paper-cream flex h-8 w-8 items-center justify-center rounded-full"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCafe} className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-[#2B1B12]">نام فارسی کافه</label>
                  <input
                    type="text"
                    required
                    value={newCafe.nameFa}
                    onChange={(e) => setNewCafe({ ...newCafe, nameFa: e.target.value })}
                    placeholder="مثلاً: کافه لاله"
                    className="paper-recess w-full rounded-xl px-3.5 py-2.5 text-sm text-[#2B1B12] focus:outline-2 focus:outline-[#2B1B12]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-[#2B1B12]">نام انگلیسی</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={newCafe.nameEn}
                    onChange={(e) => setNewCafe({ ...newCafe, nameEn: e.target.value })}
                    placeholder="Cafe Laleh"
                    className="paper-recess w-full rounded-xl px-3.5 py-2.5 text-sm text-[#2B1B12] focus:outline-2 focus:outline-[#2B1B12]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-[#2B1B12]">
                  شناسه لینک اختصاصی (انگلیسی بدون فاصله)
                </label>
                <input
                  type="text"
                  dir="ltr"
                  required
                  value={newCafe.slug}
                  onChange={(e) => setNewCafe({ ...newCafe, slug: e.target.value })}
                  placeholder="cafe-laleh"
                  className="paper-recess w-full rounded-xl px-3.5 py-2.5 font-mono text-sm text-[#2B1B12] focus:outline-2 focus:outline-[#2B1B12]"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-[#2B1B12]">نام خریدار / مدیر</label>
                  <input
                    type="text"
                    value={newCafe.ownerName}
                    onChange={(e) => setNewCafe({ ...newCafe, ownerName: e.target.value })}
                    placeholder="نام و نام خانوادگی"
                    className="paper-recess w-full rounded-xl px-3.5 py-2.5 text-sm text-[#2B1B12] focus:outline-2 focus:outline-[#2B1B12]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-[#2B1B12]">شماره تماس</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={newCafe.ownerPhone}
                    onChange={(e) => setNewCafe({ ...newCafe, ownerPhone: e.target.value })}
                    placeholder="0912..."
                    className="paper-recess w-full rounded-xl px-3.5 py-2.5 text-sm text-[#2B1B12] focus:outline-2 focus:outline-[#2B1B12]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-[#2B1B12]">
                    رمز ورود ادمین این کافه
                  </label>
                  <input
                    type="password"
                    required
                    minLength={4}
                    value={newCafe.passcode}
                    onChange={(e) => setNewCafe({ ...newCafe, passcode: e.target.value })}
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
                    value={newCafe.tableCount}
                    onChange={(e) => setNewCafe({ ...newCafe, tableCount: e.target.value })}
                    className="paper-recess w-full rounded-xl px-3.5 py-2.5 tabular-nums text-sm text-[#2B1B12] focus:outline-2 focus:outline-[#2B1B12]"
                  />
                </div>
              </div>

              <label className="paper-sheet-kraft flex cursor-pointer items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#2B1B12]">
                <input
                  type="checkbox"
                  checked={newCafe.allowContentCustomization}
                  onChange={(e) =>
                    setNewCafe({ ...newCafe, allowContentCustomization: e.target.checked })
                  }
                  className="h-4 w-4 accent-[#C27445]"
                />
                <span>اجازه شخصی‌سازی کامل متن‌ها و تصاویر اپلیکیشن توسط ادمین این کافه</span>
              </label>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={creating}
                  className="btn-paper-primary flex-1 rounded-xl py-3 text-sm font-bold disabled:opacity-60"
                >
                  {creating ? 'در حال ایجاد...' : 'ثبت و فعال‌سازی کافی‌شاپ'}
                </button>
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="btn-paper-cream rounded-xl px-4 py-3 text-sm font-bold"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Cafe Admin Passcode Modal */}
      {resetPassModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F130C]/55 p-4 backdrop-blur-xs"
          onClick={() => setResetPassModal(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="paper-sheet cafe-shadow-deep w-full max-w-sm rounded-3xl p-6"
          >
            <h3 className="mb-2 text-base font-extrabold text-[#2B1B12]">
              تغییر رمز ادمین «{resetPassModal.nameFa}»
            </h3>
            <p className="mb-4 text-xs text-[#6A574A]">
              رمز جدید فقط برای ورود مدیر این کافی‌شاپ کاربرد خواهد داشت.
            </p>
            <form onSubmit={handleResetCafePasscode} className="space-y-4">
              <input
                type="password"
                required
                minLength={4}
                value={cafeNewPasscode}
                onChange={(e) => setCafeNewPasscode(e.target.value)}
                placeholder="رمز جدید ادمین (حداقل ۴ کاراکتر)"
                className="paper-recess w-full rounded-xl px-3.5 py-2.5 text-sm text-[#2B1B12] focus:outline-2 focus:outline-[#2B1B12]"
              />
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="btn-paper-primary flex-1 rounded-xl py-2.5 text-xs font-bold"
                >
                  ثبت رمز جدید
                </button>
                <button
                  type="button"
                  onClick={() => setResetPassModal(null)}
                  className="btn-paper-cream rounded-xl px-4 py-2.5 text-xs font-bold"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <OwnerLandingCustomizerModal
        cafe={landingCafe}
        ownerToken={ownerToken}
        onClose={() => setLandingCafe(null)}
        onNotify={showToast}
        onUnauthorized={handleLogout}
        onOpenCafe={onOpenCafe}
        onCafesUpdated={(updated) => setCafes(updated)}
      />
    </section>
  );
};
