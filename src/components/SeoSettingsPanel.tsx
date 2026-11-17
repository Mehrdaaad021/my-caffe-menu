import React from 'react';
import {
  Check,
  ExternalLink,
  RefreshCw,
  Search,
  Sparkles,
} from '@/src/components/ClayCafeIcons';
import { resolveDefaultCafeSeo } from '@/src/lib/seoHead';
import { toPersianDigits } from '@/src/lib/formatters';
import type { RestaurantSettings } from '@/src/types/menu';

interface SeoSettingsPanelProps {
  cafeSlug: string;
  settings: RestaurantSettings;
  metaTitle: string;
  metaDescription: string;
  savedMetaTitle: string;
  savedMetaDescription: string;
  saving?: boolean;
  onChangeMetaTitle: (value: string) => void;
  onChangeMetaDescription: (value: string) => void;
  onSaveSeo: () => void;
  onResetSeo: () => void;
}

export const SeoSettingsPanel: React.FC<SeoSettingsPanelProps> = ({
  cafeSlug,
  settings,
  metaTitle,
  metaDescription,
  savedMetaTitle,
  savedMetaDescription,
  saving = false,
  onChangeMetaTitle,
  onChangeMetaDescription,
  onSaveSeo,
  onResetSeo,
}) => {
  const defaults = resolveDefaultCafeSeo(settings);
  const previewTitle = metaTitle.trim() || defaults.title;
  const previewDescription = metaDescription.trim() || defaults.description;

  const titleLen = previewTitle.length;
  const descLen = previewDescription.length;
  const titleOptimal = titleLen >= 25 && titleLen <= 65;
  const descOptimal = descLen >= 70 && descLen <= 165;

  const hasUnsavedChanges =
    metaTitle.trim() !== savedMetaTitle.trim() ||
    metaDescription.trim() !== savedMetaDescription.trim();

  const originDisplay =
    typeof window !== 'undefined' ? window.location.host : 'mycafe.ir';
  const previewUrl =
    cafeSlug && cafeSlug !== 'ors-atelier'
      ? `${originDisplay}/?cafe=${cafeSlug}`
      : `${originDisplay}/`;

  const handleSmartFill = () => {
    const brand = settings.nameFa.trim() || 'کافه من';
    const addressPart = settings.addressFa.trim() ? ` در ${settings.addressFa.trim()}` : '';
    onChangeMetaTitle(`${brand} | منوی دیجیتال سه‌بعدی و سفارش آنلاین میز`);
    onChangeMetaDescription(
      `منوی کامل ${brand}${addressPart} را با پیش‌نمایش سه‌بعدی نوشیدنی‌ها و دسرها ببینید و با اسکن QR کد به‌صورت مستقیم از روی میز سفارش دهید.`,
    );
  };

  return (
    <div className="paper-sheet rounded-3xl p-6 sm:p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-dashed border-[#2B1B12]/15 pb-5">
        <div className="flex items-start gap-3.5">
          <div className="paper-sheet-sage flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl">
            <Search className="h-6 w-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-extrabold text-[#2B1B12] sm:text-lg">
                تنظیمات سئو و متا تگ‌های اختصاصی کافه (Meta Title & Description)
              </h3>
              {hasUnsavedChanges && (
                <span className="rounded-full bg-[#EFEAFE] px-2.5 py-0.5 text-[11px] font-extrabold text-[#594D8B] ring-1 ring-[#8C7EC4]/35">
                  تغییرات ذخیره نشده
                </span>
              )}
            </div>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[#6A574A]">
              عنوان مرورگر و توضیحات سئو اختصاصی این کافه را تنظیم کنید؛ پس از ذخیره، در تگ‌های
              {' '}<code dir="ltr" className="rounded bg-[#EFE6D5] px-1.5 py-0.5 font-mono text-[11px]">&lt;head&gt;</code>{' '}
              (شامل title، meta description، OpenGraph و Twitter Card) اعمال می‌شوند.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSmartFill}
            disabled={saving}
            className="btn-paper-kraft inline-flex min-h-[40px] items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold disabled:opacity-45"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>تکمیل هوشمند</span>
          </button>

          <button
            type="button"
            onClick={onResetSeo}
            disabled={saving || (!metaTitle.trim() && !metaDescription.trim() && !savedMetaTitle && !savedMetaDescription)}
            className="btn-paper-cream inline-flex min-h-[40px] items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold disabled:opacity-45"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>بازگشت به پیش‌فرض</span>
          </button>

          <button
            type="button"
            onClick={onSaveSeo}
            disabled={saving}
            className="btn-paper-primary inline-flex min-h-[40px] items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" />
            <span>{saving ? 'در حال ذخیره...' : 'ذخیره و اعمال در <head>'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Form Inputs */}
        <div className="space-y-5 lg:col-span-7">
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label htmlFor="seo-meta-title" className="text-xs font-bold text-[#2B1B12]">
                عنوان سایت (Meta Title)
              </label>
              <span
                className={`rounded-lg px-2 py-0.5 tabular-nums text-[11px] font-bold ${
                  titleOptimal
                    ? 'bg-[#E3EBE4] text-[#2B533E]'
                    : 'bg-[#F5E9D6] text-[#8E5329]'
                }`}
              >
                {toPersianDigits(titleLen)} / {toPersianDigits(60)} کاراکتر
              </span>
            </div>
            <input
              id="seo-meta-title"
              type="text"
              maxLength={110}
              value={metaTitle}
              onChange={(e) => onChangeMetaTitle(e.target.value)}
              placeholder={defaults.title}
              className="paper-recess w-full rounded-xl px-4 py-2.5 text-sm font-medium text-[#2B1B12] placeholder:text-[#8E7C6D] focus:outline-2 focus:outline-[#2B1B12]"
            />
            <p className="mt-1.5 text-[11px] text-[#6A574A]">
              بازه استاندارد گوگل بین ۳۰ تا ۶۰ کاراکتر است. در صورت خالی ماندن، عنوان پیش‌فرض کافه اعمال می‌شود.
            </p>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label htmlFor="seo-meta-desc" className="text-xs font-bold text-[#2B1B12]">
                توضیحات سئو (Meta Description)
              </label>
              <span
                className={`rounded-lg px-2 py-0.5 tabular-nums text-[11px] font-bold ${
                  descOptimal
                    ? 'bg-[#E3EBE4] text-[#2B533E]'
                    : 'bg-[#F5E9D6] text-[#8E5329]'
                }`}
              >
                {toPersianDigits(descLen)} / {toPersianDigits(160)} کاراکتر
              </span>
            </div>
            <textarea
              id="seo-meta-desc"
              rows={3}
              maxLength={260}
              value={metaDescription}
              onChange={(e) => onChangeMetaDescription(e.target.value)}
              placeholder={defaults.description}
              className="paper-recess w-full resize-none rounded-xl px-4 py-2.5 text-sm leading-relaxed font-medium text-[#2B1B12] placeholder:text-[#8E7C6D] focus:outline-2 focus:outline-[#2B1B12]"
            />
            <p className="mt-1.5 text-[11px] text-[#6A574A]">
              توضیح جذاب بین ۱۲۰ تا ۱۶۰ کاراکتر نرخ کلیک (CTR) کافه شما را در نتایج جستجو و اشتراک لینک افزایش می‌دهد.
            </p>
          </div>
        </div>

        {/* Live Google SERP Preview Card */}
        <div className="lg:col-span-5">
          <div className="paper-sheet-kraft h-full rounded-2xl p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#2B1B12]">
                پیش‌نمایش زنده در نتایج گوگل (SERP)
              </span>
              <ExternalLink className="h-3.5 w-3.5 text-[#6A574A]" />
            </div>

            <div className="rounded-2xl border border-[#2B1B12]/10 bg-white p-4 shadow-xs">
              <div className="mb-1.5 flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#E3EBE4] text-[11px] font-extrabold text-[#365342]">
                  {(settings.nameFa || 'ک').slice(0, 1)}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-xs font-bold text-[#202124]">
                    {settings.nameFa || 'کافه من'}
                  </div>
                  <div dir="ltr" className="truncate text-right text-[11px] text-[#4D5156]">
                    https://{previewUrl}
                  </div>
                </div>
              </div>

              <h4 className="mb-1 line-clamp-2 text-base leading-snug font-bold text-[#1A0DAB]">
                {previewTitle}
              </h4>

              <p className="line-clamp-3 text-xs leading-relaxed text-[#4D5156]">
                {previewDescription}
              </p>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-[#5A483C]">
              <span className="rounded-lg bg-[#FFFDF8] px-2.5 py-1 font-semibold">
                title &amp; og:title
              </span>
              <span className="rounded-lg bg-[#FFFDF8] px-2.5 py-1 font-semibold">
                meta description
              </span>
              <span className="rounded-lg bg-[#FFFDF8] px-2.5 py-1 font-semibold">
                Schema.org JSON-LD
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
