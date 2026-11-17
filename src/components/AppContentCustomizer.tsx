import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ImageIcon,
  LayoutGrid,
  List,
  Lock,
  Palette,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Type,
  Upload,
} from '@/src/components/ClayCafeIcons';
import type { AppContentOverrides, MenuDatabase } from '@/src/types/menu';
import { DEFAULT_APP_CONTENT, resolveAppContent } from '@/src/lib/defaultContent';
import { resolveMenuImage, STUDIO_3D_PRESETS } from '@/src/lib/imageAssets';

interface AppContentCustomizerProps {
  menu: MenuDatabase;
  token: string;
  onMenuUpdated: (nextMenu: MenuDatabase) => void;
  onNotify: (type: 'ok' | 'err', text: string) => void;
  onUnauthorized: () => void;
}

type CustomImageField =
  | 'brandLogoUrl'
  | 'heroFeaturedImageUrl'
  | 'menuBannerImageUrl'
  | 'infoSectionImageUrl';

export const AppContentCustomizer: React.FC<AppContentCustomizerProps> = ({
  menu,
  token,
  onMenuUpdated,
  onNotify,
  onUnauthorized,
}) => {
  const [form, setForm] = useState<Required<AppContentOverrides>>(() =>
    resolveAppContent(menu.settings, menu.contentOverrides),
  );
  const [defaultMenuLayout, setDefaultMenuLayout] = useState<'grid' | 'list'>(
    menu.settings.defaultMenuLayout ?? 'grid',
  );
  const [showPrepTime, setShowPrepTime] = useState<boolean>(
    menu.settings.showPrepTime ?? true,
  );
  const [showCalories, setShowCalories] = useState<boolean>(
    menu.settings.showCalories ?? true,
  );
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  useEffect(() => {
    setForm(resolveAppContent(menu.settings, menu.contentOverrides));
    setDefaultMenuLayout(menu.settings.defaultMenuLayout ?? 'grid');
    setShowPrepTime(menu.settings.showPrepTime ?? true);
    setShowCalories(menu.settings.showCalories ?? true);
  }, [menu.cafeId, menu.settings, menu.contentOverrides]);

  const setField = (key: keyof AppContentOverrides, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const canUploadField = (field: CustomImageField) =>
    field === 'menuBannerImageUrl' || menu.allowContentCustomization;

  const handleUploadImage = async (field: CustomImageField, file?: File) => {
    if (!file || !canUploadField(field)) return;
    setUploadingField(field);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const res = await fetch('/api/upload', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
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
          onNotify('err', 'خطا در ارسال فایل تصویر.');
        } finally {
          setUploadingField(null);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setUploadingField(null);
      onNotify('err', 'خطا در خواندن فایل.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payloadOverrides: AppContentOverrides = menu.allowContentCustomization
        ? form
        : {
            menuBannerImageUrl: form.menuBannerImageUrl,
            headerShareLabel: form.headerShareLabel,
            headerTrayLabel: form.headerTrayLabel,
            searchPlaceholderFa: form.searchPlaceholderFa,
            heroFilterSignatureLabelFa: form.heroFilterSignatureLabelFa,
            popularEyebrowEn: form.popularEyebrowEn,
            popularTitleFa: form.popularTitleFa,
            popularActionFa: form.popularActionFa,
            catalogEyebrowEn: form.catalogEyebrowEn,
            catalogTitleFa: form.catalogTitleFa,
            catalogAllChaptersFa: form.catalogAllChaptersFa,
            menuGridViewLabelFa: form.menuGridViewLabelFa,
            menuListViewLabelFa: form.menuListViewLabelFa,
            emptySearchTitleFa: form.emptySearchTitleFa,
          };

      const res = await fetch('/api/menu/customization', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          contentOverrides: payloadOverrides,
          menuDisplaySettings: {
            defaultMenuLayout,
            showPrepTime,
            showCalories,
          },
        }),
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      const data = (await res.json()) as MenuDatabase & { error?: string };
      if (!res.ok) {
        onNotify('err', data.error || 'ذخیره شخصی‌سازی منو ناموفق بود.');
        return;
      }
      onMenuUpdated(data);
      onNotify('ok', 'شخصی‌سازی کامل منو و تنظیمات نمایش با موفقیت ذخیره و منتشر شدند.');
    } catch {
      onNotify('err', 'خطا در ذخیره تنظیمات منو.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/menu/customization', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reset: true,
          resetScope: menu.allowContentCustomization ? 'all' : 'menu',
        }),
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      const data = (await res.json()) as MenuDatabase & { error?: string };
      if (!res.ok) {
        onNotify('err', data.error || 'بازنشانی ناموفق بود.');
        return;
      }
      onMenuUpdated(data);
      setForm(resolveAppContent(data.settings, data.contentOverrides ?? {}));
      onNotify(
        'ok',
        menu.allowContentCustomization
          ? 'همه بخش‌های منو و لندینگ‌پیج به حالت پیش‌فرض بازگشتند.'
          : 'همه نوشته‌ها و بنر بخش منو به حالت پیش‌فرض بازگشتند.',
      );
    } catch {
      onNotify('err', 'خطا در بازنشانی محتوا.');
    } finally {
      setSaving(false);
    }
  };

  const renderTextInput = (
    key: keyof AppContentOverrides,
    label: string,
    dir: 'rtl' | 'ltr' = 'rtl',
    multiline = false,
    disabled = false,
  ) => (
    <div>
      <label className="mb-1 block text-xs font-bold text-[#2B1B12]">{label}</label>
      {multiline ? (
        <textarea
          rows={2}
          dir={dir}
          disabled={disabled}
          value={form[key] ?? ''}
          onChange={(e) => setField(key, e.target.value)}
          placeholder={DEFAULT_APP_CONTENT[key] || ''}
          className="paper-recess w-full rounded-xl px-3.5 py-2 text-xs font-medium text-[#2B1B12] focus:outline-2 focus:outline-[#2B1B12] disabled:opacity-55"
        />
      ) : (
        <input
          type="text"
          dir={dir}
          disabled={disabled}
          value={form[key] ?? ''}
          onChange={(e) => setField(key, e.target.value)}
          placeholder={DEFAULT_APP_CONTENT[key] || ''}
          className="paper-recess w-full rounded-xl px-3.5 py-2 text-xs font-medium text-[#2B1B12] focus:outline-2 focus:outline-[#2B1B12] disabled:opacity-55"
        />
      )}
    </div>
  );

  const renderImageCard = (
    field: CustomImageField,
    title: string,
    hint: string,
    allowPreset = false,
    disabled = false,
  ) => {
    const val = form[field] ?? '';
    const resolved = val ? resolveMenuImage(val) : '';

    return (
      <div className={`paper-sheet-kraft space-y-3 rounded-2xl p-4 ${disabled ? 'opacity-65' : ''}`}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-extrabold text-[#2B1B12]">{title}</p>
            <p className="text-[11px] text-[#6A574A]">{hint}</p>
          </div>
          {val && !disabled && (
            <button
              type="button"
              onClick={() => setField(field, '')}
              className="btn-paper-cream shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-bold text-rose-700"
            >
              حذف تصویر
            </button>
          )}
        </div>

        {resolved && (
          <div className="paper-recess flex h-28 items-center justify-center rounded-xl p-2">
            <img
              src={resolved}
              alt={title}
              referrerPolicy="no-referrer"
              className="max-h-24 max-w-full rounded-lg object-contain"
            />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            dir="ltr"
            disabled={disabled}
            value={val}
            onChange={(e) => setField(field, e.target.value)}
            placeholder="https://... یا آپلود تصویر جایگزین"
            className="paper-recess min-w-0 flex-1 rounded-xl px-3 py-2 text-left text-xs text-[#2B1B12] focus:outline-2 focus:outline-[#2B1B12] disabled:opacity-60"
          />
          {!disabled && (
            <label className="btn-paper-primary inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold">
              <Upload className="h-3.5 w-3.5 text-[#E5A77B]" />
              <span>{uploadingField === field ? 'در حال آپلود...' : 'آپلود عکس'}</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => handleUploadImage(field, e.target.files?.[0])}
              />
            </label>
          )}
        </div>

        {allowPreset && !disabled && (
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
    <form onSubmit={handleSave} className="space-y-6">
      {/* Top Status & Actions */}
      <div className="paper-sheet flex flex-col justify-between gap-4 rounded-3xl p-6 sm:flex-row sm:items-center">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="paper-sheet-sage inline-flex items-center gap-1 rounded-lg px-2.5 py-0.5 text-[11px] font-bold text-[#24301B]">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>شخصی‌سازی کامل منو برای صاحب کافی‌شاپ فعال است</span>
            </span>
          </div>
          <h2 className="text-lg font-extrabold text-[#2B1B12]">
            شخصی‌سازی کامل تمامی بخش‌های منوی {menu.settings.nameFa}
          </h2>
          <p className="mt-1 text-xs text-[#6A574A]">
            چیدمان پیش‌فرض کارت‌ها، نمایش زمان آماده و کالری، بنر اختصاصی منو، عناوین برگزیده‌ها،
            برچسب دکمه‌های سینی سفارش و پیام‌های جستجو را کاملاً متناسب با سلیقه کافه خود تنظیم کنید.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleResetDefaults}
            disabled={saving}
            className="btn-paper-cream inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>بازگشت به پیش‌فرض</span>
          </button>
          <button
            type="submit"
            disabled={saving}
            className="btn-paper-primary inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold disabled:opacity-60"
          >
            <CheckCircle2 className="h-4 w-4 text-[#E5A77B]" />
            <span>{saving ? 'در حال ذخیره...' : 'ذخیره و انتشار تغییرات'}</span>
          </button>
        </div>
      </div>

      {/* Section 1 (Always Unlocked): Menu Display Layout & Card Visibility */}
      <div className="paper-sheet space-y-5 rounded-3xl p-6">
        <div className="flex items-center gap-2 border-b border-dashed border-[#2B1B12]/15 pb-3">
          <LayoutGrid className="h-4 w-4 text-[#96522B]" />
          <h3 className="text-sm font-extrabold text-[#2B1B12]">
            چیدمان نمایش منو و جزئیات روی کارت محصولات
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="paper-sheet-kraft space-y-3 rounded-2xl p-4">
            <p className="text-xs font-extrabold text-[#2B1B12]">حالت نمایش پیش‌فرض منو برای مشتری</p>
            <p className="text-[11px] text-[#6A574A]">
              انتخاب کنید مشتریان در لحظه باز کردن منو، آیتم‌ها را به‌صورت گالری سه‌بعدی ببینند یا لیست
              کلاسیک سریع:
            </p>
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setDefaultMenuLayout('grid')}
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold ${
                  defaultMenuLayout === 'grid' ? 'btn-paper-primary' : 'btn-paper-cream'
                }`}
              >
                <LayoutGrid className="h-4 w-4" />
                <span>گالری کاغذی (سه‌بعدی)</span>
              </button>
              <button
                type="button"
                onClick={() => setDefaultMenuLayout('list')}
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold ${
                  defaultMenuLayout === 'list' ? 'btn-paper-primary' : 'btn-paper-cream'
                }`}
              >
                <List className="h-4 w-4" />
                <span>لیست کلاسیک</span>
              </button>
            </div>
          </div>

          <div className="paper-sheet-kraft space-y-3 rounded-2xl p-4">
            <p className="text-xs font-extrabold text-[#2B1B12]">نمایش اطلاعات تکمیلی روی کارت و مودال آیتم</p>
            <div className="space-y-2.5 pt-1 text-xs font-bold text-[#2B1B12]">
              <label className="paper-sheet flex cursor-pointer items-center justify-between rounded-xl px-3.5 py-2.5">
                <span>نمایش زمان آماده‌سازی (دقیقه) روی کارت‌ها</span>
                <input
                  type="checkbox"
                  checked={showPrepTime}
                  onChange={(e) => setShowPrepTime(e.target.checked)}
                  className="h-4 w-4 accent-[#536F60]"
                />
              </label>
              <label className="paper-sheet flex cursor-pointer items-center justify-between rounded-xl px-3.5 py-2.5">
                <span>نمایش میزان کالری (کیلوکالری) در جزئیات محصول</span>
                <input
                  type="checkbox"
                  checked={showCalories}
                  onChange={(e) => setShowCalories(e.target.checked)}
                  className="h-4 w-4 accent-[#536F60]"
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2 (Always Unlocked): Menu Banner & All Menu Copy */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="paper-sheet space-y-4 rounded-3xl p-6">
          <div className="flex items-center gap-2 border-b border-dashed border-[#2B1B12]/15 pb-3">
            <ImageIcon className="h-4 w-4 text-[#96522B]" />
            <h3 className="text-sm font-extrabold text-[#2B1B12]">بنر اختصاصی منو و دکمه‌های سبد سفارش</h3>
          </div>

          {renderImageCard(
            'menuBannerImageUrl',
            'تصویر بنر بخش دفترچه منو',
            'بنر نمایشی بالای دسته‌بندی‌ها و آیتم‌های منو',
            true,
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {renderTextInput('headerShareLabel', 'متن دکمه اشتراک‌گذاری')}
            {renderTextInput('headerTrayLabel', 'متن دکمه سینی سفارش')}
            {renderTextInput('menuGridViewLabelFa', 'برچسب دکمه نمای گالری')}
            {renderTextInput('menuListViewLabelFa', 'برچسب دکمه نمای لیست')}
          </div>
        </div>

        <div className="paper-sheet space-y-4 rounded-3xl p-6">
          <div className="flex items-center gap-2 border-b border-dashed border-[#2B1B12]/15 pb-3">
            <Type className="h-4 w-4 text-[#96522B]" />
            <h3 className="text-sm font-extrabold text-[#2B1B12]">عناوین بخش‌های منو، جستجو و برگزیده‌ها</h3>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {renderTextInput('popularEyebrowEn', 'زیرعنوان انگلیسی برگزیده‌ها', 'ltr')}
            {renderTextInput('popularTitleFa', 'عنوان بخش برگزیده‌ها')}
            {renderTextInput('popularActionFa', 'دکمه بخش برگزیده‌ها')}
            {renderTextInput('catalogAllChaptersFa', 'دکمه نمایش همه دسته‌ها')}
            {renderTextInput('catalogEyebrowEn', 'زیرعنوان انگلیسی دفترچه منو', 'ltr')}
            {renderTextInput('catalogTitleFa', 'عنوان بخش دفترچه منو')}
            {renderTextInput('searchPlaceholderFa', 'متن راهنمای کادر جستجو')}
            {renderTextInput('heroFilterSignatureLabelFa', 'دکمه فیلتر برگزیده‌ها')}
            <div className="sm:col-span-2">
              {renderTextInput('emptySearchTitleFa', 'پیام هنگام یافت نشدن نتیجه جستجو')}
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Landing Page / Hero / Contact / Footer (Controlled by Platform Owner) */}
      <div className="paper-sheet space-y-5 rounded-3xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-dashed border-[#2B1B12]/15 pb-3">
          <div className="flex items-center gap-2">
            {menu.allowContentCustomization ? (
              <Sparkles className="h-4 w-4 text-[#96522B]" />
            ) : (
              <Lock className="h-4 w-4 text-[#8E7C6D]" />
            )}
            <h3 className="text-sm font-extrabold text-[#2B1B12]">
              طراحی لندینگ‌پیج، هیرو، ستون‌های معرفی و اطلاعات تماس
            </h3>
          </div>
          <span
            className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${
              menu.allowContentCustomization
                ? 'paper-sheet-sage text-[#24301B]'
                : 'paper-sheet-kraft text-[#6A574A]'
            }`}
          >
            {menu.allowContentCustomization
              ? 'باز توسط مالک پلتفرم'
              : 'توسط مالک پلتفرم مدیریت می‌شود'}
          </span>
        </div>

        {!menu.allowContentCustomization && (
          <div className="paper-sheet-kraft rounded-2xl px-4 py-3 text-xs leading-relaxed text-[#5A483C]">
            تنظیمات بخش صفحه اول (لندینگ‌پیج، تصویر هیرو، ستون‌های اصالت و فوتر) به‌صورت اختصاصی
            توسط مالک پلتفرم برای برند شما طراحی می‌شود. در همین حال، تمام تنظیمات منو در بالا برای شما
            کاملاً باز و قابل ویرایش است.
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {renderImageCard(
            'brandLogoUrl',
            'لوگو یا نشان برند در هدر',
            'در کنار نام کافه در نوار بالایی صفحه نمایش داده می‌شود',
            false,
            !menu.allowContentCustomization,
          )}
          {renderImageCard(
            'heroFeaturedImageUrl',
            'تصویر اصلی بخش هیرو (Hero)',
            'جایگزین تصویر فنجان قهوه و کروسان داخل قاب موج‌دار صفحه نخست',
            true,
            !menu.allowContentCustomization,
          )}
          {renderImageCard(
            'infoSectionImageUrl',
            'تصویر بخش اطلاعات تماس و فضای کافه',
            'نمایش در کنار کارت‌های نشانی، ساعات پذیرایی و شماره تماس',
            true,
            !menu.allowContentCustomization,
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="paper-sheet-kraft space-y-3 rounded-2xl p-4">
            <div className="flex items-center gap-2 border-b border-dashed border-[#2B1B12]/15 pb-2">
              <Palette className="h-4 w-4 text-[#96522B]" />
              <p className="text-xs font-extrabold text-[#2B1B12]">متن‌های هدر و صفحه اول (Hero)</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {renderTextInput('navFeaturedLabel', 'لینک اول منو', 'rtl', false, !menu.allowContentCustomization)}
              {renderTextInput('navCatalogLabel', 'لینک دوم منو', 'rtl', false, !menu.allowContentCustomization)}
              {renderTextInput('navInfoLabel', 'لینک سوم منو', 'rtl', false, !menu.allowContentCustomization)}
              {renderTextInput('heroQualityBadgeFa', 'نشان روی تصویر هیرو', 'rtl', false, !menu.allowContentCustomization)}
              <div className="sm:col-span-2">
                {renderTextInput('heroTitleFa', 'تیتر بزرگ صفحه اول', 'rtl', false, !menu.allowContentCustomization)}
              </div>
              <div className="sm:col-span-2">
                {renderTextInput('heroSubtitleFa', 'متن زیرتیتر معرفی هیرو', 'rtl', true, !menu.allowContentCustomization)}
              </div>
              {renderTextInput('heroPrimaryCtaFa', 'دکمه اصلی هیرو', 'rtl', false, !menu.allowContentCustomization)}
              {renderTextInput('heroSecondaryCtaFa', 'دکمه دوم هیرو', 'rtl', false, !menu.allowContentCustomization)}
              {renderTextInput('heroHighlight1Fa', 'برچسب ویژگی اول', 'rtl', false, !menu.allowContentCustomization)}
              {renderTextInput('heroHighlight2Fa', 'برچسب ویژگی دوم', 'rtl', false, !menu.allowContentCustomization)}
              {renderTextInput('heroHighlight3Fa', 'برچسب ویژگی سوم', 'rtl', false, !menu.allowContentCustomization)}
              {renderTextInput('heroBadgeEn', 'برچسب انگلیسی برند', 'ltr', false, !menu.allowContentCustomization)}
            </div>
          </div>

          <div className="paper-sheet-kraft space-y-3 rounded-2xl p-4">
            <div className="flex items-center gap-2 border-b border-dashed border-[#2B1B12]/15 pb-2">
              <Type className="h-4 w-4 text-[#96522B]" />
              <p className="text-xs font-extrabold text-[#2B1B12]">اطلاعات تماس، سفارش سرمیز و فوتر</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                {renderTextInput('infoSectionTitleFa', 'عنوان بخش اطلاعات تماس', 'rtl', false, !menu.allowContentCustomization)}
              </div>
              {renderTextInput('infoAddressTitleFa', 'عنوان کارت نشانی', 'rtl', false, !menu.allowContentCustomization)}
              {renderTextInput('infoHoursTitleFa', 'عنوان کارت ساعات کاری', 'rtl', false, !menu.allowContentCustomization)}
              {renderTextInput('infoPhoneTitleFa', 'عنوان کارت شماره تماس', 'rtl', false, !menu.allowContentCustomization)}
              {renderTextInput('infoPhoneValueFa', 'شماره تلفن تماس / رزرو', 'ltr', false, !menu.allowContentCustomization)}
              {renderTextInput('infoQrTitleFa', 'عنوان کارت سفارش سرمیز', 'rtl', false, !menu.allowContentCustomization)}
              {renderTextInput('footerCopyFa', 'متن کپی‌رایت فوتر', 'rtl', false, !menu.allowContentCustomization)}
              <div className="sm:col-span-2">
                {renderTextInput('infoQrDescFa', 'توضیح کارت سفارش سرمیز', 'rtl', true, !menu.allowContentCustomization)}
              </div>
              <div className="sm:col-span-2">
                {renderTextInput('footerTaglineEn', 'متن انگلیسی پایین فوتر', 'ltr', false, !menu.allowContentCustomization)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};
