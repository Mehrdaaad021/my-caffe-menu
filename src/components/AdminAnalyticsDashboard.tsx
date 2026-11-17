import React, { useCallback, useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Award,
  Clock,
  Coffee,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  TrendingUp,
} from '@/src/components/ClayCafeIcons';
import { formatPriceFa, toPersianDigits } from '@/src/lib/formatters';

interface AnalyticsResponse {
  summary: {
    totalRevenue: number;
    completedRevenue: number;
    activeRevenue: number;
    totalOrders: number;
    validOrders: number;
    cancelledOrders: number;
    avgOrderValue: number;
    peakHourLabel: string;
    topItemName: string;
  };
  topItems: Array<{
    itemId: string;
    nameFa: string;
    shortName: string;
    quantity: number;
    revenue: number;
    categoryFa: string;
  }>;
  dailyRevenue: Array<{
    dateKey: string;
    label: string;
    revenue: number;
    ordersCount: number;
  }>;
  peakHours: Array<{
    hour: number;
    label: string;
    ordersCount: number;
    revenue: number;
    isPeak: boolean;
  }>;
  categoryBreakdown: Array<{
    categoryId: string;
    nameFa: string;
    quantity: number;
    revenue: number;
  }>;
}

interface AdminAnalyticsDashboardProps {
  currencyLabel: string;
  authHeaders: Record<string, string>;
  onUnauthorized: () => void;
}

const CHART_PALETTE = ['#4E6B5B', '#C27445', '#6E8898', '#8C7EC4', '#96522B', '#628270', '#7D9169'];

export const AdminAnalyticsDashboard: React.FC<AdminAnalyticsDashboardProps> = ({
  currencyLabel,
  authHeaders,
  onUnauthorized,
}) => {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/analytics', { headers: authHeaders });
      if (res.status === 401 || res.status === 403) {
        onUnauthorized();
        return;
      }
      const json = (await res.json()) as AnalyticsResponse & { error?: string };
      if (!res.ok) {
        setError(json.error || 'خطا در دریافت داده‌های تحلیلی.');
        return;
      }
      setData(json);
    } catch {
      setError('ارتباط با سرور برای دریافت آمار برقرار نشد.');
    } finally {
      setLoading(false);
    }
  }, [authHeaders, onUnauthorized]);

  useEffect(() => {
    void fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading && !data) {
    return (
      <div className="paper-sheet rounded-3xl p-12 text-center">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-[#D9C8AE] border-t-[#4E6B5B]" />
        <p className="text-sm font-bold text-[#2B1B12]">در حال تحلیل آمار فروش و ساعات شلوغی...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="paper-sheet rounded-3xl p-8 text-center">
        <p className="mb-4 text-sm font-bold text-rose-700">{error}</p>
        <button
          type="button"
          onClick={() => void fetchAnalytics()}
          className="btn-paper-primary rounded-xl px-5 py-2.5 text-xs font-bold"
        >
          تلاش مجدد
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { summary, topItems, dailyRevenue, peakHours, categoryBreakdown } = data;

  return (
    <div className="ui-smooth-enter space-y-6">
      {/* Header Toolbar */}
      <div className="paper-sheet flex flex-wrap items-center justify-between gap-4 rounded-3xl p-5 sm:p-6">
        <div className="flex items-start gap-3.5">
          <div className="paper-sheet-sage flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-[#2B1B12] sm:text-xl">
              داشبورد تحلیلی فروش، درآمد و ساعات اوج شلوغی کافه
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-[#6A574A]">
              نمایش زنده عملکرد منو، پرفروش‌ترین نوشیدنی‌ها و غذاها، روند درآمد روزانه و ساعات پرترافیک
              بر اساس سفارشات واقعی ثبت‌شده در سیستم.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void fetchAnalytics()}
          className="btn-paper-kraft inline-flex min-h-[40px] items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>به‌روزرسانی آمار</span>
        </button>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="paper-sheet-espresso rounded-3xl p-5 text-[#FCF9F2]">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-[#DCE6DD]">کل درآمد ثبت‌شده</span>
            <TrendingUp className="h-5 w-5" />
          </div>
          <p className="tabular-nums text-2xl font-extrabold">
            {formatPriceFa(summary.totalRevenue)}{' '}
            <span className="text-xs font-medium text-[#DCE6DD]">{currencyLabel}</span>
          </p>
          <p className="mt-1.5 text-[11px] text-[#E5A77B]">
            تسویه‌شده: {formatPriceFa(summary.completedRevenue)} {currencyLabel}
          </p>
        </div>

        <div className="paper-sheet-sage rounded-3xl p-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-[#354428]">تعداد سفارشات معتبر</span>
            <ShoppingBag className="h-5 w-5" />
          </div>
          <p className="tabular-nums text-2xl font-extrabold text-[#24301B]">
            {toPersianDigits(summary.validOrders)} سفارش
          </p>
          <p className="mt-1.5 text-[11px] text-[#445733]">
            میانگین هر فاکتور: {formatPriceFa(summary.avgOrderValue)} {currencyLabel}
          </p>
        </div>

        <div className="paper-sheet-kraft rounded-3xl p-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-[#96522B]">پرفروش‌ترین آیتم</span>
            <Award className="h-5 w-5" />
          </div>
          <p className="line-clamp-1 text-base font-extrabold text-[#2B1B12]">
            {summary.topItemName}
          </p>
          <p className="mt-2 text-[11px] text-[#6A574A]">
            {topItems[0]
              ? `${toPersianDigits(topItems[0].quantity)} عدد فروش رفته`
              : 'هنوز فروشی ثبت نشده'}
          </p>
        </div>

        <div className="paper-sheet rounded-3xl p-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-[#536F60]">ساعت اوج شلوغی</span>
            <Clock className="h-5 w-5" />
          </div>
          <p className="tabular-nums text-base font-extrabold text-[#2B1B12]">
            {summary.peakHourLabel}
          </p>
          <p className="mt-2 text-[11px] text-[#6A574A]">
            لغو شده: {toPersianDigits(summary.cancelledOrders)} از {toPersianDigits(summary.totalOrders)} سفارش
          </p>
        </div>
      </div>

      {/* Main Charts Row: Daily Revenue AreaChart + Peak Hours BarChart */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Daily Revenue Area Chart */}
        <div className="paper-sheet rounded-3xl p-5 sm:p-6 lg:col-span-7">
          <div className="mb-4 flex items-center justify-between gap-2 border-b border-dashed border-[#2B1B12]/12 pb-3">
            <div>
              <h3 className="text-base font-extrabold text-[#2B1B12]">
                روند درآمد روزانه (۷ روز اخیر)
              </h3>
              <p className="text-[11px] text-[#6A574A]">
                مجموع مبالغ سفارشات فعال و تکمیل‌شده به تفکیک روز ({currencyLabel})
              </p>
            </div>
            <span className="paper-sheet-sage rounded-xl px-2.5 py-1 text-[11px] font-bold text-[#24301B]">
              روند هفتگی
            </span>
          </div>

          <div dir="ltr" className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyRevenue} margin={{ top: 12, right: 16, left: 4, bottom: 8 }}>
                <defs>
                  <linearGradient id="cafeRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4E6B5B" stopOpacity={0.42} />
                    <stop offset="95%" stopColor="#4E6B5B" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="rgba(43,27,18,0.1)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#5A483C', fontSize: 11, fontWeight: 600 }}
                  axisLine={{ stroke: 'rgba(43,27,18,0.16)' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#6A574A', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={56}
                  tickFormatter={(v: number) =>
                    v >= 1_000_000
                      ? `${toPersianDigits((v / 1_000_000).toFixed(1))}M`
                      : v >= 1000
                        ? `${toPersianDigits(Math.round(v / 1000))}K`
                        : toPersianDigits(v)
                  }
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const row = payload[0].payload as AnalyticsResponse['dailyRevenue'][number];
                    return (
                      <div
                        dir="rtl"
                        className="paper-sheet rounded-2xl border border-[#536F60]/25 px-3.5 py-2.5 text-xs shadow-lg"
                      >
                        <div className="mb-1 font-extrabold text-[#2B1B12]">{label}</div>
                        <div className="font-bold text-[#4E6B5B] tabular-nums">
                          درآمد: {formatPriceFa(row.revenue)} {currencyLabel}
                        </div>
                        <div className="mt-0.5 text-[11px] text-[#6A574A] tabular-nums">
                          تعداد سفارش: {toPersianDigits(row.ordersCount)}
                        </div>
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#4E6B5B"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#cafeRevenueGrad)"
                  activeDot={{ r: 6, fill: '#C27445', stroke: '#FFFDF8', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Peak Hours Bar Chart */}
        <div className="paper-sheet rounded-3xl p-5 sm:p-6 lg:col-span-5">
          <div className="mb-4 flex items-center justify-between gap-2 border-b border-dashed border-[#2B1B12]/12 pb-3">
            <div>
              <h3 className="text-base font-extrabold text-[#2B1B12]">ساعات اوج شلوغی کافه</h3>
              <p className="text-[11px] text-[#6A574A]">
                تراکم سفارش‌ها از ساعت ۰۸ تا ۲۳ (ساعات اوج با رنگ تراکوتا)
              </p>
            </div>
            <span className="rounded-xl bg-[#F5E1CF] px-2.5 py-1 text-[11px] font-bold text-[#824421]">
              پرترافیک‌ترین بازه
            </span>
          </div>

          <div dir="ltr" className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={peakHours} margin={{ top: 12, right: 8, left: -12, bottom: 8 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="rgba(43,27,18,0.08)" vertical={false} />
                <XAxis
                  dataKey="hour"
                  tick={{ fill: '#5A483C', fontSize: 10 }}
                  axisLine={{ stroke: 'rgba(43,27,18,0.16)' }}
                  tickLine={false}
                  tickFormatter={(h: number) => toPersianDigits(h)}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: '#6A574A', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={32}
                  tickFormatter={(v: number) => toPersianDigits(v)}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const slot = payload[0].payload as AnalyticsResponse['peakHours'][number];
                    return (
                      <div
                        dir="rtl"
                        className="paper-sheet rounded-2xl border border-[#C27445]/30 px-3.5 py-2.5 text-xs shadow-lg"
                      >
                        <div className="mb-1 flex items-center gap-1.5 font-extrabold text-[#2B1B12]">
                          <span>ساعت {slot.label}</span>
                          {slot.isPeak && (
                            <span className="rounded-md bg-[#F5E1CF] px-1.5 py-0.5 text-[10px] text-[#824421]">
                              اوج شلوغی
                            </span>
                          )}
                        </div>
                        <div className="font-bold text-[#4E6B5B] tabular-nums">
                          {toPersianDigits(slot.ordersCount)} سفارش ثبت‌شده
                        </div>
                        <div className="mt-0.5 text-[11px] text-[#6A574A] tabular-nums">
                          فروش: {formatPriceFa(slot.revenue)} {currencyLabel}
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="ordersCount" radius={[6, 6, 0, 0]}>
                  {peakHours.map((entry) => (
                    <Cell
                      key={`hr-${entry.hour}`}
                      fill={entry.isPeak ? '#C27445' : '#628270'}
                      fillOpacity={entry.ordersCount === 0 ? 0.25 : 0.92}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Row: Top Selling Items BarChart + Category Revenue Share */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Top Selling Items */}
        <div className="paper-sheet rounded-3xl p-5 sm:p-6 lg:col-span-7">
          <div className="mb-4 flex items-center justify-between gap-2 border-b border-dashed border-[#2B1B12]/12 pb-3">
            <div className="flex items-center gap-2">
              <Coffee className="h-5 w-5" />
              <div>
                <h3 className="text-base font-extrabold text-[#2B1B12]">پرفروش‌ترین آیتم‌های منو</h3>
                <p className="text-[11px] text-[#6A574A]">
                  رتبه‌بندی آیتم‌ها بر اساس تعداد فروش در سفارشات مشتریان
                </p>
              </div>
            </div>
          </div>

          {topItems.length === 0 ? (
            <div className="py-12 text-center text-xs font-bold text-[#6A574A]">
              هنوز سفارشی برای نمایش نمودار پرفروش‌ترین‌ها ثبت نشده است.
            </div>
          ) : (
            <div dir="ltr" className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topItems}
                  layout="vertical"
                  margin={{ top: 8, right: 20, left: 10, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="4 4" stroke="rgba(43,27,18,0.08)" horizontal={false} />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fill: '#6A574A', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => toPersianDigits(v)}
                  />
                  <YAxis
                    type="category"
                    dataKey="shortName"
                    width={130}
                    tick={{ fill: '#2B1B12', fontSize: 11, fontWeight: 700 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const item = payload[0].payload as AnalyticsResponse['topItems'][number];
                      return (
                        <div
                          dir="rtl"
                          className="paper-sheet rounded-2xl border border-[#536F60]/25 px-3.5 py-2.5 text-xs shadow-lg"
                        >
                          <div className="font-extrabold text-[#2B1B12]">{item.nameFa}</div>
                          <div className="mt-0.5 text-[11px] text-[#96522B]">
                            دسته: {item.categoryFa}
                          </div>
                          <div className="mt-1 font-bold text-[#4E6B5B] tabular-nums">
                            تعداد فروش: {toPersianDigits(item.quantity)} عدد
                          </div>
                          <div className="text-[11px] text-[#6A574A] tabular-nums">
                            درآمد حاصل: {formatPriceFa(item.revenue)} {currencyLabel}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="quantity" radius={[0, 8, 8, 0]} barSize={22}>
                    {topItems.map((entry, idx) => (
                      <Cell
                        key={entry.itemId}
                        fill={CHART_PALETTE[idx % CHART_PALETTE.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Category Sales Breakdown */}
        <div className="paper-sheet-kraft rounded-3xl p-5 sm:p-6 lg:col-span-5">
          <div className="mb-4 flex items-center gap-2 border-b border-dashed border-[#2B1B12]/12 pb-3">
            <Sparkles className="h-5 w-5" />
            <div>
              <h3 className="text-base font-extrabold text-[#2B1B12]">سهم فروش هر دسته‌بندی</h3>
              <p className="text-[11px] text-[#6A574A]">میزان فروش و تعداد اقلام سفارش‌داده‌شده</p>
            </div>
          </div>

          {categoryBreakdown.length === 0 ? (
            <div className="py-12 text-center text-xs font-bold text-[#6A574A]">
              داده‌ای برای تفکیک دسته‌بندی‌ها موجود نیست.
            </div>
          ) : (
            <div className="space-y-3">
              {categoryBreakdown.map((cat, idx) => {
                const maxCatRev = categoryBreakdown[0]?.revenue || 1;
                const percent = Math.max(8, Math.round((cat.revenue / maxCatRev) * 100));
                const color = CHART_PALETTE[idx % CHART_PALETTE.length];

                return (
                  <div key={cat.categoryId} className="paper-sheet rounded-2xl p-3.5">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-xs font-extrabold text-[#2B1B12]">{cat.nameFa}</span>
                      <span className="tabular-nums text-xs font-bold text-[#4E6B5B]">
                        {formatPriceFa(cat.revenue)} {currencyLabel}
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#ECE9E1]">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${percent}%`, backgroundColor: color }}
                      />
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-[#6A574A]">
                      <span>{toPersianDigits(cat.quantity)} قلم فروش</span>
                      <span className="tabular-nums">
                        {toPersianDigits(
                          summary.totalRevenue > 0
                            ? Math.round((cat.revenue / summary.totalRevenue) * 100)
                            : 0,
                        )}
                        ٪ از فروش کل
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
