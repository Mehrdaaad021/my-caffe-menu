import React, { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  ImageIcon,
  Palette,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Type,
  Upload,
  X,
} from '@/src/components/ClayCafeIcons';
import type {
  AppContentOverrides,
  CafeSummary,
  LandingTemplateId,
  RestaurantSettings,
} from '@/src/types/menu';
import { DEFAULT_APP_CONTENT, resolveAppContent } from '@/src/lib/defaultContent';
import { resolveMenuImage, STUDIO_3D_PRESETS } from '@/src/lib/imageAssets';
import { normalizeLandingTemplate } from '@/src/lib/landingTemplates';
import { LandingTemplateCards } from '@/src/components/LandingTemplateCards';

interface OwnerLandingCustomizerModalProps {
  cafe: CafeSummary | null;
  ownerToken: string;
  onClose: () => void;
  onNotify: (type: 'ok' | 'err', text: string) => void;
  onUnauthorized: () => void;
  onOpenCafe: (slug: string, targetMode?: 'menu' | 'admin') => void;
  onCafesUpdated?: (cafes: CafeSummary[]) => void;
}

type LandingImageField = 'brandLogoUrl' | 'heroFeaturedImageUrl' | 'infoSectionImageUrl';

export const OwnerLandingCustomizerModal: React.FC<OwnerLandingCustomizerModalProps> = ({
  cafe,
  ownerToken,
  onClose,
  onNotify,
  onUnauthorized,
  onOpenCafe,
  onCafesUpdated,
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [form, setForm] = useState<Required<AppContentOverrides>>(() =>
    resolveAppContent(undefined, {}),
  );
  const [cafeSettings, setCafeSettings] = useState<{
    taglineFa: string;
    addressFa: string;
    hoursFa: string;
    metaTitle: string;
    metaDescription: string;
    landingTemplate: LandingTemplateId;
  }>({
    taglineFa: '',
    addressFa: '',
    hoursFa: '',
    metaTitle: '',
    metaDescription: '',
    landingTemplate: 'classic-sage',
  });

  const loadLanding = useCallback(async () => {
    if (!cafe) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/owner/cafes/${cafe.id}/landing`, {
        headers: { Authorization: `Bearer ${ownerToken}` },
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      const data = (await res.json()) as {
        settings?: RestaurantSettings;
        contentOverrides?: AppContentOverrides;
        error?: string;
      };
      if (!res.ok) {
        onNotify('err', data.error || 'خطا در دریافت تنظیمات لندینگ‌پیج.');
        return;
      }
      setForm(resolveAppContent(data.settings, data.contentOverrides ?? {}));
      setCafeSettings({
        taglineFa: data.settings?.taglineFa ?? '',
        addressFa: data.settings?.addressFa ?? '',
        hoursFa: data.settings?.hoursFa ?? '',
        metaTitle: data.settings?.metaTitle ?? '',
        metaDescription: data.settings?.metaDescription ?? '',
        landingTemplate: normalizeLandingTemplate(data.settings?.landingTemplate),
      });
    } catch {
      onNotify('err', 'ارتباط با سرور برای دریافت تنظیمات لندینگ‌پیج برقرار نشد.');
    } finally {
      setLoading(false);
    }
  }, [cafe, ownerToken, onUnauthorized, onNotify]);

  useEffect(() => {
    if (cafe) {
      void loadLanding();
    }
  }, [cafe, loadLanding]);

  if (!cafe) return null;

  const setField = (key: keyof AppContentOverrides, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleUploadImage = async (field: LandingImageField, file?: File) => {
    if (!file) return;
    setUploadingField(field);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const res = await fetch('/api/owner/upload', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${ownerToken}`,
            },
            body: JSON.stringify({ dataUrl: reader.result }),
          });
          if (res.status === 401) {
            onUnauthorized();
            return;
          }
          const data = (await res.json()) as { url?: string; error?: string };
          if (!res.ok || !data.url) {
            onNotify('err', data.error || 'آپلود تصویر ناموفق بود.');
            return;
          }
          setField(field, data.url);
          onNotify('ok', 'تصویر با موفقیت بارگذاری شد. برای اعمال، دکمه ذخیره را بزنید.');
        } catch {
          onNotify('err', 'خطا در ارسال تصویر به سرور.');
        } finally {
          setUploadingField(null);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setUploadingField(null);
      onNotify('err', 'خواندن فایل تصویر ناموفق بود.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/owner/cafes/${cafe.id}/landing`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({
          contentOverrides: form,
          settings: cafeSettings,
        }),
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      const data = (await res.json()) as {
        settings?: RestaurantSettings;
        contentOverrides?: AppContentOverrides;
        cafes?: CafeSummary[];
        error?: string;
      };
      if (!res.ok) {
        onNotify('err', data.error || 'ذخیره تغییرات لندینگ‌پیج ناموفق بود.');
        return;
      }
      setForm(resolveAppContent(data.settings, data.contentOverrides ?? {}));
      if (data.settings?.landingTemplate) {
        setCafeSettings((prev) => ({
          ...prev,
          landingTemplate: normalizeLandingTemplate(data.settings?.landingTemplate),
        }));
      }
      if (data.cafes) {
        onCafesUpdated?.(data.cafes);
      }
      onNotify('ok', `صفحه لندینگ اختصاصی «${cafe.nameFa}» ذخیره و منتشر شد.`);
    } catch {
      onNotify('err', 'خطا در ذخیره لندینگ‌پیج.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetLanding = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/owner/cafes/${cafe.id}/landing`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({ reset: true }),
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      const data = (await res.json()) as {
        settings?: RestaurantSettings;
        contentOverrides?: AppContentOverrides;
        error?: string;
      };
      if (!res.ok) {
        onNotify('err', data.error || 'بازنشانی لندینگ‌پیج ناموفق بود.');
        return;
      }
      setForm(resolveAppContent(data.settings, data.contentOverrides ?? {}));
      onNotify('ok', `بخش لندینگ‌پیج «${cafe.nameFa}» به حالت پیش‌فرض بازگشت.`);
    } catch {
      onNotify('err', 'خطا در بازنشانی لندینگ‌پیج.');
    } finally {
      setSaving(false);
    }
  };

  const renderTextInput = (
    key: keyof AppContentOverrides,
    label: string,
    dir: 'rtl' | 'ltr' = 'rtl',
    multiline = false,
  ) => (
    <div>
      <label className="mb-1 block text-xs font-bold text-[#2B1B12]">{label}</label>
      {multiline ? (
        <textarea
          rows={2}
          dir={dir}
          value={form[key] ?? ''}
          onChange={(e) => setField(key, e.target.value)}
          placeholder={DEFAULT_APP_CONTENT[key] || ''}
          className="paper-recess w-full rounded-xl px-3.5 py-2 text-xs font-medium text-[#2B1B12] focus:outline-2 focus:outline-[#2B1B12]"
        />
      ) : (
        <input
          type="text"
          dir={dir}
          value={form[key] ?? ''}
          onChange={(e) => setField(key, e.target.value)}
          placeholder={DEFAULT_APP_CONTENT[key] || ''}
          className="paper-recess w-full rounded-xl px-3.5 py-2 text-xs font-medium text-[#2B1B12] focus:outline-2 focus:outline-[#2B1B12]"
        />
      )}
    </div>
  );

  const renderImageCard = (
    field: LandingImageField,
    title: string,
    hint: string,
    allowPreset = false,
  ) => {
    const val = form[field] ?? '';
    const resolved = val ? resolveMenuImage(val) : '';

    return (
      <div className="paper-sheet-kraft space-y-3 rounded-2xl p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-extrabold text-[#2B1B12]">{title}</p>
            <p className="text-[11px] text-[#6A574A]">{hint}</p>
          </div>
          {val && (
            <button
              type="button"
              onClick={() => setField(field, '')}
              className="btn-paper-cream shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-bold text-rose-700"
            >
              حذف
            </button>
          )}
        </div>

        {resolved && (
          <div className="paper-recess flex h-24 items-center justify-center rounded-xl p-2">
            <img
              src={resolved}
              alt={title}
              referrerPolicy="no-referrer"
              className="max-h-20 max-w-full rounded-lg object-contain"
            />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            dir="ltr"
            value={val}
            onChange={(e) => setField(field, e.target.value)}
            placeholder="https://... یا آپلود تصویر اختصاصی"
            className="paper-recess min-w-0 flex-1 rounded-xl px-3 py-2 text-left text-xs text-[#2B1B12] focus:outline-2 focus:outline-[#2B1B12]"
          />
          <label className="btn-paper-primary inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold">
            <Upload className="h-3.5 w-3.5 text-[#E5A77B]" />
            <span>{uploadingField === field ? 'در حال آپلود...' : 'آپلود'}</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => handleUploadImage(field, e.target.files?.[0])}
            />
          </label>
        </div>

        {allowPreset && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {STUDIO_3D_PRESETS.slice(0, 6).map((preset) => (
              <button
                key={preset.key}
                type="button"
                onClick={() => setField(field, preset.key)}
                className={`rounded-lg px-2 py-1 text-[10px] font-bold ${
                  val === preset.key ? 'btn-paper-terracotta' : 'btn-paper-cream'
                }`}
              >
                {preset.labelFa}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F130C]/60 p-4 backdrop-blur-xs"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="paper-canvas cafe-shadow-deep max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-[#2B1B12]/15 p-5 sm:p-7"
      >
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-dashed border-[#2B1B12]/15 pb-4">
          <div className="flex items-center gap-3">
            <div className="paper-sheet-espresso flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-[#E5A77B]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-extrabold text-[#2B1B12] sm:text-xl">
                  طراحی و شخصی‌سازی لندینگ‌پیج «{cafe.nameFa}»
                </h2>
                <span className="paper-sheet-sage rounded-lg px-2.5 py-0.5 font-mono text-[11px] font-bold text-[#24301B]">
                  {cafe.slug}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-[#6A574A]">
                بخش هیرو، ۴ ستون اصالت، تصاویر برند، معرفی شعبه، فوتر و سئوی صفحه اول این کافی‌شاپ را
                به‌صورت اختصاصی شخصی‌سازی کنید.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenCafe(cafe.slug, 'menu');
              }}
              className="btn-paper-kraft inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>مشاهده زنده</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="بستن"
              className="btn-paper-cream flex h-9 w-9 items-center justify-center rounded-full"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="paper-sheet rounded-2xl p-12 text-center text-sm font-bold text-[#6A574A]">
            در حال بارگذاری تنظیمات لندینگ‌پیج...
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            {/* Layout & Base Palette Preset */}
            <div className="paper-sheet space-y-4 rounded-3xl p-5">
              <div className="flex items-center gap-2 border-b border-dashed border-[#2B1B12]/15 pb-3">
                <Palette className="h-4 w-4 text-[#96522B]" />
                <h3 className="text-sm font-extrabold text-[#2B1B12]">
                  قالب چیدمان و رنگ‌بندی پایه لندینگ‌پیج
                </h3>
              </div>
              <LandingTemplateCards
                compact
                selectedId={cafeSettings.landingTemplate}
                onSelect={(templateId) =>
                  setCafeSettings((prev) => ({ ...prev, landingTemplate: templateId }))
                }
              />
            </div>

            {/* Images */}
            <div className="paper-sheet space-y-4 rounded-3xl p-5">
              <div className="flex items-center gap-2 border-b border-dashed border-[#2B1B12]/15 pb-3">
                <ImageIcon className="h-4 w-4 text-[#96522B]" />
                <h3 className="text-sm font-extrabold text-[#2B1B12]">تصاویر صفحه اول و برند</h3>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {renderImageCard(
                  'brandLogoUrl',
                  'لوگوی برند در هدر',
                  'جایگزین نشان پیش‌فرض در بالای صفحه',
                )}
                {renderImageCard(
                  'heroFeaturedImageUrl',
                  'تصویر ویترین هیرو',
                  'نمایش در بخش معرفی بالای صفحه اول',
                  true,
                )}
                {renderImageCard(
                  'infoSectionImageUrl',
                  'تصویر فضای کافه',
                  'نمایش در بخش اطلاعات تماس و نشانی',
                  true,
                )}
              </div>
            </div>

            {/* Hero Copy */}
            <div className="paper-sheet space-y-4 rounded-3xl p-5">
              <div className="flex items-center gap-2 border-b border-dashed border-[#2B1B12]/15 pb-3">
                <Sparkles className="h-4 w-4 text-[#96522B]" />
                <h3 className="text-sm font-extrabold text-[#2B1B12]">بخش اول صفحه (Hero)</h3>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {renderTextInput('heroBadgeEn', 'برچسب انگلیسی بالای تیتر', 'ltr')}
                <div className="sm:col-span-2">
                  {renderTextInput('heroTitleFa', 'تیتر اصلی لندینگ‌پیج')}
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  {renderTextInput('heroSubtitleFa', 'توضیحات زیرتیتر هیرو', 'rtl', true)}
                </div>
                {renderTextInput('heroPrimaryCtaFa', 'متن دکمه اول (ورود به منو)')}
                {renderTextInput('heroSecondaryCtaFa', 'متن دکمه دوم (برگزیده‌ها)')}
                {renderTextInput('heroQualityBadgeFa', 'نشان کیفیت روی کارت ویترین')}
                {renderTextInput('heroHighlight1Fa', 'برچسب ویژگی اول')}
                {renderTextInput('heroHighlight2Fa', 'برچسب ویژگی دوم')}
                {renderTextInput('heroHighlight3Fa', 'برچسب ویژگی سوم')}
                {renderTextInput('heroFeaturedTagEn', 'برچسب انگلیسی ویترین', 'ltr')}
                {renderTextInput('heroFeaturedLabelFa', 'عنوان کارت ویژه هیرو')}
                {renderTextInput('heroFeaturedActionFa', 'دکمه مشاهده در کارت ویژه')}
              </div>
            </div>

            {/* 4 Craft Pillars Strip */}
            <div className="paper-sheet space-y-4 rounded-3xl p-5">
              <div className="flex items-center gap-2 border-b border-dashed border-[#2B1B12]/15 pb-3">
                <Palette className="h-4 w-4 text-[#96522B]" />
                <h3 className="text-sm font-extrabold text-[#2B1B12]">
                  ۴ ستون اصالت و ویژگی‌های کافه (نوار زیر موج هیرو)
                </h3>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {([1, 2, 3, 4] as const).map((idx) => (
                  <div key={idx} className="paper-sheet-kraft space-y-2.5 rounded-2xl p-4">
                    {renderTextInput(
                      `craftPillar${idx}TitleFa` as keyof AppContentOverrides,
                      `عنوان ستون ${idx}`,
                    )}
                    {renderTextInput(
                      `craftPillar${idx}DescFa` as keyof AppContentOverrides,
                      `توضیح کوتاه ستون ${idx}`,
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation, Contact Info, Footer & Cafe SEO */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div className="paper-sheet space-y-3 rounded-3xl p-5">
                <div className="flex items-center gap-2 border-b border-dashed border-[#2B1B12]/15 pb-3">
                  <Type className="h-4 w-4 text-[#96522B]" />
                  <h3 className="text-sm font-extrabold text-[#2B1B12]">ناوبری، اطلاعات تماس و فوتر</h3>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {renderTextInput('navFeaturedLabel', 'لینک اول هدر')}
                  {renderTextInput('navCatalogLabel', 'لینک دوم هدر')}
                  {renderTextInput('navInfoLabel', 'لینک سوم هدر')}
                  {renderTextInput('infoSectionTitleFa', 'عنوان بخش اطلاعات تماس')}
                  {renderTextInput('infoAddressTitleFa', 'تیتر کارت نشانی')}
                  {renderTextInput('infoHoursTitleFa', 'تیتر کارت ساعت کاری')}
                  {renderTextInput('infoPhoneTitleFa', 'تیتر کارت تماس')}
                  {renderTextInput('infoPhoneValueFa', 'شماره تماس / رزرو', 'ltr')}
                  {renderTextInput('infoQrTitleFa', 'تیتر کارت سفارش سرمیز')}
                  {renderTextInput('footerCopyFa', 'متن کپی‌رایت فوتر')}
                  <div className="sm:col-span-2">
                    {renderTextInput('infoQrDescFa', 'توضیح سفارش سرمیز', 'rtl', true)}
                  </div>
                  <div className="sm:col-span-2">
                    {renderTextInput('footerTaglineEn', 'متن انگلیسی پایین فوتر', 'ltr')}
                  </div>
                </div>
              </div>

              <div className="paper-sheet space-y-3 rounded-3xl p-5">
                <div className="flex items-center gap-2 border-b border-dashed border-[#2B1B12]/15 pb-3">
                  <Type className="h-4 w-4 text-[#96522B]" />
                  <h3 className="text-sm font-extrabold text-[#2B1B12]">شعار کافه، آدرس و سئوی لندینگ‌پیج</h3>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-[#2B1B12]">شعار معرفی کافه</label>
                  <input
                    type="text"
                    value={cafeSettings.taglineFa}
                    onChange={(e) => setCafeSettings((p) => ({ ...p, taglineFa: e.target.value }))}
                    className="paper-recess w-full rounded-xl px-3.5 py-2 text-xs font-medium text-[#2B1B12] focus:outline-2 focus:outline-[#2B1B12]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-[#2B1B12]">نشانی کافه</label>
                  <input
                    type="text"
                    value={cafeSettings.addressFa}
                    onChange={(e) => setCafeSettings((p) => ({ ...p, addressFa: e.target.value }))}
                    className="paper-recess w-full rounded-xl px-3.5 py-2 text-xs font-medium text-[#2B1B12] focus:outline-2 focus:outline-[#2B1B12]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-[#2B1B12]">ساعات کاری</label>
                  <input
                    type="text"
                    value={cafeSettings.hoursFa}
                    onChange={(e) => setCafeSettings((p) => ({ ...p, hoursFa: e.target.value }))}
                    className="paper-recess w-full rounded-xl px-3.5 py-2 text-xs font-medium text-[#2B1B12] focus:outline-2 focus:outline-[#2B1B12]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-[#2B1B12]">عنوان سئو (Meta Title)</label>
                  <input
                    type="text"
                    value={cafeSettings.metaTitle}
                    onChange={(e) => setCafeSettings((p) => ({ ...p, metaTitle: e.target.value }))}
                    placeholder={`${cafe.nameFa} | منوی دیجیتال`}
                    className="paper-recess w-full rounded-xl px-3.5 py-2 text-xs font-medium text-[#2B1B12] focus:outline-2 focus:outline-[#2B1B12]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-[#2B1B12]">توضیحات سئو (Meta Description)</label>
                  <textarea
                    rows={2}
                    value={cafeSettings.metaDescription}
                    onChange={(e) => setCafeSettings((p) => ({ ...p, metaDescription: e.target.value }))}
                    className="paper-recess w-full rounded-xl px-3.5 py-2 text-xs font-medium text-[#2B1B12] focus:outline-2 focus:outline-[#2B1B12]"
                  />
                </div>
              </div>
            </div>

            {/* Footer Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-[#2B1B12]/15 pt-4">
              <button
                type="button"
                onClick={handleResetLanding}
                disabled={saving}
                className="btn-paper-cream inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>بازگردانی لندینگ به پیش‌فرض</span>
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-paper-kraft rounded-xl px-4 py-2.5 text-xs font-bold"
                >
                  بستن
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-paper-primary inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold disabled:opacity-60"
                >
                  <CheckCircle2 className="h-4 w-4 text-[#E5A77B]" />
                  <span>{saving ? 'در حال ذخیره...' : 'ذخیره و انتشار لندینگ‌پیج'}</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
