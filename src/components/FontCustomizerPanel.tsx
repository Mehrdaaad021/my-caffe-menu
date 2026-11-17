import React from 'react';
import {
  Check,
  Coffee,
  RefreshCw,
  Sparkles,
  Type,
} from '@/src/components/ClayCafeIcons';
import {
  applyAppFonts,
  ENGLISH_FONT_PRESETS,
  getEnglishFontPreset,
  getPersianFontPreset,
  PERSIAN_FONT_PRESETS,
} from '@/src/lib/fontPresets';
import { formatPriceFa } from '@/src/lib/formatters';

interface FontCustomizerPanelProps {
  cafeNameFa: string;
  cafeNameEn: string;
  currencyLabel: string;
  selectedFontFa: string;
  selectedFontEn: string;
  savedFontFa: string;
  savedFontEn: string;
  saving?: boolean;
  onSelectFontFa: (fontId: string) => void;
  onSelectFontEn: (fontId: string) => void;
  onSaveFonts: () => void;
  onResetFonts: () => void;
}

export const FontCustomizerPanel: React.FC<FontCustomizerPanelProps> = ({
  cafeNameFa,
  cafeNameEn,
  currencyLabel,
  selectedFontFa,
  selectedFontEn,
  savedFontFa,
  savedFontEn,
  saving = false,
  onSelectFontFa,
  onSelectFontEn,
  onSaveFonts,
  onResetFonts,
}) => {
  const activeFa = getPersianFontPreset(selectedFontFa);
  const activeEn = getEnglishFontPreset(selectedFontEn);
  const hasUnsavedChanges = selectedFontFa !== savedFontFa || selectedFontEn !== savedFontEn;

  const handlePickFa = (id: string) => {
    onSelectFontFa(id);
    applyAppFonts(id, selectedFontEn);
  };

  const handlePickEn = (id: string) => {
    onSelectFontEn(id);
    applyAppFonts(selectedFontFa, id);
  };

  return (
    <div className="paper-sheet rounded-3xl p-6 sm:p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-dashed border-[#2B1B12]/15 pb-5">
        <div className="flex items-start gap-3.5">
          <div className="paper-sheet-sage flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl">
            <Type className="h-6 w-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-extrabold text-[#2B1B12] sm:text-lg">
                تغییر فونت فارسی و انگلیسی کل اپلیکیشن
              </h3>
              {hasUnsavedChanges && (
                <span className="rounded-full bg-[#EFEAFE] px-2.5 py-0.5 text-[11px] font-extrabold text-[#594D8B] ring-1 ring-[#8C7EC4]/35">
                  در حال پیش‌نمایش زنده
                </span>
              )}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-[#6A574A]">
              فونت دلخواه فارسی و انگلیسی خود را انتخاب کنید؛ تمام بخش‌های پنل و کارت پیش‌نمایش
              هم‌زمان تغییر می‌کنند و با زدن دکمه ذخیره برای همه مشتریان ثبت می‌شوند.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onResetFonts}
            disabled={saving || (selectedFontFa === 'vazirmatn' && selectedFontEn === 'cormorant')}
            className="btn-paper-cream inline-flex min-h-[40px] items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold disabled:opacity-45"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>بازگشت به پیش‌فرض</span>
          </button>

          <button
            type="button"
            onClick={onSaveFonts}
            disabled={saving}
            className="btn-paper-primary inline-flex min-h-[40px] items-center gap-1.5 rounded-xl px-5 py-2 text-xs font-extrabold disabled:opacity-60"
          >
            <Check className="h-3.5 w-3.5 text-[#DCE6DD]" />
            <span>{saving ? 'در حال ذخیره...' : 'ذخیره و اعمال نهایی فونت‌ها'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Left/Right Interactive Preset Selectors */}
        <div className="space-y-6 xl:col-span-7">
          {/* Persian Font Picker */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#2B1B12]">
                ۱. انتخاب فونت فارسی (متون، تیترها و دکمه‌ها)
              </span>
              <span className="text-[11px] font-bold text-[#536F60]">{activeFa.nameFa}</span>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {PERSIAN_FONT_PRESETS.map((preset) => {
                const isSelected = activeFa.id === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handlePickFa(preset.id)}
                    style={{ fontFamily: preset.cssFamily }}
                    className={`group flex flex-col justify-between rounded-2xl p-3.5 text-right transition-all ${
                      isSelected
                        ? 'paper-sheet-sage ring-2 ring-[#4E6B5B]'
                        : 'paper-sheet-kraft hover:-translate-y-0.5 hover:brightness-[1.01]'
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-sm font-extrabold text-[#222E27]">{preset.nameFa}</span>
                      <span
                        className={`rounded-lg px-2 py-0.5 text-[10px] font-bold ${
                          isSelected
                            ? 'bg-[#4E6B5B] text-white'
                            : 'bg-white/80 text-[#536F60]'
                        }`}
                      >
                        {preset.badge}
                      </span>
                    </div>
                    <p className="line-clamp-1 text-xs font-semibold text-[#2B1B12]">
                      {preset.sampleFa}
                    </p>
                    <p className="mt-1.5 text-[11px] leading-snug text-[#5A483C]">
                      {preset.descriptionFa}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* English Font Picker */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#2B1B12]">
                ۲. انتخاب فونت انگلیسی / نمایشی (عناوین لاتین و تگ‌ها)
              </span>
              <span dir="ltr" className="text-[11px] font-bold text-[#96522B]">
                {activeEn.nameEn}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {ENGLISH_FONT_PRESETS.map((preset) => {
                const isSelected = activeEn.id === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handlePickEn(preset.id)}
                    className={`group flex flex-col justify-between rounded-2xl p-3.5 text-right transition-all ${
                      isSelected
                        ? 'paper-sheet-sage ring-2 ring-[#4E6B5B]'
                        : 'paper-sheet-kraft hover:-translate-y-0.5 hover:brightness-[1.01]'
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-xs font-extrabold text-[#222E27]">{preset.nameFa}</span>
                      <span
                        className={`rounded-lg px-2 py-0.5 text-[10px] font-bold ${
                          isSelected
                            ? 'bg-[#4E6B5B] text-white'
                            : 'bg-white/80 text-[#96522B]'
                        }`}
                      >
                        {preset.badge}
                      </span>
                    </div>
                    <p
                      dir="ltr"
                      style={{ fontFamily: preset.cssFamily }}
                      className="truncate text-left text-sm font-semibold italic text-[#2B1B12]"
                    >
                      {preset.sampleEn}
                    </p>
                    <p className="mt-1.5 text-[11px] leading-snug text-[#5A483C]">
                      {preset.descriptionFa}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Live Instant Typography Preview Card */}
        <div className="xl:col-span-5">
          <div className="paper-sheet-kraft sticky top-6 rounded-3xl p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#222E27]">
                <Sparkles className="h-4 w-4 text-[#536F60]" />
                <span>پیش‌نمایش زنده در منوی مشتری</span>
              </span>
              <span className="rounded-lg bg-white/80 px-2.5 py-0.5 text-[10px] font-bold text-[#536F60]">
                به‌روزرسانی لحظه‌ای
              </span>
            </div>

            <div
              className="paper-sheet space-y-4 rounded-2xl p-5"
              style={{ fontFamily: activeFa.cssFamily }}
            >
              {/* Simulated Header Lockup */}
              <div className="flex items-center justify-between border-b border-dashed border-[#2B1B12]/15 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="paper-sheet-sage flex h-10 w-10 items-center justify-center rounded-xl">
                    <Coffee className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-base font-extrabold text-[#2B1B12]">{cafeNameFa}</div>
                    <div
                      dir="ltr"
                      style={{ fontFamily: activeEn.cssFamily }}
                      className="text-right text-[11px] font-semibold tracking-wider text-[#556B57] uppercase"
                    >
                      {cafeNameEn}
                    </div>
                  </div>
                </div>
                <span
                  dir="ltr"
                  style={{ fontFamily: activeEn.cssFamily }}
                  className="rounded-full bg-[#E3EBE4] px-3 py-1 text-[11px] font-bold italic text-[#4E6B5B]"
                >
                  Table Menu
                </span>
              </div>

              {/* Simulated Hero Headline */}
              <div>
                <p
                  dir="ltr"
                  style={{ fontFamily: activeEn.cssFamily }}
                  className="mb-1 text-right text-xs font-semibold italic text-[#96522B]"
                >
                  Artisan Roasted · Fresh Every Morning
                </p>
                <h4 className="text-xl font-extrabold leading-snug text-[#2B1B12]">
                  قهوه‌ای که از اولین جرعه عاشقش می‌شوید
                </h4>
                <p className="mt-1.5 text-xs leading-relaxed text-[#6A574A]">
                  ترکیب دانه‌های عربیکای تازه‌برشت، شیر مخملی و کروسان کره فرانسوی در فضایی دنج.
                </p>
              </div>

              {/* Simulated Menu Item Card */}
              <div className="paper-sheet-kraft rounded-2xl p-3.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-extrabold text-[#2B1B12]">لته کارامل نمکی دست‌ساز</span>
                  <span
                    dir="ltr"
                    style={{ fontFamily: activeEn.cssFamily }}
                    className="text-xs italic text-[#7A6658]"
                  >
                    Salted Caramel Latte
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-[#6A574A]">
                  اسپرسو دبل، شیر بخارداده‌شده، سس کارامل خانگی و نمک دریایی
                </p>
                <div className="mt-3 flex items-center justify-between border-t border-dashed border-[#2B1B12]/12 pt-2.5">
                  <span className="tabular-nums text-sm font-extrabold text-[#2B1B12]">
                    {formatPriceFa(245000)}{' '}
                    <span className="text-[11px] font-medium text-[#6A574A]">{currencyLabel}</span>
                  </span>
                  <span className="btn-paper-primary rounded-full px-3.5 py-1.5 text-[11px] font-bold">
                    افزودن به سینی
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
