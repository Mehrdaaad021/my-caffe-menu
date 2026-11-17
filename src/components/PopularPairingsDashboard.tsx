import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowUpLeft,
  Flame,
  Plus,
  RefreshCw,
  Sparkles,
  TrendingUp,
  UtensilsCrossed,
} from '@/src/components/ClayCafeIcons';
import type { CustomerOrder, MenuCategory, MenuItem } from '@/src/types/menu';
import { resolveMenuImage } from '@/src/lib/imageAssets';
import { useTransparent3DCutout } from '@/src/lib/cutout3d';
import { formatPriceFa, toPersianDigits } from '@/src/lib/formatters';

export interface SuggestedMenuItemTemplate {
  categoryId: string;
  nameFa: string;
  nameEn: string;
  descriptionFa: string;
  price: string;
  prepTimeMinutes: string;
  ingredientsText: string;
  imageUrl: string;
  isSignature: boolean;
}

interface PopularPairingsDashboardProps {
  token: string;
  items: MenuItem[];
  categories: MenuCategory[];
  currencyLabel: string;
  onUnauthorized: () => void;
  onCreateSuggestedItem: (template: SuggestedMenuItemTemplate) => void;
}

interface CoOrderedPair {
  key: string;
  itemAId: string;
  itemBId: string;
  nameA: string;
  nameB: string;
  itemA?: MenuItem;
  itemB?: MenuItem;
  orderCount: number;
  combinedUnits: number;
  combinedRevenue: number;
  lastOrderedAt: string;
}

const PairMiniCutout: React.FC<{ imageUrl?: string; alt: string }> = ({ imageUrl, alt }) => {
  const { cutoutSrc } = useTransparent3DCutout(resolveMenuImage(imageUrl ?? 'preset:saffron_latte'));
  return (
    <div className="paper-recess flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl p-1">
      {imageUrl ? (
        <img
          src={cutoutSrc}
          alt={alt}
          referrerPolicy="no-referrer"
          className="h-12 w-12 object-contain drop-shadow-[0_6px_6px_rgba(43,27,18,0.22)]"
        />
      ) : (
        <UtensilsCrossed className="h-5 w-5 text-[#C27445]" />
      )}
    </div>
  );
};

export const PopularPairingsDashboard: React.FC<PopularPairingsDashboardProps> = ({
  token,
  items,
  categories,
  currencyLabel,
  onUnauthorized,
  onCreateSuggestedItem,
}) => {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/orders', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      const data = (await res.json()) as { orders?: CustomerOrder[]; error?: string };
      if (!res.ok) {
        setError(data.error || 'خطا در تحلیل سفارشات گذشته.');
        return;
      }
      setOrders(data.orders ?? []);
    } catch {
      setError('ارتباط با سرور برقرار نشد.');
    } finally {
      setLoading(false);
    }
  }, [token, onUnauthorized]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const itemMap = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const analytics = useMemo(() => {
    const validOrders = orders.filter((o) => o.status !== 'cancelled');
    const pairMap = new Map<string, CoOrderedPair>();
    const itemFrequency = new Map<string, { nameFa: string; count: number; revenue: number }>();

    for (const order of validOrders) {
      for (const entry of order.items) {
        const prev = itemFrequency.get(entry.itemId) ?? {
          nameFa: entry.nameFa,
          count: 0,
          revenue: 0,
        };
        itemFrequency.set(entry.itemId, {
          nameFa: entry.nameFa,
          count: prev.count + entry.quantity,
          revenue: prev.revenue + entry.unitPrice * entry.quantity,
        });
      }

      if (order.items.length < 2) continue;

      const uniqueEntries = new Map<string, { itemId: string; nameFa: string; qty: number; rev: number }>();
      for (const entry of order.items) {
        const existing = uniqueEntries.get(entry.itemId);
        if (existing) {
          existing.qty += entry.quantity;
          existing.rev += entry.unitPrice * entry.quantity;
        } else {
          uniqueEntries.set(entry.itemId, {
            itemId: entry.itemId,
            nameFa: entry.nameFa,
            qty: entry.quantity,
            rev: entry.unitPrice * entry.quantity,
          });
        }
      }

      const list = Array.from(uniqueEntries.values());
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const first = list[i].itemId <= list[j].itemId ? list[i] : list[j];
          const second = list[i].itemId <= list[j].itemId ? list[j] : list[i];
          const key = `${first.itemId}__${second.itemId}`;
          const prev = pairMap.get(key);
          const itemA = itemMap.get(first.itemId);
          const itemB = itemMap.get(second.itemId);

          if (prev) {
            prev.orderCount += 1;
            prev.combinedUnits += first.qty + second.qty;
            prev.combinedRevenue += first.rev + second.rev;
            if (new Date(order.createdAt) > new Date(prev.lastOrderedAt)) {
              prev.lastOrderedAt = order.createdAt;
            }
          } else {
            pairMap.set(key, {
              key,
              itemAId: first.itemId,
              itemBId: second.itemId,
              nameA: itemA?.nameFa ?? first.nameFa,
              nameB: itemB?.nameFa ?? second.nameFa,
              itemA,
              itemB,
              orderCount: 1,
              combinedUnits: first.qty + second.qty,
              combinedRevenue: first.rev + second.rev,
              lastOrderedAt: order.createdAt,
            });
          }
        }
      }
    }

    const popularPairs = Array.from(pairMap.values()).sort(
      (a, b) => b.orderCount - a.orderCount || b.combinedRevenue - a.combinedRevenue,
    );

    const topSingleItems = Array.from(itemFrequency.entries())
      .map(([itemId, stats]) => ({
        itemId,
        item: itemMap.get(itemId),
        ...stats,
      }))
      .sort((a, b) => b.count - a.count || b.revenue - a.revenue);

    // Generate smart related menu item ideas from category demand & top orders
    const categoryDemand = new Map<string, number>();
    for (const entry of topSingleItems) {
      if (entry.item) {
        categoryDemand.set(
          entry.item.categoryId,
          (categoryDemand.get(entry.item.categoryId) ?? 0) + entry.count,
        );
      }
    }

    const expansionIdeas: Array<{
      id: string;
      headlineFa: string;
      insightFa: string;
      template: SuggestedMenuItemTemplate;
    }> = [];

    for (const pair of popularPairs.slice(0, 3)) {
      const catA = pair.itemA ? categoryMap.get(pair.itemA.categoryId)?.nameFa : 'منو';
      const catB = pair.itemB ? categoryMap.get(pair.itemB.categoryId)?.nameFa : 'منو';
      const baseSum = (pair.itemA?.price ?? 300000) + (pair.itemB?.price ?? 300000);
      const comboPrice = Math.round((baseSum * 0.9) / 5000) * 5000;
      const mergedIngredients = Array.from(
        new Set([...(pair.itemA?.ingredientsFa ?? []), ...(pair.itemB?.ingredientsFa ?? [])]),
      ).slice(0, 5);

      expansionIdeas.push({
        id: `combo-${pair.key}`,
        headlineFa: `ست جفت‌سازی «${pair.nameA} + ${pair.nameB}»`,
        insightFa: `این دو آیتم (${catA} و ${catB}) در ${toPersianDigits(pair.orderCount)} سفارش گذشته هم‌زمان انتخاب شده‌اند.`,
        template: {
          categoryId: pair.itemA?.categoryId || pair.itemB?.categoryId || categories[0]?.id || '',
          nameFa: `ست ویژه ${pair.nameA} و ${pair.nameB}`,
          nameEn: `${pair.itemA?.nameEn || 'Signature'} Pairing Set`,
          descriptionFa: `ترکیب محبوب مشتریان شامل ${pair.nameA} در کنار ${pair.nameB} با سرو هم‌زمان و قیمت ویژه.`,
          price: String(comboPrice),
          prepTimeMinutes: String(
            Math.max(pair.itemA?.prepTimeMinutes ?? 8, pair.itemB?.prepTimeMinutes ?? 8),
          ),
          ingredientsText: mergedIngredients.join('، '),
          imageUrl: pair.itemA?.imageUrl || pair.itemB?.imageUrl || 'preset:saffron_latte',
          isSignature: true,
        },
      });
    }

    // Also add complement expansion ideas based on single top sellers
    const topItem = topSingleItems[0]?.item;
    if (topItem) {
      const topCat = categoryMap.get(topItem.categoryId);
      const isDrink =
        topItem.categoryId.includes('drink') || (topCat?.nameFa ?? '').includes('نوشیدنی');
      const targetCat =
        categories.find((c) =>
          isDrink
            ? c.id.includes('appetizer') || c.nameFa.includes('پیش')
            : c.id.includes('cold') || c.nameFa.includes('سرد') || c.nameFa.includes('نوشیدنی'),
        ) ?? categories[0];

      if (targetCat) {
        expansionIdeas.push({
          id: `complement-${topItem.id}`,
          headlineFa: isDrink
            ? `میان‌وعده اختصاصی کنار «${topItem.nameFa}»`
            : `نوشیدنی دست‌ساز مکمل برای «${topItem.nameFa}»`,
          insightFa: `«${topItem.nameFa}» پرتکرارترین آیتم در سفارشات اخیر بوده است؛ تعریف یک مکمل هم‌نام نرخ سفارش دوآیتمی را افزایش می‌دهد.`,
          template: {
            categoryId: targetCat.id,
            nameFa: isDrink
              ? `تارت بادام و زعفران مکمل ${topItem.nameFa.split(' ')[0]}`
              : `موکتل لیمو و رزماری (مکمل ${topItem.nameFa.split(' ')[0]})`,
            nameEn: isDrink ? 'Artisan Saffron Almond Tart' : 'Citrus Rosemary Pairing Cooler',
            descriptionFa: isDrink
              ? `شیرینی لطیف و کم‌شکر طراحی‌شده برای همراهی و تعادل طعم با ${topItem.nameFa}.`
              : `نوشیدنی خنک و مرکباتی طراحی‌شده برای تعادل طعم با ${topItem.nameFa}.`,
            price: isDrink ? '245000' : '235000',
            prepTimeMinutes: '6',
            ingredientsText: isDrink
              ? 'بادام برشته، زعفران، کره فرانسوی، وانیل'
              : 'عصاره لیمو تازه، رزماری، سودا دست‌ساز، پرتقال خونی',
            imageUrl: isDrink ? 'preset:croissant_brunch' : 'preset:espresso_tonic',
            isSignature: true,
          },
        });
      }
    }

    return {
      validOrdersCount: validOrders.length,
      multiItemOrdersCount: validOrders.filter((o) => o.items.length >= 2).length,
      popularPairs,
      topSingleItems: topSingleItems.slice(0, 4),
      expansionIdeas,
    };
  }, [orders, itemMap, categoryMap, categories]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="paper-sheet flex flex-col justify-between gap-4 rounded-3xl p-6 sm:flex-row sm:items-center">
        <div>
          <p dir="ltr" className="font-display-serif text-right text-xs italic text-[#96522B]">
            Order Co-Occurrence &amp; Flavor Intelligence
          </p>
          <h2 className="text-lg font-extrabold text-[#2B1B12]">
            تحلیل پرطرفدارترین جفت‌های طعم (Popular Pairings)
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-[#6A574A]">
            بررسی سفارشات گذشته مشتریان برای کشف ترکیب‌هایی که هم‌زمان سفارش داده می‌شوند و تعریف آیتم‌های مکمل جدید.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchOrders}
          className="btn-paper-cream inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>تحلیل مجدد سفارشات</span>
        </button>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="paper-sheet rounded-2xl p-4">
          <p className="text-xs font-semibold text-[#6A574A]">کل سفارشات معتبر بررسی‌شده</p>
          <p className="mt-1 tabular-nums text-2xl font-extrabold text-[#2B1B12]">
            {toPersianDigits(analytics.validOrdersCount)} سفارش
          </p>
        </div>
        <div className="paper-sheet-kraft rounded-2xl p-4">
          <p className="text-xs font-semibold text-[#6A574A]">سفارشات چندآیتمی (دارای جفت‌سازی)</p>
          <p className="mt-1 tabular-nums text-2xl font-extrabold text-[#96522B]">
            {toPersianDigits(analytics.multiItemOrdersCount)} سفارش
          </p>
        </div>
        <div className="paper-sheet-sage rounded-2xl p-4">
          <p className="text-xs font-semibold text-[#354428]">جفت‌های طعم کشف‌شده</p>
          <p className="mt-1 tabular-nums text-2xl font-extrabold text-[#24301B]">
            {toPersianDigits(analytics.popularPairs.length)} ترکیب محبوب
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-800">
          {error}
        </div>
      )}

      {/* Section 1: Co-Ordered Popular Pairs */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-[#96522B]" />
          <h3 className="text-base font-extrabold text-[#2B1B12]">
            جفت‌های پرطرفدار در سبد مشتریان
          </h3>
        </div>

        {loading ? (
          <div className="paper-sheet rounded-3xl p-8 text-center text-sm font-semibold text-[#6A574A]">
            در حال استخراج الگوهای سفارش...
          </div>
        ) : analytics.popularPairs.length === 0 ? (
          <div className="paper-sheet rounded-3xl p-8 text-center">
            <p className="text-sm font-bold text-[#2B1B12]">
              هنوز سفارش چندآیتمی برای محاسبه جفت‌سازی ثبت نشده است.
            </p>
            <p className="mt-1 text-xs text-[#6A574A]">
              به‌محض ثبت سفارش‌هایی با بیش از دو آیتم، محبوب‌ترین جفت‌ها در این بخش نمایش داده می‌شوند.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {analytics.popularPairs.map((pair, idx) => {
              const baseSum = (pair.itemA?.price ?? 300000) + (pair.itemB?.price ?? 300000);
              const comboPrice = Math.round((baseSum * 0.9) / 5000) * 5000;
              const mergedIngredients = Array.from(
                new Set([
                  ...(pair.itemA?.ingredientsFa ?? []),
                  ...(pair.itemB?.ingredientsFa ?? []),
                ]),
              ).slice(0, 5);

              return (
                <div
                  key={pair.key}
                  className="paper-sheet flex flex-col justify-between gap-4 rounded-3xl p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="paper-sheet-kraft flex h-8 w-8 items-center justify-center rounded-xl text-xs font-extrabold text-[#96522B] tabular-nums">
                        #{toPersianDigits(idx + 1)}
                      </span>
                      <div>
                        <p className="text-xs font-bold text-[#96522B]">
                          تکرار هم‌زمان در {toPersianDigits(pair.orderCount)} سفارش
                        </p>
                        <p className="tabular-nums text-[11px] text-[#6A574A]">
                          مجموع فروش مشترک: {formatPriceFa(pair.combinedRevenue)} {currencyLabel}
                        </p>
                      </div>
                    </div>

                    <span className="paper-sheet-sage inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-bold text-[#24301B]">
                      <Flame className="h-3 w-3 text-[#C27445]" />
                      <span>{toPersianDigits(pair.combinedUnits)} سرو</span>
                    </span>
                  </div>

                  {/* Paired Items Visual Bridge */}
                  <div className="paper-sheet-kraft flex items-center justify-between gap-3 rounded-2xl p-3">
                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                      <PairMiniCutout imageUrl={pair.itemA?.imageUrl} alt={pair.nameA} />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-extrabold text-[#2B1B12]">{pair.nameA}</p>
                        <p className="text-[10px] text-[#6A574A]">
                          {pair.itemA
                            ? categoryMap.get(pair.itemA.categoryId)?.nameFa ?? ''
                            : 'آیتم منو'}
                        </p>
                      </div>
                    </div>

                    <span className="btn-paper-cream flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold text-[#C27445]">
                      +
                    </span>

                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                      <PairMiniCutout imageUrl={pair.itemB?.imageUrl} alt={pair.nameB} />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-extrabold text-[#2B1B12]">{pair.nameB}</p>
                        <p className="text-[10px] text-[#6A574A]">
                          {pair.itemB
                            ? categoryMap.get(pair.itemB.categoryId)?.nameFa ?? ''
                            : 'آیتم منو'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-[#2B1B12]/15 pt-3">
                    <p className="text-[11px] font-medium text-[#6A574A]">
                      پیشنهاد: تعریف پکیج مشترک با قیمت{' '}
                      <span className="font-extrabold text-[#2B1B12] tabular-nums">
                        {formatPriceFa(comboPrice)} {currencyLabel}
                      </span>
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        onCreateSuggestedItem({
                          categoryId:
                            pair.itemA?.categoryId ||
                            pair.itemB?.categoryId ||
                            categories[0]?.id ||
                            '',
                          nameFa: `ست ویژه ${pair.nameA} + ${pair.nameB}`,
                          nameEn: `${pair.itemA?.nameEn || 'Signature'} Pairing Combo`,
                          descriptionFa: `ترکیب پرطرفدار مشتریان شامل ${pair.nameA} و ${pair.nameB} با تخفیف ۱۰٪ جفت‌سازی.`,
                          price: String(comboPrice),
                          prepTimeMinutes: String(
                            Math.max(
                              pair.itemA?.prepTimeMinutes ?? 8,
                              pair.itemB?.prepTimeMinutes ?? 8,
                            ),
                          ),
                          ingredientsText: mergedIngredients.join('، '),
                          imageUrl:
                            pair.itemA?.imageUrl || pair.itemB?.imageUrl || 'preset:saffron_latte',
                          isSignature: true,
                        })
                      }
                      className="btn-paper-primary inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold"
                    >
                      <Plus className="h-3.5 w-3.5 text-[#E5A77B]" />
                      <span>ساخت کمبو در منو</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 2: Menu Expansion Recommendations */}
      {analytics.expansionIdeas.length > 0 && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#C27445]" />
            <h3 className="text-base font-extrabold text-[#2B1B12]">
              پیشنهاد افزودن آیتم‌های مرتبط جدید به منو
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {analytics.expansionIdeas.map((idea) => (
              <div
                key={idea.id}
                className="paper-sheet-kraft flex flex-col justify-between gap-4 rounded-3xl p-5"
              >
                <div>
                  <h4 className="text-sm font-extrabold text-[#2B1B12]">{idea.headlineFa}</h4>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#5A483C]">
                    {idea.insightFa}
                  </p>
                  <div className="paper-sheet mt-3 rounded-2xl p-3 text-xs">
                    <p className="font-bold text-[#2B1B12]">{idea.template.nameFa}</p>
                    <p className="mt-1 text-[11px] text-[#6A574A]">{idea.template.descriptionFa}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="tabular-nums text-xs font-extrabold text-[#96522B]">
                    قیمت پیشنهادی: {formatPriceFa(Number(idea.template.price))} {currencyLabel}
                  </span>
                  <button
                    type="button"
                    onClick={() => onCreateSuggestedItem(idea.template)}
                    className="btn-paper-terracotta inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold"
                  >
                    <span>ایجاد سریع این آیتم</span>
                    <ArrowUpLeft className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
