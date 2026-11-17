import React, { useMemo, useState } from 'react';
import {
  Check,
  Clock,
  Copy,
  Edit3,
  RotateCcw,
  Sparkles,
  Users,
  X,
} from '@/src/components/ClayCafeIcons';
import type { MenuDatabase, TableInfo, TableStatus } from '@/src/types/menu';
import { toPersianDigits } from '@/src/lib/formatters';

interface TableDashboardProps {
  menu: MenuDatabase;
  authHeaders: Record<string, string>;
  onMenuUpdated: (nextMenu: MenuDatabase) => void;
  onUnauthorized: () => void;
  onFeedback: (type: 'ok' | 'err', text: string) => void;
}

const STATUS_META: Record<
  TableStatus,
  {
    label: string;
    badgeClass: string;
    cardClass: string;
    tableFillClass: string;
    chairClass: string;
  }
> = {
  available: {
    label: 'آزاد',
    badgeClass: 'paper-sheet-sage text-[#354428]',
    cardClass: 'paper-sheet',
    tableFillClass: 'border-[#7D9169] bg-[#E8EDE2] text-[#2F3F22]',
    chairClass: 'bg-[#9BAE88]',
  },
  occupied: {
    label: 'اشغال',
    badgeClass: 'bg-[#2B1B12] text-[#FCF9F2] border border-[#1E120B]',
    cardClass: 'paper-sheet-kraft',
    tableFillClass: 'border-[#1E120B] bg-[#2B1B12] text-[#FCF9F2]',
    chairClass: 'bg-[#96522B]',
  },
  reserved: {
    label: 'رزرو',
    badgeClass: 'bg-[#F5E1CF] text-[#824421] border border-[#C27445]/40',
    cardClass: 'paper-sheet',
    tableFillClass: 'border-[#C27445] bg-[#F5E1CF] text-[#783B19]',
    chairClass: 'bg-[#CF8051]',
  },
  cleaning: {
    label: 'آماده‌سازی',
    badgeClass: 'paper-sheet-kraft text-[#6A574A]',
    cardClass: 'paper-sheet',
    tableFillClass: 'border-dashed border-[#8E7C6D] bg-[#F4EDE0] text-[#6A574A]',
    chairClass: 'bg-[#CFC2AE]',
  },
};

const TableArchitecturalIllustration: React.FC<{
  table: TableInfo;
}> = ({ table }) => {
  const meta = STATUS_META[table.status];
  const chairs = Math.min(8, Math.max(2, table.capacity));
  const topChairs = Math.ceil(chairs / 2);
  const bottomChairs = Math.floor(chairs / 2);

  return (
    <div className="paper-recess mx-auto my-3 flex w-full flex-col items-center gap-1.5 rounded-2xl py-3 select-none">
      {/* Top Row Chairs */}
      <div className="flex items-center justify-center gap-2.5">
        {Array.from({ length: topChairs }, (_, idx) => (
          <span
            key={`t-${idx}`}
            className={`h-2 w-5 rounded-t-full shadow-[0_2px_4px_rgba(43,27,18,0.18)] transition-colors ${meta.chairClass}`}
          />
        ))}
      </div>

      {/* Tabletop */}
      <div
        className={`flex h-12 w-full max-w-[132px] items-center justify-center border-2 font-extrabold shadow-[0_5px_10px_rgba(43,27,18,0.16)] transition-colors ${
          table.capacity <= 2 ? 'max-w-[68px] rounded-full' : 'rounded-2xl'
        } ${meta.tableFillClass}`}
      >
        <span className="tabular-nums text-sm">{toPersianDigits(table.number)}</span>
      </div>

      {/* Bottom Row Chairs */}
      <div className="flex items-center justify-center gap-2.5">
        {Array.from({ length: bottomChairs }, (_, idx) => (
          <span
            key={`b-${idx}`}
            className={`h-2 w-5 rounded-b-full shadow-[0_2px_4px_rgba(43,27,18,0.18)] transition-colors ${meta.chairClass}`}
          />
        ))}
      </div>
    </div>
  );
};

export const TableDashboard: React.FC<TableDashboardProps> = ({
  menu,
  authHeaders,
  onMenuUpdated,
  onUnauthorized,
  onFeedback,
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | TableStatus>('all');
  const [updatingNumber, setUpdatingNumber] = useState<number | null>(null);
  const [editingTable, setEditingTable] = useState<TableInfo | null>(null);
  const [copiedTable, setCopiedTable] = useState<number | null>(null);
  const [resettingAll, setResettingAll] = useState(false);

  const tables = useMemo(
    () => [...(menu.tables ?? [])].sort((a, b) => a.number - b.number),
    [menu.tables],
  );

  const stats = useMemo(() => {
    const total = tables.length;
    const available = tables.filter((t) => t.status === 'available').length;
    const occupied = tables.filter((t) => t.status === 'occupied').length;
    const reserved = tables.filter((t) => t.status === 'reserved').length;
    const cleaning = tables.filter((t) => t.status === 'cleaning').length;
    const occupancyRate = total > 0 ? Math.round(((occupied + reserved) / total) * 100) : 0;
    const totalGuests = tables.reduce(
      (sum, t) => sum + (t.status === 'occupied' ? Math.max(t.guestsCount, 1) : 0),
      0,
    );
    return { total, available, occupied, reserved, cleaning, occupancyRate, totalGuests };
  }, [tables]);

  const filteredTables = useMemo(() => {
    if (filterStatus === 'all') return tables;
    return tables.filter((t) => t.status === filterStatus);
  }, [tables, filterStatus]);

  const handleUpdateTable = async (
    tableNum: number,
    patch: Partial<Pick<TableInfo, 'status' | 'capacity' | 'label' | 'guestsCount' | 'note'>>,
  ) => {
    setUpdatingNumber(tableNum);
    try {
      const res = await fetch(`/api/tables/${tableNum}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify(patch),
      });
      const data = (await res.json()) as MenuDatabase & { error?: string };
      if (res.status === 401 || res.status === 403) {
        onUnauthorized();
        return;
      }
      if (!res.ok) {
        onFeedback('err', data.error || 'به‌روزرسانی وضعیت میز ناموفق بود.');
        return;
      }
      onMenuUpdated(data);
      setEditingTable(null);
    } catch {
      onFeedback('err', 'ارتباط با سرور برقرار نشد.');
    } finally {
      setUpdatingNumber(null);
    }
  };

  const handleResetAll = async () => {
    setResettingAll(true);
    try {
      const res = await fetch('/api/tables/reset', {
        method: 'POST',
        headers: authHeaders,
      });
      const data = (await res.json()) as MenuDatabase & { error?: string };
      if (res.status === 401 || res.status === 403) {
        onUnauthorized();
        return;
      }
      if (!res.ok) {
        onFeedback('err', data.error || 'آزادسازی میزها ناموفق بود.');
        return;
      }
      onMenuUpdated(data);
      onFeedback('ok', 'تمام میزهای سالن به وضعیت آزاد تغییر یافتند.');
    } catch {
      onFeedback('err', 'ارتباط با سرور برقرار نشد.');
    } finally {
      setResettingAll(false);
    }
  };

  const handleCopyTableQrLink = async (tableNum: number) => {
    const url = `${window.location.origin}/?cafe=${menu.cafeSlug}&table=${tableNum}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedTable(tableNum);
      setTimeout(() => setCopiedTable(null), 1800);
    } catch {
      // Clipboard fallback ignored
    }
  };

  const formatTimeAgo = (iso: string) => {
    const diffMin = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
    if (diffMin < 1) return 'هم‌اکنون';
    if (diffMin < 60) return `${toPersianDigits(diffMin)} دقیقه پیش`;
    const hours = Math.floor(diffMin / 60);
    return `${toPersianDigits(hours)} ساعت پیش`;
  };

  return (
    <div className="space-y-6">
      {/* Paper Cut KPI Overview Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <div className="paper-sheet rounded-2xl p-4">
          <p className="mb-1 text-xs font-semibold text-[#6A574A]">کل میزهای سالن</p>
          <p className="tabular-nums text-2xl font-extrabold text-[#2B1B12]">
            {toPersianDigits(stats.total)}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-[#96522B]">ظرفیت کل سالن</p>
        </div>

        <div className="paper-sheet-sage rounded-2xl p-4">
          <p className="mb-1 text-xs font-semibold text-[#354428]">میزهای آزاد</p>
          <p className="tabular-nums text-2xl font-extrabold text-[#24301B]">
            {toPersianDigits(stats.available)}
          </p>
          <p className="mt-1 text-[11px] font-medium text-[#445733]">آماده پذیرش مشتری</p>
        </div>

        <div className="paper-sheet-espresso rounded-2xl p-4 text-[#FCF9F2]">
          <p className="mb-1 text-xs font-semibold text-[#E9DEC9]">اشغال شده</p>
          <p className="tabular-nums text-2xl font-extrabold">
            {toPersianDigits(stats.occupied)}
          </p>
          <p className="mt-1 text-[11px] font-medium text-[#E5A77B]">
            {toPersianDigits(stats.totalGuests)} مهمان حاضر
          </p>
        </div>

        <div className="paper-sheet-kraft rounded-2xl p-4">
          <p className="mb-1 text-xs font-semibold text-[#96522B]">رزرو شده</p>
          <p className="tabular-nums text-2xl font-extrabold text-[#2B1B12]">
            {toPersianDigits(stats.reserved)}
          </p>
          <p className="mt-1 text-[11px] font-medium text-[#6A574A]">در انتظار ورود مهمان</p>
        </div>

        <div className="paper-sheet col-span-2 rounded-2xl p-4 sm:col-span-1">
          <div className="mb-1 flex items-center justify-between text-xs font-semibold text-[#6A574A]">
            <span>نرخ اشغال</span>
            <span className="tabular-nums font-extrabold text-[#2B1B12]">
              {toPersianDigits(stats.occupancyRate)}٪
            </span>
          </div>
          <div className="paper-recess my-2.5 h-3 w-full overflow-hidden rounded-full p-0.5">
            <div
              className="h-full rounded-full bg-[#2B1B12] transition-all duration-300"
              style={{ width: `${stats.occupancyRate}%` }}
            />
          </div>
          <p className="text-[11px] font-medium text-[#6A574A]">
            {toPersianDigits(stats.cleaning)} میز در حال نظافت
          </p>
        </div>
      </div>

      {/* Filter & Quick Reset Toolbar */}
      <div className="paper-sheet flex flex-wrap items-center justify-between gap-3 rounded-2xl p-3.5">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { key: 'all', label: `همه (${toPersianDigits(stats.total)})` },
              { key: 'available', label: `آزاد (${toPersianDigits(stats.available)})` },
              { key: 'occupied', label: `اشغال (${toPersianDigits(stats.occupied)})` },
              { key: 'reserved', label: `رزرو (${toPersianDigits(stats.reserved)})` },
              { key: 'cleaning', label: `آماده‌سازی (${toPersianDigits(stats.cleaning)})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilterStatus(tab.key)}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold ${
                filterStatus === tab.key ? 'btn-paper-primary' : 'btn-paper-cream'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleResetAll}
          disabled={resettingAll}
          className="btn-paper-kraft inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold disabled:opacity-50"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>{resettingAll ? 'در حال آزادسازی...' : 'آزادسازی همه میزها'}</span>
        </button>
      </div>

      {/* Visual Paper Cut Floor Plan Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {filteredTables.map((table) => {
          const meta = STATUS_META[table.status];
          const isBusy = updatingNumber === table.number;

          return (
            <div
              key={table.number}
              className={`paper-sheet-hover flex flex-col justify-between rounded-2xl p-4 ${meta.cardClass}`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-extrabold text-[#2B1B12]">{table.label}</h3>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[11px] font-semibold text-[#6A574A]">
                      <Users className="h-3 w-3 text-[#96522B]" />
                      <span>
                        {table.status === 'occupied' && table.guestsCount > 0
                          ? `${toPersianDigits(table.guestsCount)} از ${toPersianDigits(table.capacity)} نفر`
                          : `ظرفیت ${toPersianDigits(table.capacity)} نفر`}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${meta.badgeClass}`}
                  >
                    {meta.label}
                  </span>
                </div>

                <TableArchitecturalIllustration table={table} />

                <div className="mb-3 min-h-[34px] rounded-xl bg-white/75 px-3 py-2 text-[11px] text-[#5A483C]">
                  {table.note ? (
                    <p className="line-clamp-1 font-semibold text-[#2B1B12]">{table.note}</p>
                  ) : (
                    <p className="text-[#8E7C6D]">بدون یادداشت فعال</p>
                  )}
                  <div className="mt-0.5 flex items-center gap-1 text-[10px] text-[#8E7C6D]">
                    <Clock className="h-2.5 w-2.5" />
                    <span>{formatTimeAgo(table.updatedAt)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 border-t border-dashed border-[#2B1B12]/15 pt-3">
                <div className="grid grid-cols-4 gap-1">
                  {(['available', 'occupied', 'reserved', 'cleaning'] as TableStatus[]).map(
                    (st) => (
                      <button
                        key={st}
                        type="button"
                        disabled={isBusy}
                        onClick={() =>
                          handleUpdateTable(table.number, {
                            status: st,
                            guestsCount:
                              st === 'occupied'
                                ? Math.max(table.guestsCount, 2)
                                : st === 'available'
                                  ? 0
                                  : table.guestsCount,
                          })
                        }
                        className={`rounded-lg py-1.5 text-[10px] font-bold ${
                          table.status === st
                            ? 'bg-[#2B1B12] text-[#FCF9F2] shadow-[0_2px_0_#1A0F09]'
                            : 'btn-paper-cream'
                        }`}
                      >
                        {STATUS_META[st].label}
                      </button>
                    ),
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => setEditingTable(table)}
                    className="btn-paper-cream inline-flex flex-1 items-center justify-center gap-1 rounded-xl py-1.5 text-[11px] font-bold"
                  >
                    <Edit3 className="h-3 w-3" />
                    <span>جزئیات و یادداشت</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopyTableQrLink(table.number)}
                    title="کپی لینک QR این میز"
                    className="btn-paper-cream inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-[#96522B]"
                  >
                    {copiedTable === table.number ? (
                      <Check className="h-3.5 w-3.5 text-[#5C7247]" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    <span>QR</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Single Table Modal */}
      {editingTable && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F130C]/55 p-4 backdrop-blur-xs"
          onClick={() => setEditingTable(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="paper-sheet cafe-shadow-deep w-full max-w-md rounded-3xl p-6"
          >
            <div className="mb-5 flex items-center justify-between border-b border-dashed border-[#2B1B12]/15 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#96522B]" />
                <h3 className="text-lg font-extrabold text-[#2B1B12]">
                  مدیریت {editingTable.label}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingTable(null)}
                className="btn-paper-cream flex h-8 w-8 items-center justify-center rounded-full"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleUpdateTable(editingTable.number, {
                  label: editingTable.label,
                  status: editingTable.status,
                  capacity: editingTable.capacity,
                  guestsCount: editingTable.guestsCount,
                  note: editingTable.note,
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="mb-1.5 block text-xs font-bold text-[#2B1B12]">عنوان میز</label>
                <input
                  type="text"
                  value={editingTable.label}
                  onChange={(e) => setEditingTable({ ...editingTable, label: e.target.value })}
                  className="paper-recess w-full rounded-xl px-3.5 py-2.5 text-sm font-medium text-[#2B1B12] focus:outline-2 focus:outline-[#2B1B12]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-[#2B1B12]">وضعیت فعلی</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['available', 'occupied', 'reserved', 'cleaning'] as TableStatus[]).map(
                    (st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setEditingTable({ ...editingTable, status: st })}
                        className={`rounded-xl px-3 py-2 text-xs font-bold ${
                          editingTable.status === st ? 'btn-paper-primary' : 'btn-paper-cream'
                        }`}
                      >
                        {STATUS_META[st].label}
                      </button>
                    ),
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-[#2B1B12]">ظرفیت صندلی</label>
                  <input
                    type="number"
                    min={1}
                    max={24}
                    value={editingTable.capacity}
                    onChange={(e) =>
                      setEditingTable({
                        ...editingTable,
                        capacity: Math.max(1, Number(e.target.value) || 2),
                      })
                    }
                    className="paper-recess w-full rounded-xl px-3.5 py-2.5 tabular-nums text-sm font-bold text-[#2B1B12] focus:outline-2 focus:outline-[#2B1B12]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-[#2B1B12]">تعداد مهمان حاضر</label>
                  <input
                    type="number"
                    min={0}
                    max={24}
                    value={editingTable.guestsCount}
                    onChange={(e) =>
                      setEditingTable({
                        ...editingTable,
                        guestsCount: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className="paper-recess w-full rounded-xl px-3.5 py-2.5 tabular-nums text-sm font-bold text-[#2B1B12] focus:outline-2 focus:outline-[#2B1B12]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-[#2B1B12]">
                  یادداشت (نام رزرو یا توضیح سفارش)
                </label>
                <input
                  type="text"
                  value={editingTable.note}
                  onChange={(e) => setEditingTable({ ...editingTable, note: e.target.value })}
                  placeholder="مثلاً: رزرو ساعت ۲۱ - آقای محمدی"
                  className="paper-recess w-full rounded-xl px-3.5 py-2.5 text-sm font-medium text-[#2B1B12] focus:outline-2 focus:outline-[#2B1B12]"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={updatingNumber === editingTable.number}
                  className="btn-paper-primary flex-1 rounded-xl py-2.5 text-sm font-bold"
                >
                  ذخیره وضعیت میز
                </button>
                <button
                  type="button"
                  onClick={() => setEditingTable(null)}
                  className="btn-paper-cream rounded-xl px-4 py-2.5 text-sm font-bold"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
