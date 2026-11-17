import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Coffee,
  RefreshCw,
  ShoppingBag,
  Volume2,
  VolumeX,
  XCircle,
} from '@/src/components/ClayCafeIcons';
import type { CustomerOrder, OrderStatus } from '@/src/types/menu';
import { formatPriceFa, toPersianDigits } from '@/src/lib/formatters';

interface OrdersDashboardProps {
  currencyLabel: string;
  authHeaders: Record<string, string>;
  onUnauthorized: () => void;
  onFeedback: (type: 'ok' | 'err', text: string) => void;
  voiceEnabled?: boolean;
  onToggleVoice?: () => void;
  onTestVoice?: () => void;
}

const ORDER_STATUS_META: Record<
  OrderStatus,
  { label: string; group: 'active' | 'completed' | 'cancelled'; badgeCls: string }
> = {
  pending: {
    label: 'سفارش جدید (فعال)',
    group: 'active',
    badgeCls: 'bg-[#F5E1CF] text-[#824421] border border-[#C27445]/40',
  },
  preparing: {
    label: 'در حال آماده‌سازی',
    group: 'active',
    badgeCls: 'bg-[#2B1B12] text-[#FCF9F2] border border-[#1E120B]',
  },
  ready: {
    label: 'آماده سرو روی میز',
    group: 'active',
    badgeCls: 'paper-sheet-kraft text-[#2B1B12]',
  },
  completed: {
    label: 'تکمیل شده',
    group: 'completed',
    badgeCls: 'paper-sheet-sage text-[#24301B]',
  },
  cancelled: {
    label: 'لغو شده',
    group: 'cancelled',
    badgeCls: 'border border-rose-200 bg-rose-50 text-rose-700',
  },
};

export const OrdersDashboard: React.FC<OrdersDashboardProps> = ({
  currencyLabel,
  authHeaders,
  onUnauthorized,
  onFeedback,
  voiceEnabled = true,
  onToggleVoice,
  onTestVoice,
}) => {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filterGroup, setFilterGroup] = useState<'all' | 'active' | 'completed' | 'cancelled'>(
    'all',
  );

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/orders', { headers: authHeaders });
      if (res.status === 401 || res.status === 403) {
        onUnauthorized();
        return;
      }
      const data = (await res.json()) as { orders?: CustomerOrder[] };
      if (res.ok && data.orders) {
        setOrders(data.orders);
      }
    } catch {
      onFeedback('err', 'خطا در دریافت لیست سفارشات.');
    } finally {
      setLoading(false);
    }
  }, [authHeaders, onUnauthorized, onFeedback]);

  useEffect(() => {
    fetchOrders();
    const timer = setInterval(fetchOrders, 12000);
    return () => clearInterval(timer);
  }, [fetchOrders]);

  const handleStatusChange = async (orderId: string, status: OrderStatus) => {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ status }),
      });
      if (res.status === 401 || res.status === 403) {
        onUnauthorized();
        return;
      }
      const data = (await res.json()) as { orders?: CustomerOrder[]; error?: string };
      if (!res.ok || !data.orders) {
        onFeedback('err', data.error || 'تغییر وضعیت سفارش ناموفق بود.');
        return;
      }
      setOrders(data.orders);
      onFeedback('ok', 'وضعیت سفارش به‌روزرسانی شد.');
    } catch {
      onFeedback('err', 'ارتباط با سرور برقرار نشد.');
    } finally {
      setUpdatingId(null);
    }
  };

  const stats = useMemo(() => {
    const active = orders.filter((o) => ORDER_STATUS_META[o.status].group === 'active').length;
    const completedList = orders.filter((o) => o.status === 'completed');
    const cancelled = orders.filter((o) => o.status === 'cancelled').length;
    const revenue = completedList.reduce((sum, o) => sum + o.total, 0);
    return {
      total: orders.length,
      active,
      completed: completedList.length,
      cancelled,
      revenue,
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    if (filterGroup === 'all') return orders;
    return orders.filter((o) => ORDER_STATUS_META[o.status].group === filterGroup);
  }, [orders, filterGroup]);

  const formatTimeAgo = (iso: string) => {
    const diffMin = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
    if (diffMin < 1) return 'لحظاتی پیش';
    if (diffMin < 60) return `${toPersianDigits(diffMin)} دقیقه پیش`;
    const hours = Math.floor(diffMin / 60);
    return `${toPersianDigits(hours)} ساعت پیش`;
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="paper-sheet-espresso rounded-2xl p-4 text-[#FCF9F2]">
          <p className="mb-1 text-xs font-semibold text-[#E9DEC9]">سفارشات فعال</p>
          <p className="tabular-nums text-2xl font-extrabold">
            {toPersianDigits(stats.active)}
          </p>
          <p className="mt-1 text-[11px] text-[#E5A77B]">در انتظار یا در حال آماده‌سازی</p>
        </div>

        <div className="paper-sheet-sage rounded-2xl p-4">
          <p className="mb-1 text-xs font-semibold text-[#354428]">تکمیل شده</p>
          <p className="tabular-nums text-2xl font-extrabold text-[#24301B]">
            {toPersianDigits(stats.completed)}
          </p>
          <p className="mt-1 text-[11px] text-[#445733]">سرو و تسویه شده</p>
        </div>

        <div className="paper-sheet-kraft rounded-2xl p-4">
          <p className="mb-1 text-xs font-semibold text-[#96522B]">لغو شده</p>
          <p className="tabular-nums text-2xl font-extrabold text-[#2B1B12]">
            {toPersianDigits(stats.cancelled)}
          </p>
          <p className="mt-1 text-[11px] text-[#6A574A]">سفارشات کنسل‌شده</p>
        </div>

        <div className="paper-sheet rounded-2xl p-4">
          <p className="mb-1 text-xs font-semibold text-[#6A574A]">فروش تکمیل‌شده</p>
          <p className="tabular-nums text-xl font-extrabold text-[#2B1B12]">
            {formatPriceFa(stats.revenue)} <span className="text-xs font-semibold">{currencyLabel}</span>
          </p>
          <p className="mt-1 text-[11px] text-[#96522B]">
            از مجموع {toPersianDigits(stats.total)} سفارش
          </p>
        </div>
      </div>

      {/* Filter & Refresh Toolbar */}
      <div className="paper-sheet flex flex-wrap items-center justify-between gap-3 rounded-2xl p-3.5">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { key: 'all', label: `همه (${toPersianDigits(stats.total)})` },
              { key: 'active', label: `فعال (${toPersianDigits(stats.active)})` },
              { key: 'completed', label: `تکمیل شده (${toPersianDigits(stats.completed)})` },
              { key: 'cancelled', label: `لغو شده (${toPersianDigits(stats.cancelled)})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilterGroup(tab.key)}
              className={`rounded-xl px-4 py-2 text-xs font-bold ${
                filterGroup === tab.key ? 'btn-paper-primary' : 'btn-paper-cream'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onToggleVoice && (
            <button
              type="button"
              onClick={onToggleVoice}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold ${
                voiceEnabled ? 'btn-paper-sage' : 'btn-paper-cream text-[#6A574A]'
              }`}
            >
              {voiceEnabled ? (
                <Volume2 className="h-3.5 w-3.5" />
              ) : (
                <VolumeX className="h-3.5 w-3.5" />
              )}
              <span>{voiceEnabled ? 'اعلان صوتی روشن' : 'اعلان صوتی خاموش'}</span>
            </button>
          )}

          {onTestVoice && (
            <button
              type="button"
              onClick={onTestVoice}
              className="btn-paper-cream inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold"
            >
              <span>تست صدا</span>
            </button>
          )}

          <button
            type="button"
            onClick={fetchOrders}
            className="btn-paper-kraft inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>به‌روزرسانی</span>
          </button>
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="paper-sheet rounded-2xl p-12 text-center">
          <ShoppingBag className="mx-auto mb-3 h-8 w-8 text-[#96522B]" />
          <p className="text-sm font-bold text-[#2B1B12]">هنوز سفارشی در این بخش ثبت نشده است.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filteredOrders.map((order) => {
            const meta = ORDER_STATUS_META[order.status];
            const isBusy = updatingId === order.id;

            return (
              <div
                key={order.id}
                className="paper-sheet paper-sheet-hover flex flex-col justify-between rounded-3xl p-5"
              >
                <div>
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-2 border-b border-dashed border-[#2B1B12]/15 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-extrabold text-[#2B1B12]">
                          #{order.orderNumber}
                        </span>
                        <span className="paper-sheet-kraft rounded-lg px-2.5 py-0.5 text-xs font-bold text-[#2B1B12]">
                          {order.tableNumber
                            ? `میز شماره ${toPersianDigits(order.tableNumber)}`
                            : 'بیرون‌بر'}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-[11px] text-[#6A574A]">
                        <Clock className="h-3 w-3" />
                        <span>{formatTimeAgo(order.createdAt)}</span>
                      </div>
                    </div>

                    <span className={`rounded-xl px-3 py-1 text-xs font-bold ${meta.badgeCls}`}>
                      {meta.label}
                    </span>
                  </div>

                  {/* Order Items */}
                  <div className="mb-4 space-y-2">
                    {order.items.map((item, idx) => (
                      <div
                        key={`${order.id}-${idx}`}
                        className="paper-recess flex items-start justify-between gap-3 rounded-xl px-3.5 py-2.5 text-xs"
                      >
                        <div>
                          <p className="font-bold text-[#2B1B12]">
                            {toPersianDigits(item.quantity)} × {item.nameFa}
                          </p>
                          {item.note && (
                            <p className="mt-0.5 text-[11px] text-[#96522B]">{item.note}</p>
                          )}
                        </div>
                        <span className="tabular-nums font-bold text-[#2B1B12]">
                          {formatPriceFa(item.unitPrice * item.quantity)} {currencyLabel}
                        </span>
                      </div>
                    ))}
                  </div>

                  {order.customerNote && (
                    <div className="paper-sheet-kraft mb-4 rounded-xl px-3 py-2 text-xs font-medium text-[#2B1B12]">
                      یادداشت مشتری: {order.customerNote}
                    </div>
                  )}
                </div>

                {/* Footer Total + Status Actions */}
                <div className="space-y-3 border-t border-dashed border-[#2B1B12]/15 pt-3">
                  <div className="flex items-center justify-between text-sm font-extrabold text-[#2B1B12]">
                    <span>مبلغ نهایی (با حق سرویس)</span>
                    <span className="tabular-nums">
                      {formatPriceFa(order.total)} {currencyLabel}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {order.status === 'pending' && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleStatusChange(order.id, 'preparing')}
                        className="btn-paper-primary inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold disabled:opacity-50"
                      >
                        <Coffee className="h-3.5 w-3.5 text-[#E5A77B]" />
                        <span>شروع آماده‌سازی</span>
                      </button>
                    )}

                    {(order.status === 'pending' || order.status === 'preparing') && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleStatusChange(order.id, 'ready')}
                        className="btn-paper-kraft inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold disabled:opacity-50"
                      >
                        <span>آماده سرو</span>
                      </button>
                    )}

                    {order.status !== 'completed' && order.status !== 'cancelled' && (
                      <>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleStatusChange(order.id, 'completed')}
                          className="btn-paper-terracotta inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold disabled:opacity-50"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>تکمیل سفارش</span>
                        </button>

                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleStatusChange(order.id, 'cancelled')}
                          className="btn-paper-cream inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-rose-700 disabled:opacity-50"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          <span>لغو</span>
                        </button>
                      </>
                    )}

                    {(order.status === 'completed' || order.status === 'cancelled') && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleStatusChange(order.id, 'preparing')}
                        className="btn-paper-cream rounded-xl px-3 py-1.5 text-xs font-bold"
                      >
                        بازگرداندن به سفارش فعال
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
