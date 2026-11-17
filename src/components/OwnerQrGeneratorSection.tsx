import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  LayoutGrid,
  QrCode,
} from '@/src/components/ClayCafeIcons';
import type { CafeSummary } from '@/src/types/menu';
import { toPersianDigits } from '@/src/lib/formatters';

interface OwnerQrGeneratorSectionProps {
  cafes: CafeSummary[];
  selectedCafeId: string;
  onSelectCafeId: (cafeId: string) => void;
  onOpenCafeTable: (slug: string, tableNumber: number | null) => void;
  onNotify: (type: 'ok' | 'err', text: string) => void;
}

interface TableQrEntry {
  tableNumber: number;
  url: string;
  dataUrl: string;
}

export const OwnerQrGeneratorSection: React.FC<OwnerQrGeneratorSectionProps> = ({
  cafes,
  selectedCafeId,
  onSelectCafeId,
  onOpenCafeTable,
  onNotify,
}) => {
  const activeCafe = useMemo(
    () => cafes.find((c) => c.id === selectedCafeId) ?? cafes[0] ?? null,
    [cafes, selectedCafeId],
  );

  const maxTables = Math.max(1, activeCafe?.tableCount ?? 1);
  const [viewMode, setViewMode] = useState<'single' | 'all'>('single');
  const [selectedTable, setSelectedTable] = useState<number>(1);
  const [singleQrUrl, setSingleQrUrl] = useState<string>('');
  const [allTableQrs, setAllTableQrs] = useState<TableQrEntry[]>([]);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [downloadingCard, setDownloadingCard] = useState(false);

  useEffect(() => {
    setSelectedTable((prev) => {
      if (prev === 0) return 0;
      return prev > maxTables ? 1 : prev;
    });
  }, [activeCafe?.id, maxTables]);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const buildTableUrl = (slug: string, tableNum: number): string => {
    const encodedSlug = encodeURIComponent(slug);
    return tableNum > 0
      ? `${origin}/?cafe=${encodedSlug}&table=${tableNum}`
      : `${origin}/?cafe=${encodedSlug}`;
  };

  const singleTargetUrl = activeCafe ? buildTableUrl(activeCafe.slug, selectedTable) : '';

  useEffect(() => {
    if (!singleTargetUrl) {
      setSingleQrUrl('');
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(singleTargetUrl, {
      width: 640,
      margin: 2,
      color: {
        dark: '#221914',
        light: '#FCF9F2',
      },
      errorCorrectionLevel: 'H',
    })
      .then((url) => {
        if (!cancelled) setSingleQrUrl(url);
      })
      .catch(() => {
        if (!cancelled) setSingleQrUrl('');
      });

    return () => {
      cancelled = true;
    };
  }, [singleTargetUrl]);

  useEffect(() => {
    if (viewMode !== 'all' || !activeCafe || !origin) {
      return;
    }
    let cancelled = false;
    setGeneratingAll(true);

    const tableNumbers = Array.from({ length: maxTables }, (_, i) => i + 1);
    Promise.all(
      tableNumbers.map(async (num) => {
        const url = buildTableUrl(activeCafe.slug, num);
        const dataUrl = await QRCode.toDataURL(url, {
          width: 420,
          margin: 2,
          color: {
            dark: '#221914',
            light: '#FCF9F2',
          },
          errorCorrectionLevel: 'H',
        });
        return { tableNumber: num, url, dataUrl };
      }),
    )
      .then((entries) => {
        if (!cancelled) {
          setAllTableQrs(entries);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAllTableQrs([]);
          onNotify('err', 'خطا در تولید کدهای QR میزها.');
        }
      })
      .finally(() => {
        if (!cancelled) setGeneratingAll(false);
      });

    return () => {
      cancelled = true;
    };
  }, [viewMode, activeCafe?.id, activeCafe?.slug, maxTables, origin, onNotify]);

  if (!activeCafe) return null;

  const triggerDownloadDataUrl = (dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleCopy = async (key: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((curr) => (curr === key ? null : curr)), 1800);
    } catch {
      onNotify('err', 'کپی لینک انجام نشد.');
    }
  };

  const handleDownloadRawPng = (dataUrl: string, tableNum: number) => {
    if (!dataUrl) return;
    const filename =
      tableNum > 0
        ? `${activeCafe.slug}-table-${tableNum}-qr.png`
        : `${activeCafe.slug}-menu-qr.png`;
    triggerDownloadDataUrl(dataUrl, filename);
    onNotify(
      'ok',
      tableNum > 0
        ? `فایل QR میز شماره ${toPersianDigits(tableNum)} دانلود شد.`
        : 'فایل QR منوی عمومی دانلود شد.',
    );
  };

  const loadImage = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

  const handleDownloadBrandedCard = async (
    qrSrc: string,
    tableNum: number,
  ) => {
    if (!qrSrc) return;
    setDownloadingCard(true);
    try {
      const qrImg = await loadImage(qrSrc);
      const canvas = document.createElement('canvas');
      canvas.width = 720;
      canvas.height = 960;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Warm cream cardstock background
      ctx.fillStyle = '#FCF8F0';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Subtle outer hairline border
      ctx.strokeStyle = '#D5C9B6';
      ctx.lineWidth = 4;
      ctx.strokeRect(24, 24, canvas.width - 48, canvas.height - 48);

      // Espresso dark header band
      ctx.fillStyle = '#2B1E17';
      ctx.fillRect(24, 24, canvas.width - 48, 175);

      ctx.textAlign = 'center';
      ctx.fillStyle = '#E5A77B';
      ctx.font = 'bold 22px Georgia, serif';
      ctx.fillText((activeCafe.nameEn || activeCafe.slug).toUpperCase(), canvas.width / 2, 82);

      ctx.fillStyle = '#FCF9F2';
      ctx.font = 'bold 42px Vazirmatn, sans-serif';
      ctx.fillText(activeCafe.nameFa, canvas.width / 2, 148);

      // Table title
      ctx.fillStyle = '#96522B';
      ctx.font = 'bold 34px Vazirmatn, sans-serif';
      const tableText =
        tableNum > 0
          ? `میز شماره ${toPersianDigits(tableNum)}`
          : 'منوی دیجیتال مجموعه';
      ctx.fillText(tableText, canvas.width / 2, 270);

      // QR frame box
      const qrSize = 440;
      const qrX = (canvas.width - qrSize) / 2;
      const qrY = 315;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(qrX - 18, qrY - 18, qrSize + 36, qrSize + 36);
      ctx.strokeStyle = '#C9B9A2';
      ctx.lineWidth = 3;
      ctx.strokeRect(qrX - 18, qrY - 18, qrSize + 36, qrSize + 36);

      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

      // Footer instruction
      ctx.fillStyle = '#2B1E17';
      ctx.font = 'bold 26px Vazirmatn, sans-serif';
      ctx.fillText('برای مشاهده منو و ثبت سفارش اسکن کنید', canvas.width / 2, 835);

      ctx.fillStyle = '#7A6556';
      ctx.font = '18px monospace';
      ctx.fillText(
        tableNum > 0 ? `/?cafe=${activeCafe.slug}&table=${tableNum}` : `/?cafe=${activeCafe.slug}`,
        canvas.width / 2,
        888,
      );

      const outUrl = canvas.toDataURL('image/png');
      const filename =
        tableNum > 0
          ? `${activeCafe.slug}-table-${tableNum}-card.png`
          : `${activeCafe.slug}-menu-card.png`;
      triggerDownloadDataUrl(outUrl, filename);
      onNotify(
        'ok',
        tableNum > 0
          ? `کارت چاپی QR میز شماره ${toPersianDigits(tableNum)} دانلود شد.`
          : 'کارت چاپی QR منو دانلود شد.',
      );
    } catch {
      onNotify('err', 'ساخت کارت چاپی انجام نشد.');
    } finally {
      setDownloadingCard(false);
    }
  };

  const handleDownloadAllSheet = async () => {
    if (allTableQrs.length === 0) return;
    setDownloadingCard(true);
    try {
      const cols = 3;
      const rows = Math.ceil(allTableQrs.length / cols);
      const cardW = 360;
      const cardH = 440;
      const gap = 28;
      const pad = 36;

      const canvas = document.createElement('canvas');
      canvas.width = pad * 2 + cols * cardW + (cols - 1) * gap;
      canvas.height = pad * 2 + 80 + rows * cardH + (rows - 1) * gap;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#F6F0E4';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.textAlign = 'center';
      ctx.fillStyle = '#2B1E17';
      ctx.font = 'bold 34px Vazirmatn, sans-serif';
      ctx.fillText(
        `برگه کدهای QR میزهای ${activeCafe.nameFa}`,
        canvas.width / 2,
        pad + 36,
      );

      for (let i = 0; i < allTableQrs.length; i++) {
        const entry = allTableQrs[i];
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = pad + col * (cardW + gap);
        const y = pad + 72 + row * (cardH + gap);

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(x, y, cardW, cardH);
        ctx.strokeStyle = '#CFC1AC';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, cardW, cardH);

        ctx.fillStyle = '#2B1E17';
        ctx.fillRect(x, y, cardW, 64);

        ctx.fillStyle = '#FCF9F2';
        ctx.font = 'bold 22px Vazirmatn, sans-serif';
        ctx.fillText(
          `${activeCafe.nameFa} · میز ${toPersianDigits(entry.tableNumber)}`,
          x + cardW / 2,
          y + 40,
        );

        const qrImg = await loadImage(entry.dataUrl);
        ctx.drawImage(qrImg, x + 45, y + 84, 270, 270);

        ctx.fillStyle = '#6A574A';
        ctx.font = 'bold 16px Vazirmatn, sans-serif';
        ctx.fillText('اسکن جهت سفارش سرمیز', x + cardW / 2, y + 382);

        ctx.fillStyle = '#8A7464';
        ctx.font = '13px monospace';
        ctx.fillText(
          `?cafe=${activeCafe.slug}&table=${entry.tableNumber}`,
          x + cardW / 2,
          y + 412,
        );
      }

      const sheetUrl = canvas.toDataURL('image/png');
      triggerDownloadDataUrl(sheetUrl, `${activeCafe.slug}-all-tables-qr-sheet.png`);
      onNotify(
        'ok',
        `برگه چاپی QR همه ${toPersianDigits(allTableQrs.length)} میز دانلود شد.`,
      );
    } catch {
      onNotify('err', 'ساخت برگه یکجا ناموفق بود.');
    } finally {
      setDownloadingCard(false);
    }
  };

  return (
    <section
      id="owner-qr-generator"
      aria-labelledby="owner-qr-generator-heading"
      className="paper-sheet mb-6 rounded-3xl border border-[#2B1B12]/12 p-5 sm:p-6"
    >
      {/* Studio Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-dashed border-[#2B1B12]/15 pb-4">
        <div className="flex items-start gap-3">
          <div className="paper-sheet-espresso flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-[#E5A77B]">
            <QrCode className="h-5 w-5" />
          </div>
          <div>
            <h2
              id="owner-qr-generator-heading"
              className="text-base font-extrabold text-[#2B1B12] sm:text-lg"
            >
              تولید و دانلود کد QR اختصاصی میزهای کافه‌ها
            </h2>
            <p className="mt-0.5 text-xs text-[#6A574A]">
              برای هر میز از کافی‌شاپ‌های پلتفرم، کد QR اختصاصی با شماره میز از پیش انتخاب‌شده در
              آدرس منو بسازید و به‌صورت تکی یا یکجا دانلود کنید.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <label htmlFor="owner-qr-cafe-select" className="text-xs font-bold text-[#2B1B12]">
            کافی‌شاپ هدف:
          </label>
          <select
            id="owner-qr-cafe-select"
            value={activeCafe.id}
            onChange={(e) => onSelectCafeId(e.target.value)}
            className="paper-recess min-w-[190px] rounded-xl px-3.5 py-2 text-xs font-extrabold text-[#2B1B12] focus:outline-2 focus:outline-[#2B1B12]"
          >
            {cafes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nameFa} ({toPersianDigits(c.tableCount)} میز)
              </option>
            ))}
          </select>

          <div className="paper-sheet-kraft flex items-center gap-1 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setViewMode('single')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                viewMode === 'single' ? 'btn-paper-primary' : 'text-[#5A483C] hover:text-[#2B1B12]'
              }`}
            >
              <QrCode className="h-3.5 w-3.5" />
              <span>تک‌میز</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('all')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                viewMode === 'all' ? 'btn-paper-primary' : 'text-[#5A483C] hover:text-[#2B1B12]'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>همه میزها ({toPersianDigits(maxTables)})</span>
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'single' ? (
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
          {/* Controls Column */}
          <div className="space-y-5 lg:col-span-7">
            <div>
              <label htmlFor="owner-qr-table-select" className="mb-2 block text-xs font-bold text-[#2B1B12]">
                انتخاب شماره میز برای تولید کد QR
              </label>
              <select
                id="owner-qr-table-select"
                value={selectedTable}
                onChange={(e) => setSelectedTable(Number(e.target.value))}
                className="paper-recess w-full rounded-xl px-4 py-3 text-sm font-bold text-[#2B1B12] focus:outline-2 focus:outline-[#2B1B12]"
              >
                <option value={0}>منوی عمومی کافه (بدون شماره میز)</option>
                {Array.from({ length: maxTables }, (_, idx) => idx + 1).map((num) => (
                  <option key={num} value={num}>
                    میز شماره {toPersianDigits(num)} — پارامتر table={num}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Table Stepper Pills */}
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: Math.min(maxTables, 16) }, (_, idx) => idx + 1).map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setSelectedTable(num)}
                  className={`tabular-nums min-w-[42px] rounded-xl px-2.5 py-1.5 text-xs font-bold ${
                    selectedTable === num ? 'btn-paper-terracotta' : 'btn-paper-cream'
                  }`}
                >
                  میز {toPersianDigits(num)}
                </button>
              ))}
            </div>

            {/* Target URL Display */}
            <div className="paper-sheet-kraft rounded-2xl p-4">
              <div className="mb-1.5 flex items-center justify-between gap-2 text-xs font-bold text-[#6A574A]">
                <span>آدرس مقصد اختصاصی اسکن QR:</span>
                {selectedTable > 0 && (
                  <span className="tabular-nums text-[#96522B]">
                    میز {toPersianDigits(selectedTable)} پیش‌انتخاب‌شده
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <code dir="ltr" className="min-w-0 flex-1 truncate font-mono text-xs font-semibold text-[#2B1B12]">
                  {singleTargetUrl}
                </code>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => void handleCopy('single', singleTargetUrl)}
                    className="btn-paper-cream inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold"
                  >
                    {copiedKey === 'single' ? (
                      <Check className="h-3.5 w-3.5 text-[#5C7247]" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    <span>{copiedKey === 'single' ? 'کپی شد' : 'کپی لینک'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onOpenCafeTable(activeCafe.slug, selectedTable > 0 ? selectedTable : null)
                    }
                    className="btn-paper-cream inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold text-[#2B1B12]"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>تست لینک</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Download Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={!singleQrUrl || downloadingCard}
                onClick={() => void handleDownloadBrandedCard(singleQrUrl, selectedTable)}
                className="btn-paper-primary inline-flex min-h-[44px] items-center gap-2 whitespace-nowrap rounded-xl px-5 py-2.5 text-xs font-bold disabled:opacity-55 sm:text-sm"
              >
                <Download className="h-4 w-4 text-[#E5A77B]" />
                <span>
                  {downloadingCard
                    ? 'در حال آماده‌سازی...'
                    : 'دانلود کارت آماده چاپ میز (PNG)'}
                </span>
              </button>

              <button
                type="button"
                disabled={!singleQrUrl}
                onClick={() => handleDownloadRawPng(singleQrUrl, selectedTable)}
                className="btn-paper-kraft inline-flex min-h-[44px] items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-bold disabled:opacity-55 sm:text-sm"
              >
                <QrCode className="h-4 w-4" />
                <span>دانلود فقط کد QR (PNG)</span>
              </button>
            </div>
          </div>

          {/* Branded Card Live Preview */}
          <div className="flex justify-center lg:col-span-5">
            <div className="relative w-full max-w-[290px]">
              <div
                aria-hidden="true"
                className="paper-sheet-kraft pointer-events-none absolute -bottom-2 inset-x-3 top-3 rounded-3xl"
              />
              <div className="paper-sheet relative overflow-hidden rounded-3xl text-center text-[#2B1B12]">
                <div className="paper-sheet-espresso px-5 py-4 text-[#FCF9F2]">
                  <div className="font-display-serif text-[11px] tracking-[0.2em] text-[#E5A77B]">
                    {activeCafe.nameEn || activeCafe.slug}
                  </div>
                  <h3 className="mt-0.5 text-lg font-extrabold">{activeCafe.nameFa}</h3>
                </div>

                <div className="p-5">
                  <p className="tabular-nums text-xs font-extrabold text-[#96522B]">
                    {selectedTable > 0
                      ? `میز شماره ${toPersianDigits(selectedTable)}`
                      : 'منوی دیجیتال مجموعه'}
                  </p>

                  <div className="paper-recess mx-auto my-3.5 flex aspect-square w-44 items-center justify-center rounded-2xl p-2.5">
                    {singleQrUrl ? (
                      <img
                        src={singleQrUrl}
                        alt={`کد QR ${activeCafe.nameFa} ${selectedTable > 0 ? `میز ${selectedTable}` : ''}`}
                        className="h-full w-full rounded-xl object-contain"
                      />
                    ) : (
                      <QrCode className="h-14 w-14 text-[#2B1B12]" />
                    )}
                  </div>

                  <p className="text-[11px] font-semibold text-[#6A574A]">
                    اسکن کنید تا مستقیم با شماره میز وارد منو شوید
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#2B1B12]/10 bg-[#FAF6EE] px-4 py-3">
            <p className="text-xs font-bold text-[#2B1B12]">
              تمامی {toPersianDigits(maxTables)} کد QR یکتای میزهای «{activeCafe.nameFa}» آماده است:
            </p>
            <button
              type="button"
              disabled={generatingAll || downloadingCard || allTableQrs.length === 0}
              onClick={() => void handleDownloadAllSheet()}
              className="btn-paper-primary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-55"
            >
              <Download className="h-4 w-4 text-[#E5A77B]" />
              <span>
                {downloadingCard
                  ? 'در حال تولید برگه...'
                  : 'دانلود برگه چاپی همه میزها (PNG)'}
              </span>
            </button>
          </div>

          {generatingAll ? (
            <div className="paper-recess rounded-2xl p-10 text-center text-xs font-bold text-[#6A574A]">
              در حال تولید کدهای QR یکتا برای همه میزها...
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {allTableQrs.map((entry) => (
                <div
                  key={entry.tableNumber}
                  className="paper-sheet-kraft flex flex-col items-center rounded-2xl p-4 text-center"
                >
                  <div className="mb-2 flex w-full items-center justify-between text-xs font-extrabold text-[#2B1B12]">
                    <span className="tabular-nums">میز شماره {toPersianDigits(entry.tableNumber)}</span>
                    <button
                      type="button"
                      onClick={() => onOpenCafeTable(activeCafe.slug, entry.tableNumber)}
                      title="مشاهده منو با این شماره میز"
                      className="text-[11px] font-bold text-[#96522B] hover:underline"
                    >
                      تست لینک
                    </button>
                  </div>

                  <div className="paper-recess mb-3 flex aspect-square w-36 items-center justify-center rounded-2xl p-2">
                    <img
                      src={entry.dataUrl}
                      alt={`کد QR میز ${entry.tableNumber}`}
                      className="h-full w-full rounded-lg object-contain"
                    />
                  </div>

                  <code
                    dir="ltr"
                    className="mb-3 w-full truncate rounded-lg bg-white/75 px-2 py-1 font-mono text-[10px] text-[#5A483C]"
                  >
                    /?cafe={activeCafe.slug}&table={entry.tableNumber}
                  </code>

                  <div className="flex w-full items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleDownloadRawPng(entry.dataUrl, entry.tableNumber)}
                      className="btn-paper-primary flex flex-1 items-center justify-center gap-1 rounded-xl py-2 text-[11px] font-bold"
                    >
                      <Download className="h-3.5 w-3.5 text-[#E5A77B]" />
                      <span>دانلود PNG</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleCopy(`tbl-${entry.tableNumber}`, entry.url)}
                      aria-label={`کپی لینک میز ${entry.tableNumber}`}
                      className="btn-paper-cream flex h-[32px] w-[36px] shrink-0 items-center justify-center rounded-xl"
                    >
                      {copiedKey === `tbl-${entry.tableNumber}` ? (
                        <Check className="h-3.5 w-3.5 text-[#5C7247]" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
