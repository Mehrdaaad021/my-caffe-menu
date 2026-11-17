import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Coffee,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Users,
  UtensilsCrossed,
} from '@/src/components/ClayCafeIcons';
import type {
  LiveTableMonitorEntry,
  LiveTableMonitorResponse,
  MenuDatabase,
  OrderStatus,
  TableStatus,
} from '@/src/types/menu';
import { formatPriceFa, toPersianDigits } from '@/src/lib/formatters';

interface LiveTableMonitorProps {
  currencyLabel: string;
  authHeaders: Record<string, string>;
  onMenuUpdated: (nextMenu: MenuDatabase) => void;
  onUnauthorized: () => void;
  onFeedback: (type: 'ok' | 'err', text: string) => void;
  onActiveCountChange?: (count: number) => void;
}

const ORDER_STATUS_BADGE: Record<OrderStatus, { label: string; cls: string }> = {
  pending: {
    label: 'در انتظار تایید',
    cls: 'border border-amber-300/70 bg-amber-50 text-amber-900',
  },
  preparing: {
    label: 'در حال آماده‌سازی',
    cls: 'border border-sky-300/70 bg-sky-50 text-sky-900',
  },
  ready: {
    label: 'آماده سرو',
    cls: 'border border-emerald-400/70 bg-emerald-50 text-emerald-900',
  },
  completed: {
    label: 'سرو شده',
    cls: 'paper-sheet-kraft text-[#5A483C]',
  },
  cancelled: {
    label: 'لغو شده',
    cls: 'border border-rose-200 bg-rose-50 text-rose-700',
  },
};

const TABLE_STATUS_LABEL: Record<TableStatus, string> = {
  available: 'آزاد',
  occupied: 'مشتری نشسته',
  reserved: 'رزرو شده',
};

function formatRelativeTimeFa(iso?: string): string {
  if (!iso) return 'بدون فعالیت اخیر';
  const diffMs = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return 'هم‌اکنون';
  const sec = Math.floor(diffMs / 1000);
  if (sec < 45) return 'چند ثانیه پیش';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${toPersianDigits(min)} دقیقه پیش`;
  const hr = Math.floor(min / 60);
  return `${toPersianDigits(hr)} ساعت پیش`;
}

export const LiveTableMonitor: React.FC<LiveTableMonitorProps> = ({
  currencyLabel,
  authHeaders,
  onMenuUpdated,
  onUnauthorized,
  onFeedback,
  onActiveCountChange,
}) => {
  const [data, setData] = useState<LiveTableMonitorResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoPoll, setAutoPoll] = useState(true);
  const [filterMode, setFilterMode] = useState<'active' | 'all'>('active');
  const [clearingKey, setClearingKey] = useState<string | null>(null);

  const fetchMonitor = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const res = await fetch('/api/admin/live-tables', { headers: authHeaders });
        if (res.status === 401) {
          onUnauthorized();
          return;
        }
        if (!res.ok) {
          if (!silent) onFeedback('err', 'دریافت وضعیت زنده میزها ناموفق بود.');
          return;
        }
        const json = (await res.json()) as LiveTableMonitorResponse;
        setData(json);
        onActiveCountChange?.(json.stats.activeTablesCount);
      } catch {
        if (!silent) onFeedback('err', 'خطا در ارتباط با سرور برای مانیتور زنده میزها.');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [authHeaders, onUnauthorized, onFeedback, onActiveCountChange],
  );

  useEffect(() => {
    void fetchMonitor(false);
  }, [fetchMonitor]);

  useEffect(() => {
    if (!autoPoll) return;
    const id = window.setInterval(() => {
      void fetchMonitor(true);
    }, 6000);
    return () => window.clearInterval(id);
  }, [autoPoll, fetchMonitor]);

  const handleClearTable = async (entry: LiveTableMonitorEntry) => {
    const targetParam = entry.tableNumber === null ? 'takeaway' : String(entry.tableNumber);
    const key = entry.tableNumber === null ? 'takeaway' : `table-${entry.tableNumber}`;
    setClearingKey(key);
    try {
      const res = await fetch(`/api/admin/tables/${encodeURIComponent(targetParam)}/clear`, {
        method: 'POST',
        headers: authHeaders,
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      const json = (await res.json()) as {
        menu?: MenuDatabase;
        monitor?: LiveTableMonitorResponse;
        error?: string;
      };
      if (!res.ok || !json.monitor) {
        onFeedback('err', json.error || 'پاک‌سازی میز ناموفق بود.');
        return;
      }
      if (json.menu) {
        onMenuUpdated(json.menu);
      }
      setData(json.monitor);
      onActiveCountChange?.(json.monitor.stats.activeTablesCount);
      onFeedback(
        'ok',
        entry.tableNumber === null
          ? 'سینی و سفارشات فعال بیرون‌بر تسویه و پاک‌سازی شدند.'
          : `${entry.label} سرو و با موفقیت آزاد شد.`,
      );
    } catch {
      onFeedback('err', 'ارتباط با سرور هنگام پاک‌سازی میز برقرار نشد.');
    } finally {
      setClearingKey(null);
    }
  };

  const visibleTables = useMemo(() => {
    if (!data) return [];
    if (filterMode === 'all') return data.tables;
    return data.tables.filter((t) => t.hasActiveTray || t.tableStatus === 'occupied');
  }, [data, filterMode]);

  const takeawayEntry = useMemo(() => {
    if (!data?.takeaway) return null;
    if (filterMode === 'active' && !data.takeaway.hasActiveTray) return null;
    return data.takeaway;
  }, [data, filterMode]);

  const renderMonitorCard = (entry: LiveTableMonitorEntry) => {
    const isTakeaway = entry.tableNumber === null;
    const cardKey = isTakeaway ? 'takeaway' : `table-${entry.tableNumber}`;
    const isClearing = clearingKey === cardKey;
    const isActive = entry.hasActiveTray || entry.tableStatus === 'occupied';
    const hasReadyOrder = entry.activeOrders.some((o) => o.status === 'ready');

    return (
      <article
        key={cardKey}
        className={`flex flex-col justify-between gap-4 rounded-3xl p-4 sm:p-5 transition-all ${
          hasReadyOrder
            ? 'paper-sheet ring-2 ring-[#536F60]/45'
            : entry.hasActiveTray
              ? 'paper-sheet'
              : entry.tableStatus === 'occupied'
                ? 'paper-sheet-sage'
                : 'paper-sheet-kraft opacity-85'
        }`}
      >
        <div className="space-y-3.5">
          {/* Card Header */}
          <div className="flex flex-wrap items-start justify-between gap-2 border-b border-dashed border-[#2B1B12]/15 pb-3">
            <div className="flex min-w-0 items-center gap-3">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-extrabold tabular-nums ${
                  entry.hasActiveTray
                    ? 'bg-[#536F60] text-white shadow-[0_3px_0_#374E42]'
                    : 'paper-sheet text-[#2B1B12]'
                }`}
              >
                {isTakeaway ? (
                  <ShoppingBag className="h-5 w-5" />
                ) : (
                  toPersianDigits(entry.tableNumber ?? 0)
                )}
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-base font-extrabold text-[#2B1B12]">{entry.label}</h3>
                <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-[#6A574A]">
                  {!isTakeaway && (
                    <>
                      <span>{TABLE_STATUS_LABEL[entry.tableStatus]}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">
                        ظرفیت {toPersianDigits(entry.capacity)} نفر
                      </span>
                    </>
                  )}
                  {entry.lastActivityAt && (
                    <>
                      {!isTakeaway && <span aria-hidden="true">·</span>}
                      <span>{formatRelativeTimeFa(entry.lastActivityAt)}</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            {entry.estimatedTotal > 0 && (
              <div className="paper-sheet-kraft shrink-0 rounded-xl px-3 py-1.5 text-left tabular-nums">
                <p className="text-[10px] font-semibold text-[#6A574A]">جمع سینی و سفارش</p>
                <p className="text-xs font-extrabold text-[#2B1B12]">
                  {formatPriceFa(entry.estimatedTotal)} {currencyLabel}
                </p>
              </div>
            )}
          </div>

          {/* Live Browsing Trays (Pre-checkout customer cart) */}
          {entry.liveTrays.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 text-xs font-extrabold text-[#536F60]">
                <span className="inline-flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4" />
                  <span>سینی زنده در حال انتخاب</span>
                </span>
                <span className="tabular-nums text-[11px] text-[#6A574A]">
                  {toPersianDigits(entry.liveItemsCount)} قلم
                </span>
              </div>

              {entry.liveTrays.map((tray) => (
                <div
                  key={tray.sessionId}
                  className="paper-recess space-y-2 rounded-2xl p-3 text-xs text-[#2B1B12]"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-dashed border-[#2B1B12]/10 pb-1.5 text-[11px] font-bold text-[#6A574A]">
                    <span>مشتری آنلاین در حال انتخاب</span>
                    <span className="tabular-nums">{formatRelativeTimeFa(tray.updatedAt)}</span>
                  </div>
                  <ul className="space-y-1.5">
                    {tray.items.map((item, idx) => (
                      <li
                        key={`${item.itemId}-${idx}`}
                        className="flex items-start justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <span className="font-bold text-[#2B1B12]">
                            {toPersianDigits(item.quantity)} × {item.nameFa}
                          </span>
                          {item.note && (
                            <p className="mt-0.5 text-[11px] text-[#96522B]">{item.note}</p>
                          )}
                        </div>
                        <span className="shrink-0 tabular-nums font-semibold text-[#5A483C]">
                          {formatPriceFa(item.unitPrice * item.quantity)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {tray.customerNote && (
                    <p className="rounded-xl bg-white/70 px-2.5 py-1.5 text-[11px] font-medium text-[#96522B]">
                      یادداشت: {tray.customerNote}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Active Submitted Orders (Pending / Preparing / Ready) */}
          {entry.activeOrders.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 text-xs font-extrabold text-[#2B1B12]">
                <span className="inline-flex items-center gap-1.5">
                  <UtensilsCrossed className="h-4 w-4 text-[#C27445]" />
                  <span>سفارشات ثبت‌شده فعال</span>
                </span>
                <span className="tabular-nums text-[11px] text-[#6A574A]">
                  {toPersianDigits(entry.activeOrdersCount)} فیش
                </span>
              </div>

              {entry.activeOrders.map((order) => {
                const badge = ORDER_STATUS_BADGE[order.status];
                return (
                  <div
                    key={order.id}
                    className="paper-sheet-kraft space-y-2 rounded-2xl p-3 text-xs text-[#2B1B12]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="tabular-nums font-extrabold">
                        فیش #{order.orderNumber}
                      </span>
                      <span className={`rounded-lg px-2 py-0.5 text-[11px] font-bold ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </div>
                    <ul className="space-y-1">
                      {order.items.map((item, idx) => (
                        <li
                          key={`${order.id}-${item.itemId}-${idx}`}
                          className="flex items-start justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <span className="font-semibold">
                              {toPersianDigits(item.quantity)} × {item.nameFa}
                            </span>
                            {item.note && (
                              <span className="ms-1.5 text-[11px] text-[#96522B]">({item.note})</span>
                            )}
                          </div>
                          <span className="shrink-0 tabular-nums text-[11px] font-bold">
                            {formatPriceFa(item.unitPrice * item.quantity)}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {order.customerNote && (
                      <p className="rounded-xl bg-white/65 px-2.5 py-1 text-[11px] text-[#96522B]">
                        توضیح سفارش: {order.customerNote}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {!entry.hasActiveTray && (
            <div className="paper-recess rounded-2xl px-3.5 py-4 text-center text-xs font-semibold text-[#6A574A]">
              {entry.tableStatus === 'occupied'
                ? 'میز در وضعیت اشغال قرار دارد اما سینی سفارش فعالی ثبت نشده است.'
                : 'سینی یا سفارش فعالی روی این میز وجود ندارد.'}
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="pt-1">
          <button
            type="button"
            disabled={!isActive || isClearing}
            onClick={() => void handleClearTable(entry)}
            className={`inline-flex min-h-[44px] w-full items-center justify-center gap-2 whitespace-nowrap rounded-2xl px-4 py-2.5 text-xs font-extrabold transition-all disabled:cursor-not-allowed disabled:opacity-45 ${
              hasReadyOrder
                ? 'btn-paper-primary'
                : isActive
                  ? 'btn-paper-terracotta'
                  : 'btn-paper-cream text-[#6A574A]'
            }`}
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>
              {isClearing
                ? 'در حال پاک‌سازی...'
                : isTakeaway
                  ? 'سرو شد · پاک‌سازی بیرون‌بر'
                  : 'سرو شد · پاک‌سازی و آزادسازی میز'}
            </span>
          </button>
        </div>
      </article>
    );
  };

  return (
    <div className="ui-smooth-enter space-y-6">
      {/* Top Bar */}
      <div className="paper-sheet flex flex-col gap-4 rounded-3xl p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-3">
          <div className="paper-sheet-sage flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl">
            <Coffee className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-[#96522B]">پایش لحظه‌ای سینی میزها و سرو سفارش</p>
            <h2 className="text-lg font-extrabold text-[#2B1B12] sm:text-xl">
              مانیتور زنده میزها و سینی‌های فعال
            </h2>
            <p className="mt-0.5 text-xs leading-relaxed text-[#6A574A]">
              سینی‌های در حال انتخاب مشتریان و سفارشات ثبت‌شده هر میز را هم‌زمان ببینید و پس از سرو
              میز را آزاد کنید.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setAutoPoll((prev) => !prev)}
            className={`inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-bold ${
              autoPoll ? 'btn-paper-sage' : 'btn-paper-cream text-[#6A574A]'
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>{autoPoll ? 'بروزرسانی خودکار: روشن' : 'بروزرسانی خودکار: خاموش'}</span>
          </button>

          <button
            type="button"
            onClick={() => void fetchMonitor(false)}
            disabled={loading}
            className="btn-paper-primary inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>بروزرسانی</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Strip */}
      {data && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <div className="paper-sheet rounded-2xl p-4">
            <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-[#6A574A]">
              <span>میزهای دارای سینی فعال</span>
              <Users className="h-4 w-4 text-[#536F60]" />
            </div>
            <p className="tabular-nums text-2xl font-extrabold text-[#2B1B12]">
              {toPersianDigits(data.stats.activeTablesCount)}
              <span className="ms-1 text-xs font-semibold text-[#6A574A]">
                / {toPersianDigits(data.stats.totalTables)} میز
              </span>
            </p>
          </div>

          <div className="paper-sheet-kraft rounded-2xl p-4">
            <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-[#5A483C]">
              <span>مشتری در حال انتخاب</span>
              <Sparkles className="h-4 w-4 text-[#536F60]" />
            </div>
            <p className="tabular-nums text-2xl font-extrabold text-[#2B1B12]">
              {toPersianDigits(data.stats.liveBrowsingCount)}
              <span className="ms-1 text-xs font-semibold text-[#6A574A]">سینی زنده</span>
            </p>
          </div>

          <div className="paper-sheet rounded-2xl p-4">
            <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-[#6A574A]">
              <span>سفارش در صف و آماده‌سازی</span>
              <Clock className="h-4 w-4 text-[#C27445]" />
            </div>
            <p className="tabular-nums text-2xl font-extrabold text-[#C27445]">
              {toPersianDigits(data.stats.pendingOrdersCount)}
            </p>
          </div>

          <div className="paper-sheet-sage rounded-2xl p-4">
            <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-[#24301B]">
              <span>سفارش آماده سرو</span>
              <CheckCircle2 className="h-4 w-4 text-[#445733]" />
            </div>
            <p className="tabular-nums text-2xl font-extrabold text-[#24301B]">
              {toPersianDigits(data.stats.readyOrdersCount)}
            </p>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="paper-sheet-kraft flex w-full items-center gap-1.5 rounded-2xl p-1.5 sm:w-auto">
          <button
            type="button"
            onClick={() => setFilterMode('active')}
            className={`min-h-[42px] flex-1 whitespace-nowrap rounded-xl px-4 py-2 text-xs font-bold sm:flex-initial ${
              filterMode === 'active' ? 'btn-paper-primary' : 'btn-paper-cream'
            }`}
          >
            میزهای دارای سینی فعال ({toPersianDigits(data?.stats.activeTablesCount ?? 0)})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`min-h-[42px] flex-1 whitespace-nowrap rounded-xl px-4 py-2 text-xs font-bold sm:flex-initial ${
              filterMode === 'all' ? 'btn-paper-primary' : 'btn-paper-cream'
            }`}
          >
            همه میزها ({toPersianDigits(data?.tables.length ?? 0)})
          </button>
        </div>

        {data?.updatedAt && (
          <p className="text-[11px] font-semibold text-[#6A574A]">
            آخرین همگام‌سازی: {formatRelativeTimeFa(data.updatedAt)}
          </p>
        )}
      </div>

      {/* Monitor Grid */}
      {loading && !data ? (
        <div className="paper-sheet rounded-3xl p-10 text-center text-sm font-bold text-[#6A574A]">
          در حال دریافت وضعیت زنده میزها...
        </div>
      ) : visibleTables.length === 0 && !takeawayEntry ? (
        <div className="paper-sheet rounded-3xl p-8 text-center sm:p-12">
          <p className="font-display-serif text-base italic text-[#96522B]">All Tables Clear</p>
          <p className="mt-1 text-base font-extrabold text-[#2B1B12]">
            در حال حاضر هیچ میز یا سینی فعالی وجود ندارد
          </p>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-[#6A574A]">
            به محض اینکه مشتری اسکن QR انجام دهد و آیتمی را به سینی خود اضافه یا سفارش را ثبت کند،
            کارت آن میز به‌صورت خودکار اینجا نمایش داده می‌شود.
          </p>
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className="btn-paper-kraft mt-5 inline-flex min-h-[44px] items-center rounded-xl px-5 py-2.5 text-xs font-bold"
          >
            مشاهده همه میزهای سالن
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {takeawayEntry && renderMonitorCard(takeawayEntry)}
          {visibleTables.map((entry) => renderMonitorCard(entry))}
        </div>
      )}
    </div>
  );
};
