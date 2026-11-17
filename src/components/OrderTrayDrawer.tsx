import React, { useEffect, useState } from 'react';
import { CheckCircle2, Minus, Plus, RefreshCw, Trash2, X } from '@/src/components/ClayCafeIcons';
import type { CustomerOrder, MenuCategory, MenuItem, OrderNoteItem, OrderStatus } from '@/src/types/menu';
import { resolveMenuImage } from '@/src/lib/imageAssets';
import { useTransparent3DCutout } from '@/src/lib/cutout3d';
import { formatDigits, formatPrice } from '@/src/lib/formatters';
import { getUiStrings, type MenuLanguage } from '@/src/lib/menuI18n';
import { TrayComplementarySuggestions } from './TrayComplementarySuggestions';

interface OrderTrayDrawerProps {
  open: boolean;
  cafeSlug: string;
  items: OrderNoteItem[];
  allItems?: MenuItem[];
  categories?: MenuCategory[];
  tableNumber: number | null;
  tableCount: number;
  sessionId?: string;
  currencyLabel: string;
  serviceChargePercent: number;
  lang?: MenuLanguage;
  onClose: () => void;
  onSelectTable: (table: number | null) => void;
  onAddItem?: (item: MenuItem) => void;
  onUpdateQty: (index: number, delta: number) => void;
  onRemoveItem: (index: number) => void;
  onClearAll: () => void;
}

const TrayThumbnail: React.FC<{ imageUrl: string; name: string }> = ({ imageUrl, name }) => {
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

const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'سفارش ثبت شد و به بار و آشپزخانه ارسال گردید',
  preparing: 'باریستا و آشپزخانه در حال آماده‌سازی هستند',
  ready: 'سفارش آماده سرو روی میز شماست',
  completed: 'سفارش تکمیل و سرو شد',
  cancelled: 'این سفارش لغو شده است',
};

export const OrderTrayDrawer: React.FC<OrderTrayDrawerProps> = ({
  open,
  cafeSlug,
  items,
  allItems = [],
  categories = [],
  tableNumber,
  tableCount,
  sessionId,
  currencyLabel,
  serviceChargePercent,
  lang = 'fa',
  onClose,
  onSelectTable,
  onAddItem,
  onUpdateQty,
  onRemoveItem,
  onClearAll,
}) => {
  const ui = getUiStrings(lang);
  const [customerNote, setCustomerNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submittedOrder, setSubmittedOrder] = useState<CustomerOrder | null>(null);

  useEffect(() => {
    if (!open || !submittedOrder) return;
    if (submittedOrder.status === 'completed' || submittedOrder.status === 'cancelled') return;

    const poll = async () => {
      try {
        const res = await fetch(
          `/api/orders/${submittedOrder.id}?cafe=${encodeURIComponent(cafeSlug)}`,
        );
        if (!res.ok) return;
        const data = (await res.json()) as {
          order?: { status: OrderStatus; updatedAt: string };
        };
        if (data.order) {
          setSubmittedOrder((prev) =>
            prev
              ? { ...prev, status: data.order!.status, updatedAt: data.order!.updatedAt }
              : prev,
          );
        }
      } catch {
        // Silent poll failure
      }
    };

    const timer = setInterval(poll, 8000);
    return () => clearInterval(timer);
  }, [open, submittedOrder, cafeSlug]);

  if (!open) return null;

  const subtotal = items.reduce((sum, entry) => sum + entry.item.price * entry.quantity, 0);
  const serviceFee = Math.round((subtotal * serviceChargePercent) / 100);
  const total = subtotal + serviceFee;

  const steps = ui.tray.steps;
  const activeStep = submittedOrder
    ? submittedOrder.status === 'completed' || submittedOrder.status === 'ready'
      ? 3
      : submittedOrder.status === 'preparing'
        ? 2
        : 1
    : items.length > 0
      ? 0
      : -1;

  const handleSubmitOrder = async () => {
    if (items.length === 0) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cafeSlug,
          tableNumber,
          sessionId,
          customerNote: customerNote.trim() || undefined,
          items: items.map((entry) => ({
            itemId: entry.item.id,
            quantity: entry.quantity,
            note: entry.note,
          })),
        }),
      });
      const data = (await res.json()) as { order?: CustomerOrder; error?: string };
      if (!res.ok || !data.order) {
        setSubmitError(data.error || 'ثبت سفارش ناموفق بود. لطفاً دوباره تلاش کنید.');
        return;
      }
      setSubmittedOrder(data.order);
      setCustomerNote('');
      onClearAll();
    } catch {
      setSubmitError('ارتباط با سرور برقرار نشد.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex justify-end bg-[#1F130C]/55 backdrop-blur-xs"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="سینی سفارش میز"
    >
      <aside
        onClick={(e) => e.stopPropagation()}
        className="paper-canvas flex h-[100dvh] w-full max-w-md flex-col border-r border-white/85 text-[#222E27] shadow-2xl"
      >
        {/* Layered Soft-3D Header */}
        <div className="paper-sheet flex items-center justify-between px-4 py-4 sm:px-6 sm:py-5">
          <div>
            <p dir="ltr" className="font-display-serif text-right text-xs italic tracking-wider text-[#536F60]">
              TABLE SERVICE TICKET
            </p>
            <h2 className="text-base font-extrabold text-[#222E27] sm:text-lg">{ui.tray.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="btn-paper-cream flex h-11 w-11 items-center justify-center rounded-full"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Botanical Sage Step Progress Strip */}
        <div className="paper-sheet-kraft px-4 py-3.5 sm:px-6 sm:py-4">
          <div className="mb-3 flex items-center justify-between gap-1.5 sm:gap-2">
            {steps.map((label, idx) => (
              <div key={label} className="flex flex-1 flex-col items-center text-center">
                <div
                  className={`mb-1.5 flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-extrabold transition-all ${
                    idx <= activeStep
                      ? 'bg-[#536F60] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_3px_0_#374E42]'
                      : 'paper-sheet text-[#647369]'
                  }`}
                >
                  {formatDigits(idx + 1, lang)}
                </div>
                <span
                  className={`text-[9px] font-bold sm:text-[10px] ${
                    idx <= activeStep ? 'text-[#222E27]' : 'text-[#647369]'
                  }`}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>

          {!submittedOrder && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-[#536F60]/25 pt-3 sm:gap-4">
              <label htmlFor="tray-table-select" className="text-xs font-bold text-[#222E27]">
                {ui.tray.tableLabel}
              </label>
              <select
                id="tray-table-select"
                value={tableNumber ?? ''}
                onChange={(e) => onSelectTable(e.target.value ? Number(e.target.value) : null)}
                className="paper-recess min-h-[40px] rounded-full px-3.5 py-2 text-xs font-bold text-[#222E27] focus:outline-none"
              >
                <option value="">{ui.tray.takeawayOption}</option>
                {Array.from({ length: tableCount }, (_, i) => i + 1).map((num) => (
                  <option key={num} value={num}>
                    {lang === 'en'
                      ? ui.tray.tableOption(num)
                      : `میز شماره ${formatDigits(num, 'fa')}`}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          {submittedOrder ? (
            <div className="paper-sheet space-y-4 rounded-3xl p-5">
              <div className="flex items-center justify-between border-b border-dashed border-[#2B1B12]/15 pb-3">
                <div className="flex items-center gap-2 text-[#2B1B12]">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-[#5C7247]" />
                  <span className="text-sm font-extrabold">
                    {ui.tray.orderSlip(submittedOrder.orderNumber)}
                  </span>
                </div>
                <span className="paper-sheet-kraft rounded-lg px-2.5 py-1 text-xs font-bold text-[#2B1B12]">
                  {submittedOrder.tableNumber
                    ? lang === 'en'
                      ? `Table ${submittedOrder.tableNumber}`
                      : `میز ${formatDigits(submittedOrder.tableNumber, 'fa')}`
                    : ui.tray.takeawayTag}
                </span>
              </div>

              <div className="paper-sheet-sage rounded-xl px-4 py-3 text-xs font-bold text-[#2B1B12]">
                <div className="flex items-center justify-between gap-2">
                  <span>{ui.tray.statusMap[submittedOrder.status]}</span>
                  <RefreshCw className="h-3.5 w-3.5 shrink-0 text-[#5C7247]" />
                </div>
              </div>

              <div className="divide-y divide-dashed divide-[#2B1B12]/15">
                {submittedOrder.items.map((entry, idx) => (
                  <div
                    key={`${entry.itemId}-${idx}`}
                    className="flex items-start justify-between gap-3 py-3"
                  >
                    <div>
                      <p className="text-sm font-bold text-[#2B1B12]">
                        {formatDigits(entry.quantity, lang)} × {entry.nameFa}
                      </p>
                      {entry.note && (
                        <p className="mt-0.5 text-xs text-[#96522B]">{entry.note}</p>
                      )}
                    </div>
                    <span className="tabular-nums text-xs font-bold text-[#2B1B12]">
                      {formatPrice(entry.unitPrice * entry.quantity, lang)} {currencyLabel}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between border-t border-dashed border-[#2B1B12]/15 pt-3 text-sm font-extrabold text-[#2B1B12]">
                <span>{ui.tray.totalRecorded}</span>
                <span className="tabular-nums">
                  {formatPrice(submittedOrder.total, lang)} {currencyLabel}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setSubmittedOrder(null)}
                className="btn-paper-kraft w-full rounded-full py-2.5 text-xs font-bold"
              >
                {ui.tray.newOrderBtn}
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="paper-tray-complement mb-4 rounded-3xl px-7 py-5">
                <p className="font-display-serif text-base italic text-[#536F60]">
                  Empty Paper Tray
                </p>
                <p className="mt-1 text-base font-extrabold text-[#222E27]">
                  {ui.tray.emptyTitle}
                </p>
              </div>
              <p className="max-w-xs text-xs leading-relaxed text-[#5C6B61]">
                {ui.tray.emptyDesc}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((entry, idx) => (
                <div
                  key={`${entry.item.id}-${idx}`}
                  className="paper-sheet flex items-start gap-3.5 rounded-3xl p-3.5"
                >
                  <TrayThumbnail imageUrl={entry.item.imageUrl} name={entry.item.nameFa} />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="truncate text-sm font-extrabold text-[#222E27]">
                        {entry.item.nameFa}
                      </h3>
                      <button
                        type="button"
                        onClick={() => onRemoveItem(idx)}
                        aria-label="حذف آیتم"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#647369] transition-colors hover:text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {entry.note && (
                      <p className="mt-1 text-xs font-semibold text-[#536F60]">{entry.note}</p>
                    )}

                    <div className="mt-3 flex items-center justify-between gap-2">
                      <div className="paper-sheet-kraft flex items-center rounded-full p-0.5">
                        <button
                          type="button"
                          onClick={() => onUpdateQty(idx, -1)}
                          aria-label="کاهش"
                          className="btn-paper-cream flex h-9 w-9 items-center justify-center rounded-full sm:h-8 sm:w-8"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-7 text-center tabular-nums text-xs font-extrabold text-[#222E27]">
                          {formatDigits(entry.quantity, lang)}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQty(idx, 1)}
                          aria-label="Increase"
                          className="btn-paper-cream flex h-9 w-9 items-center justify-center rounded-full sm:h-8 sm:w-8"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <span className="tabular-nums text-sm font-extrabold text-[#222E27]">
                        {formatPrice(entry.item.price * entry.quantity, lang)} {currencyLabel}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              <div className="pt-2">
                <label className="mb-1.5 block text-xs font-bold text-[#222E27]">
                  {ui.tray.noteLabel}
                </label>
                <input
                  type="text"
                  value={customerNote}
                  onChange={(e) => setCustomerNote(e.target.value)}
                  placeholder={ui.tray.notePlaceholder}
                  className="paper-recess min-h-[42px] w-full rounded-full px-4 py-2.5 text-xs font-medium text-[#222E27] placeholder:text-[#6B7A70] focus:outline-none"
                />
              </div>

              {onAddItem && allItems.length > 0 && (
                <TrayComplementarySuggestions
                  trayItems={items}
                  allItems={allItems}
                  categories={categories}
                  currencyLabel={currencyLabel}
                  lang={lang}
                  onAddItem={onAddItem}
                />
              )}
            </div>
          )}
        </div>

        {/* Footer Totals */}
        {!submittedOrder && items.length > 0 && (
          <div className="paper-sheet pb-safe px-4 pt-4 sm:px-6 sm:py-5">
            {submitError && (
              <div className="mb-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                {submitError}
              </div>
            )}

            <div className="mb-4 space-y-2 text-xs font-medium text-[#5C6B61]">
              <div className="flex justify-between">
                <span>{ui.tray.subtotal}</span>
                <span className="tabular-nums font-bold text-[#222E27]">
                  {formatPrice(subtotal, lang)} {currencyLabel}
                </span>
              </div>
              {serviceChargePercent > 0 && (
                <div className="flex justify-between">
                  <span>
                    {lang === 'en'
                      ? ui.tray.serviceFee(serviceChargePercent)
                      : `حق سرویس (${formatDigits(serviceChargePercent, 'fa')}٪)`}
                  </span>
                  <span className="tabular-nums font-bold text-[#222E27]">
                    {formatPrice(serviceFee, lang)} {currencyLabel}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t border-dashed border-[#536F60]/25 pt-2 text-sm font-extrabold text-[#222E27]">
                <span>{ui.tray.finalTotal}</span>
                <span className="tabular-nums">
                  {formatPrice(total, lang)} {currencyLabel}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmitOrder}
                className="btn-paper-primary min-h-[44px] flex-1 whitespace-nowrap rounded-full px-4 py-3 text-xs font-bold disabled:opacity-60 sm:px-5"
              >
                {submitting ? ui.tray.submitting : ui.tray.submitBtn}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSubmitError('');
                  onClearAll();
                }}
                className="btn-paper-slate min-h-[44px] whitespace-nowrap rounded-full px-4 py-3 text-xs font-bold sm:px-5"
              >
                {ui.tray.clearBtn}
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
};
