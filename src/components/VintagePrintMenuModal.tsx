import React, { useEffect, useMemo, useState } from 'react';
import { FileDown, Printer, ScrollText, X } from '@/src/components/ClayCafeIcons';
import type { MenuDatabase } from '@/src/types/menu';
import { resolveAppContent } from '@/src/lib/defaultContent';
import { formatPriceFa, toPersianDigits } from '@/src/lib/formatters';

interface VintagePrintMenuModalProps {
  open: boolean;
  menu: MenuDatabase;
  onClose: () => void;
}

export const VintagePrintMenuModal: React.FC<VintagePrintMenuModalProps> = ({
  open,
  menu,
  onClose,
}) => {
  const [paperTone, setPaperTone] = useState<'parchment' | 'ivory'>('parchment');
  const [columns, setColumns] = useState<1 | 2>(2);
  const [onlyAvailable, setOnlyAvailable] = useState(true);
  const [showEnglish, setShowEnglish] = useState(true);
  const [showIngredients, setShowIngredients] = useState(true);

  const appContent = useMemo(
    () => resolveAppContent(menu.settings, menu.contentOverrides),
    [menu.settings, menu.contentOverrides],
  );

  useEffect(() => {
    if (!open) return;
    document.body.classList.add('printing-vintage-menu');
    return () => {
      document.body.classList.remove('printing-vintage-menu');
    };
  }, [open]);

  const groupedCategories = useMemo(() => {
    return menu.categories
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((cat) => ({
        category: cat,
        items: menu.items.filter(
          (item) => item.categoryId === cat.id && (!onlyAvailable || item.isAvailable),
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [menu.categories, menu.items, onlyAvailable]);

  if (!open) return null;

  const isParchment = paperTone === 'parchment';

  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div
      className="vintage-print-overlay fixed inset-0 z-[80] flex flex-col bg-[#1B120B]/75 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="پیش‌نمایش چاپی منو با استایل کاغذ قدیمی"
    >
      {/* Top Toolbar (Hidden During Actual Printing / PDF Export) */}
      <div className="no-print border-b border-[#D9C8AE]/30 bg-[#2B1B12] px-4 py-3 text-[#FCF9F2] shadow-lg sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#3D261A] text-[#E5A77B]">
              <ScrollText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold sm:text-base">
                پیش‌نمایش چاپی منو (استایل کاغذ قدیمی و کلاسیک)
              </h2>
              <p className="text-[11px] text-[#E9DEC9]/80">
                برای ذخیره با کیفیت PDF، دکمه چاپ را بزنید و گزینه Save as PDF و Background graphics را
                فعال کنید.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Paper Style Switch */}
            <div className="inline-flex rounded-xl bg-[#1E120B] p-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setPaperTone('parchment')}
                className={`rounded-lg px-3 py-1.5 transition-colors ${
                  isParchment ? 'bg-[#C27445] text-white' : 'text-[#E9DEC9] hover:text-white'
                }`}
              >
                کاغذ کاهی قدیمی
              </button>
              <button
                type="button"
                onClick={() => setPaperTone('ivory')}
                className={`rounded-lg px-3 py-1.5 transition-colors ${
                  !isParchment ? 'bg-[#C27445] text-white' : 'text-[#E9DEC9] hover:text-white'
                }`}
              >
                کلاسیک عاجی
              </button>
            </div>

            {/* Columns Switch */}
            <div className="inline-flex rounded-xl bg-[#1E120B] p-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setColumns(2)}
                className={`rounded-lg px-3 py-1.5 transition-colors ${
                  columns === 2 ? 'bg-[#FCF9F2] text-[#2B1B12]' : 'text-[#E9DEC9] hover:text-white'
                }`}
              >
                دو ستونه
              </button>
              <button
                type="button"
                onClick={() => setColumns(1)}
                className={`rounded-lg px-3 py-1.5 transition-colors ${
                  columns === 1 ? 'bg-[#FCF9F2] text-[#2B1B12]' : 'text-[#E9DEC9] hover:text-white'
                }`}
              >
                تک ستونه
              </button>
            </div>

            <button
              type="button"
              onClick={handlePrintPdf}
              className="btn-paper-terracotta inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold"
            >
              <Printer className="h-4 w-4" />
              <span>چاپ / خروجی PDF</span>
              <FileDown className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="بستن پیش‌نمایش"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-[#FCF9F2] hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Fine Display Toggles */}
        <div className="mx-auto mt-2.5 flex max-w-6xl flex-wrap items-center gap-5 text-[11px] font-semibold text-[#E9DEC9]">
          <label className="inline-flex cursor-pointer items-center gap-1.5">
            <input
              type="checkbox"
              checked={onlyAvailable}
              onChange={(e) => setOnlyAvailable(e.target.checked)}
              className="accent-[#E5A77B]"
            />
            <span>فقط آیتم‌های موجود</span>
          </label>
          <label className="inline-flex cursor-pointer items-center gap-1.5">
            <input
              type="checkbox"
              checked={showEnglish}
              onChange={(e) => setShowEnglish(e.target.checked)}
              className="accent-[#E5A77B]"
            />
            <span>نمایش عنوان لاتین</span>
          </label>
          <label className="inline-flex cursor-pointer items-center gap-1.5">
            <input
              type="checkbox"
              checked={showIngredients}
              onChange={(e) => setShowIngredients(e.target.checked)}
              className="accent-[#E5A77B]"
            />
            <span>نمایش مواد تشکیل‌دهنده</span>
          </label>
        </div>
      </div>

      {/* Scrollable Preview Sheet Stage */}
      <div className="vintage-print-scroll flex-1 overflow-y-auto px-4 py-8 sm:px-8">
        <div
          id="vintage-print-sheet"
          style={{
            background: isParchment
              ? 'radial-gradient(ellipse at 50% 35%, #F5EAD0 0%, #EAD8B1 62%, #DCC394 100%)'
              : '#FAF5E8',
            boxShadow: isParchment
              ? 'inset 0 0 85px rgba(108, 72, 34, 0.24), 0 28px 60px rgba(0, 0, 0, 0.45)'
              : 'inset 0 0 40px rgba(60, 42, 24, 0.08), 0 28px 60px rgba(0, 0, 0, 0.4)',
          }}
          className="relative mx-auto max-w-[920px] rounded-sm p-6 text-[#2C1C10] sm:p-10"
        >
          {/* Outer Classic Double Engraved Border */}
          <div className="relative border-2 border-[#5A3B21]/75 p-2">
            <div className="relative border border-[#5A3B21]/45 px-6 py-8 sm:px-10 sm:py-10">
              {/* Ornamental Vintage Corner Flourishes */}
              <svg
                aria-hidden="true"
                viewBox="0 0 36 36"
                className="pointer-events-none absolute right-2.5 top-2.5 h-7 w-7 text-[#5A3B21]/75"
              >
                <path
                  d="M2,2 L20,2 M2,2 L2,20 M6,6 C13,6 16,10 16,16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
              <svg
                aria-hidden="true"
                viewBox="0 0 36 36"
                className="pointer-events-none absolute left-2.5 top-2.5 h-7 w-7 -scale-x-100 text-[#5A3B21]/75"
              >
                <path
                  d="M2,2 L20,2 M2,2 L2,20 M6,6 C13,6 16,10 16,16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
              <svg
                aria-hidden="true"
                viewBox="0 0 36 36"
                className="pointer-events-none absolute bottom-2.5 right-2.5 h-7 w-7 -scale-y-100 text-[#5A3B21]/75"
              >
                <path
                  d="M2,2 L20,2 M2,2 L2,20 M6,6 C13,6 16,10 16,16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
              <svg
                aria-hidden="true"
                viewBox="0 0 36 36"
                className="pointer-events-none absolute bottom-2.5 left-2.5 h-7 w-7 scale-x-[-1] scale-y-[-1] text-[#5A3B21]/75"
              >
                <path
                  d="M2,2 L20,2 M2,2 L2,20 M6,6 C13,6 16,10 16,16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>

              {/* Classic Letterpress Masthead */}
              <header className="mb-8 border-b-2 border-double border-[#5A3B21]/45 pb-6 text-center">
                <p
                  dir="ltr"
                  className="font-display-serif mb-1 text-xs font-semibold tracking-[0.28em] text-[#6E492B] uppercase"
                >
                  EST. {toPersianDigits(1405)} · ARTISANAL COFFEE &amp; CULINARY HOUSE
                </p>
                <h1 className="text-3xl font-extrabold tracking-tight text-[#25160C] sm:text-4xl">
                  {menu.settings.nameFa}
                </h1>
                {menu.settings.nameEn && (
                  <p
                    dir="ltr"
                    className="font-display-serif mt-1 text-lg italic tracking-[0.14em] text-[#6E492B]"
                  >
                    {menu.settings.nameEn}
                  </p>
                )}

                {/* Botanical Classic Divider Ornament */}
                <div className="my-3 flex items-center justify-center gap-3 text-[#6E492B]/70">
                  <span className="h-px w-16 bg-[#5A3B21]/35" />
                  <span className="font-display-serif text-sm italic">✦</span>
                  <span className="h-px w-16 bg-[#5A3B21]/35" />
                </div>

                <p className="mx-auto max-w-xl text-xs leading-relaxed text-[#4C3623]">
                  {menu.settings.taglineFa}
                </p>
              </header>

              {/* Menu Chapters */}
              <div
                className={
                  columns === 2
                    ? 'grid grid-cols-1 gap-x-10 gap-y-8 md:grid-cols-2'
                    : 'mx-auto max-w-2xl space-y-8'
                }
              >
                {groupedCategories.map(({ category, items }, chapterIdx) => (
                  <section key={category.id} className="break-inside-avoid">
                    <div className="mb-4 border-b border-[#5A3B21]/35 pb-2">
                      <div className="flex items-baseline justify-between gap-2">
                        <h2 className="text-lg font-extrabold text-[#25160C]">
                          {toPersianDigits(String(chapterIdx + 1).padStart(2, '0'))}. {category.nameFa}
                        </h2>
                        {showEnglish && category.nameEn && (
                          <span
                            dir="ltr"
                            className="font-display-serif text-xs font-semibold italic tracking-wider text-[#6E492B] uppercase"
                          >
                            {category.nameEn}
                          </span>
                        )}
                      </div>
                    </div>

                    <ul className="space-y-4">
                      {items.map((item) => (
                        <li key={item.id} className="break-inside-avoid">
                          <div className="flex items-baseline gap-2">
                            <span className="font-extrabold text-[#25160C]">
                              {item.nameFa}
                              {item.isSignature && (
                                <span className="mr-1.5 text-[10px] font-bold text-[#8A4A20]">
                                  ★ ویژه
                                </span>
                              )}
                            </span>

                            <span
                              aria-hidden="true"
                              className="flex-1 border-b border-dotted border-[#5A3B21]/45"
                            />

                            <span className="shrink-0 tabular-nums text-sm font-extrabold text-[#25160C]">
                              {formatPriceFa(item.price)}{' '}
                              <span className="text-[10px] font-semibold text-[#5E4229]">
                                {menu.settings.currencyLabel}
                              </span>
                            </span>
                          </div>

                          {showEnglish && item.nameEn && (
                            <p
                              dir="ltr"
                              className="font-display-serif text-right text-xs italic text-[#6E492B]"
                            >
                              {item.nameEn}
                            </p>
                          )}

                          {item.descriptionFa && (
                            <p className="mt-0.5 text-[11px] leading-relaxed text-[#4E3825]">
                              {item.descriptionFa}
                            </p>
                          )}

                          {showIngredients && item.ingredientsFa.length > 0 && (
                            <p className="mt-0.5 text-[10px] font-medium text-[#6B5139]">
                              ترکیبات: {item.ingredientsFa.join('، ')}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>

              {/* Vintage Print Footer */}
              <footer className="mt-10 border-t-2 border-double border-[#5A3B21]/45 pt-5 text-center text-[11px] text-[#4E3825]">
                <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 font-semibold">
                  <span>{menu.settings.addressFa}</span>
                  <span aria-hidden="true">·</span>
                  <span>{menu.settings.hoursFa}</span>
                  {appContent.infoPhoneValueFa && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span dir="ltr" className="tabular-nums">
                        {appContent.infoPhoneValueFa}
                      </span>
                    </>
                  )}
                </div>
                {menu.settings.serviceChargePercent > 0 && (
                  <p className="mt-1.5 text-[10px] text-[#6E492B]">
                    حق سرویس مجموعه: {toPersianDigits(menu.settings.serviceChargePercent)}٪ به مبلغ
                    نهایی افزوده می‌شود.
                  </p>
                )}
              </footer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
