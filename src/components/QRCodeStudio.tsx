import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'qrcode';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  LayoutGrid,
  Printer,
  QrCode,
  RefreshCw,
  RotateCcw,
  TrendingUp,
  Upload,
  X,
} from '@/src/components/ClayCafeIcons';
import type { MenuDatabase, TableInfo } from '@/src/types/menu';
import { toPersianDigits } from '@/src/lib/formatters';

interface QRCodeStudioProps {
  cafeSlug: string;
  restaurantNameFa: string;
  restaurantNameEn: string;
  tableCount: number;
  tables: TableInfo[];
  generalQrScans: number;
  brandLogoUrl?: string;
  authHeaders: Record<string, string>;
  onMenuUpdated: (nextMenu: MenuDatabase) => void;
  onUnauthorized: () => void;
  onNotify?: (type: 'ok' | 'err', text: string) => void;
}

interface TableQrEntry {
  tableNumber: number; // 0 = general menu
  url: string;
  dataUrl: string;
}

type StudioViewMode = 'sheet' | 'single';
type SheetColumns = 2 | 3;
type QrThemeId = 'espresso' | 'sage' | 'terracotta' | 'petrol' | 'minimal';
type CenterLogoMode = 'none' | 'cup' | 'bean' | 'monogram' | 'store-logo' | 'custom';

interface QrThemePreset {
  id: QrThemeId;
  labelFa: string;
  qrDark: string;
  qrLight: string;
  cardBg: string;
  cardBorder: string;
  headerBg: string;
  headerText: string;
  headerSub: string;
  titleColor: string;
  footerText: string;
  minimalHeaderBorder?: boolean;
}

const QR_COLOR_THEMES: QrThemePreset[] = [
  {
    id: 'espresso',
    labelFa: 'اسپرسو و کرم',
    qrDark: '#2B1B12',
    qrLight: '#FCF9F2',
    cardBg: '#FCF8F0',
    cardBorder: '#C8B8A2',
    headerBg: '#2B1E17',
    headerText: '#FCF9F2',
    headerSub: '#E5A77B',
    titleColor: '#96522B',
    footerText: '#5A483C',
  },
  {
    id: 'sage',
    labelFa: 'سبز مریم‌گلی',
    qrDark: '#233B2F',
    qrLight: '#F6FAF7',
    cardBg: '#F4F8F5',
    cardBorder: '#A9C2B3',
    headerBg: '#2E4138',
    headerText: '#F6FAF7',
    headerSub: '#CBD7CD',
    titleColor: '#3D5C4B',
    footerText: '#496154',
  },
  {
    id: 'terracotta',
    labelFa: 'تراکوتا و مس',
    qrDark: '#6A2B12',
    qrLight: '#FFF9F3',
    cardBg: '#FDF6EE',
    cardBorder: '#DFB695',
    headerBg: '#7A3418',
    headerText: '#FFF9F3',
    headerSub: '#F3C5A2',
    titleColor: '#A84820',
    footerText: '#6B4837',
  },
  {
    id: 'petrol',
    labelFa: 'سرمه‌ای پترول',
    qrDark: '#17323B',
    qrLight: '#F5F9FB',
    cardBg: '#F4F8FA',
    cardBorder: '#A9C4CD',
    headerBg: '#1D3D47',
    headerText: '#F5F9FB',
    headerSub: '#B7D9E2',
    titleColor: '#255260',
    footerText: '#46616B',
  },
  {
    id: 'minimal',
    labelFa: 'سفید کم‌مصرف',
    qrDark: '#111111',
    qrLight: '#FFFFFF',
    cardBg: '#FFFFFF',
    cardBorder: '#94A3B8',
    headerBg: '#F8FAFC',
    headerText: '#0F172A',
    headerSub: '#475569',
    titleColor: '#0F172A',
    footerText: '#475569',
    minimalHeaderBorder: true,
  },
];

function formatRelativeScanTime(iso?: string): string {
  if (!iso) return 'هنوز اسکن نشده';
  const diffMin = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (diffMin < 1) return 'لحظاتی پیش';
  if (diffMin < 60) return `${toPersianDigits(diffMin)} دقیقه پیش`;
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `${toPersianDigits(diffHour)} ساعت پیش`;
  const diffDay = Math.round(diffHour / 24);
  return `${toPersianDigits(diffDay)} روز پیش`;
}

export const QRCodeStudio: React.FC<QRCodeStudioProps> = ({
  cafeSlug,
  restaurantNameFa,
  restaurantNameEn,
  tableCount,
  tables,
  generalQrScans,
  brandLogoUrl,
  authHeaders,
  onMenuUpdated,
  onUnauthorized,
  onNotify,
}) => {
  const safeTableCount = Math.max(1, Math.min(200, Number(tableCount) || 1));

  const [viewMode, setViewMode] = useState<StudioViewMode>('sheet');
  const [selectedTable, setSelectedTable] = useState<number>(1);
  const [includeGeneralCard, setIncludeGeneralCard] = useState<boolean>(false);
  const [sheetColumns, setSheetColumns] = useState<SheetColumns>(3);
  const [qrThemeId, setQrThemeId] = useState<QrThemeId>('espresso');
  const [centerLogoMode, setCenterLogoMode] = useState<CenterLogoMode>('cup');
  const [customLogoDataUrl, setCustomLogoDataUrl] = useState<string>('');
  const [resolvedStoreLogoDataUrl, setResolvedStoreLogoDataUrl] = useState<string>('');
  const [showUrlOnCard, setShowUrlOnCard] = useState<boolean>(true);
  const [cardCaption, setCardCaption] = useState<string>(
    'برای مشاهده منو و ثبت سفارش اسکن کنید',
  );

  const [tableQrs, setTableQrs] = useState<TableQrEntry[]>([]);
  const [generalQr, setGeneralQr] = useState<TableQrEntry | null>(null);
  const [generatingQrs, setGeneratingQrs] = useState<boolean>(true);
  const [exportingSheet, setExportingSheet] = useState<boolean>(false);
  const [exportingTableNum, setExportingTableNum] = useState<number | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [refreshingStats, setRefreshingStats] = useState<boolean>(false);
  const [resettingStats, setResettingStats] = useState<boolean>(false);
  const [confirmResetStats, setConfirmResetStats] = useState<boolean>(false);
  const [printScope, setPrintScope] = useState<{
    mode: 'sheet' | 'single';
    tableNumber: number;
  } | null>(null);

  const logoInputRef = useRef<HTMLInputElement | null>(null);

  const activeTheme = useMemo(
    () => QR_COLOR_THEMES.find((t) => t.id === qrThemeId) ?? QR_COLOR_THEMES[0],
    [qrThemeId],
  );

  useEffect(() => {
    setSelectedTable((prev) => {
      if (prev === 0) return 0;
      return prev > safeTableCount ? 1 : prev;
    });
  }, [safeTableCount, cafeSlug]);

  // Preload store's brandLogoUrl safely into a DataURL for taint-free canvas export
  useEffect(() => {
    if (!brandLogoUrl) {
      setResolvedStoreLogoDataUrl('');
      return;
    }
    if (brandLogoUrl.startsWith('data:')) {
      setResolvedStoreLogoDataUrl(brandLogoUrl);
      return;
    }
    let cancelled = false;
    fetch(brandLogoUrl)
      .then((res) => (res.ok ? res.blob() : Promise.reject(new Error('logo fetch failed'))))
      .then(
        (blob) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
            reader.onerror = () => reject(new Error('read failed'));
            reader.readAsDataURL(blob);
          }),
      )
      .then((dataUrl) => {
        if (!cancelled && dataUrl) {
          setResolvedStoreLogoDataUrl(dataUrl);
        }
      })
      .catch(() => {
        if (!cancelled) setResolvedStoreLogoDataUrl('');
      });

    return () => {
      cancelled = true;
    };
  }, [brandLogoUrl]);

  // Refresh QR scan analytics cleanly when opening the studio
  const handleRefreshScanStats = useCallback(
    async (silent = false) => {
      if (!silent) setRefreshingStats(true);
      try {
        const res = await fetch('/api/admin/qr-stats', { headers: authHeaders });
        if (res.status === 401) {
          onUnauthorized();
          return;
        }
        if (!res.ok) return;
        const data = (await res.json()) as { menu?: MenuDatabase };
        if (data.menu) {
          onMenuUpdated(data.menu);
          if (!silent) onNotify?.('ok', 'آمار اسکن میزها به‌روزرسانی شد.');
        }
      } catch {
        if (!silent) onNotify?.('err', 'خطا در دریافت آمار اسکن میزها.');
      } finally {
        if (!silent) setRefreshingStats(false);
      }
    },
    [authHeaders, onMenuUpdated, onUnauthorized, onNotify],
  );

  useEffect(() => {
    void handleRefreshScanStats(true);
  }, [handleRefreshScanStats]);

  const handleResetScanStats = async () => {
    setResettingStats(true);
    try {
      const res = await fetch('/api/admin/qr-stats/reset', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({}),
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      if (!res.ok) {
        onNotify?.('err', 'بازنشانی آمار اسکن انجام نشد.');
        return;
      }
      const data = (await res.json()) as { menu?: MenuDatabase };
      if (data.menu) {
        onMenuUpdated(data.menu);
        setConfirmResetStats(false);
        onNotify?.('ok', 'شمارنده اسکن همه میزها صفر شد.');
      }
    } catch {
      onNotify?.('err', 'خطا در بازنشانی آمار اسکن.');
    } finally {
      setResettingStats(false);
    }
  };

  const scanStatsMap = useMemo(() => {
    const map = new Map<number, { count: number; lastScannedAt?: string }>();
    map.set(0, { count: generalQrScans || 0 });
    for (let i = 1; i <= safeTableCount; i++) {
      const t = tables.find((tbl) => tbl.number === i);
      map.set(i, {
        count: Math.max(0, t?.qrScans ?? 0),
        lastScannedAt: t?.lastScannedAt,
      });
    }
    return map;
  }, [tables, safeTableCount, generalQrScans]);

  const scanSummary = useMemo(() => {
    const perTable = Array.from({ length: safeTableCount }, (_, idx) => {
      const num = idx + 1;
      const stat = scanStatsMap.get(num) ?? { count: 0 };
      return {
        tableNumber: num,
        scans: stat.count,
        lastScannedAt: stat.lastScannedAt,
      };
    });
    const totalTableScans = perTable.reduce((acc, row) => acc + row.scans, 0);
    const totalAllScans = totalTableScans + (generalQrScans || 0);
    const maxScans = Math.max(1, ...perTable.map((r) => r.scans));
    const topTable = perTable.reduce(
      (best, curr) => (curr.scans > best.scans ? curr : best),
      perTable[0] ?? { tableNumber: 1, scans: 0 },
    );
    const activeScannedTables = perTable.filter((r) => r.scans > 0).length;

    return {
      perTable,
      totalTableScans,
      totalAllScans,
      maxScans,
      topTable,
      activeScannedTables,
    };
  }, [safeTableCount, scanStatsMap, generalQrScans]);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const buildTableUrl = useCallback(
    (tableNum: number): string => {
      if (!origin) return '';
      const encodedSlug = encodeURIComponent(cafeSlug);
      return tableNum > 0
        ? `${origin}/?cafe=${encodedSlug}&table=${tableNum}`
        : `${origin}/?cafe=${encodedSlug}&source=qr`;
    },
    [origin, cafeSlug],
  );

  const loadImage = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

  const activeCustomImageSrc =
    centerLogoMode === 'custom'
      ? customLogoDataUrl
      : centerLogoMode === 'store-logo'
        ? resolvedStoreLogoDataUrl
        : '';

  const renderQrWithCenterEmblem = useCallback(
    async (
      targetUrl: string,
      theme: QrThemePreset,
      logoMode: CenterLogoMode,
      imageDataSrc: string,
      cafeTitleEn: string,
    ): Promise<string> => {
      const baseDataUrl = await QRCode.toDataURL(targetUrl, {
        width: 640,
        margin: 2,
        color: {
          dark: theme.qrDark,
          light: theme.qrLight,
        },
        errorCorrectionLevel: 'H',
      });

      if (logoMode === 'none') {
        return baseDataUrl;
      }
      if ((logoMode === 'custom' || logoMode === 'store-logo') && !imageDataSrc) {
        return baseDataUrl;
      }

      const qrImg = await loadImage(baseDataUrl);
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 640;
      const ctx = canvas.getContext('2d');
      if (!ctx) return baseDataUrl;

      ctx.drawImage(qrImg, 0, 0, 640, 640);

      // Center badge covers ~21% of QR width — comfortably inside Level H 30% error tolerance
      const badgeSize = 136;
      const cx = 320;
      const cy = 320;
      const radius = 28;
      const bx = cx - badgeSize / 2;
      const by = cy - badgeSize / 2;

      const drawRoundedRect = (rx: number, ry: number, rw: number, rh: number, rr: number) => {
        ctx.beginPath();
        ctx.moveTo(rx + rr, ry);
        ctx.lineTo(rx + rw - rr, ry);
        ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + rr);
        ctx.lineTo(rx + rw, ry + rh - rr);
        ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - rr, ry + rh);
        ctx.lineTo(rx + rr, ry + rh);
        ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - rr);
        ctx.lineTo(rx, ry + rr);
        ctx.quadraticCurveTo(rx, ry, rx + rr, ry);
        ctx.closePath();
      };

      // Quiet-zone badge backing
      drawRoundedRect(bx, by, badgeSize, badgeSize, radius);
      ctx.fillStyle = theme.qrLight;
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.strokeStyle = theme.qrDark;
      ctx.stroke();

      if ((logoMode === 'custom' || logoMode === 'store-logo') && imageDataSrc) {
        try {
          const logoImg = await loadImage(imageDataSrc);
          const pad = 16;
          const innerSize = badgeSize - pad * 2;
          ctx.save();
          drawRoundedRect(bx + pad, by + pad, innerSize, innerSize, 18);
          ctx.clip();
          ctx.drawImage(logoImg, bx + pad, by + pad, innerSize, innerSize);
          ctx.restore();
        } catch {
          // Keep clean QR if image fails
        }
        return canvas.toDataURL('image/png');
      }

      if (logoMode === 'monogram') {
        const cleanLetter =
          (cafeTitleEn || restaurantNameFa || 'C').replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '').slice(0, 2).toUpperCase() ||
          'C';
        drawRoundedRect(bx + 12, by + 12, badgeSize - 24, badgeSize - 24, 20);
        ctx.fillStyle = theme.qrDark;
        ctx.fill();
        ctx.fillStyle = theme.qrLight;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 52px Georgia, serif';
        ctx.fillText(cleanLetter, cx, cy + 2);
        return canvas.toDataURL('image/png');
      }

      if (logoMode === 'bean') {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-0.42);
        ctx.fillStyle = theme.qrDark;
        ctx.beginPath();
        ctx.ellipse(0, 0, 28, 38, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = theme.qrLight;
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, -28);
        ctx.bezierCurveTo(-10, -8, 10, 8, 0, 28);
        ctx.stroke();
        ctx.restore();
        return canvas.toDataURL('image/png');
      }

      // Default: 'cup' espresso brand emblem
      ctx.save();
      ctx.fillStyle = theme.qrDark;
      ctx.strokeStyle = theme.qrDark;
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      // Cup body
      ctx.beginPath();
      ctx.moveTo(cx - 28, cy - 10);
      ctx.lineTo(cx + 22, cy - 10);
      ctx.lineTo(cx + 16, cy + 20);
      ctx.quadraticCurveTo(cx - 3, cy + 28, cx - 22, cy + 20);
      ctx.closePath();
      ctx.fill();
      // Cup handle
      ctx.beginPath();
      ctx.arc(cx + 23, cy + 4, 10, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
      // Saucer
      ctx.beginPath();
      ctx.moveTo(cx - 34, cy + 30);
      ctx.lineTo(cx + 28, cy + 30);
      ctx.stroke();
      // Steam wisps
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.moveTo(cx - 12, cy - 20);
      ctx.quadraticCurveTo(cx - 18, cy - 30, cx - 10, cy - 38);
      ctx.moveTo(cx + 4, cy - 20);
      ctx.quadraticCurveTo(cx - 2, cy - 30, cx + 6, cy - 38);
      ctx.stroke();
      ctx.restore();

      return canvas.toDataURL('image/png');
    },
    [restaurantNameFa],
  );

  useEffect(() => {
    if (!origin) return;
    let cancelled = false;
    setGeneratingQrs(true);

    const tableNumbers = Array.from({ length: safeTableCount }, (_, idx) => idx + 1);

    Promise.all([
      renderQrWithCenterEmblem(
        buildTableUrl(0),
        activeTheme,
        centerLogoMode,
        activeCustomImageSrc,
        restaurantNameEn,
      ).then((dataUrl) => ({
        tableNumber: 0,
        url: buildTableUrl(0),
        dataUrl,
      })),
      ...tableNumbers.map(async (num) => {
        const url = buildTableUrl(num);
        const dataUrl = await renderQrWithCenterEmblem(
          url,
          activeTheme,
          centerLogoMode,
          activeCustomImageSrc,
          restaurantNameEn,
        );
        return { tableNumber: num, url, dataUrl };
      }),
    ])
      .then(([generalEntry, ...tableEntries]) => {
        if (cancelled) return;
        setGeneralQr(generalEntry);
        setTableQrs(tableEntries);
      })
      .catch(() => {
        if (!cancelled) {
          setGeneralQr(null);
          setTableQrs([]);
          onNotify?.('err', 'خطا در تولید کدهای QR میزها.');
        }
      })
      .finally(() => {
        if (!cancelled) setGeneratingQrs(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    origin,
    safeTableCount,
    cafeSlug,
    activeTheme,
    centerLogoMode,
    activeCustomImageSrc,
    restaurantNameEn,
    buildTableUrl,
    renderQrWithCenterEmblem,
    onNotify,
  ]);

  const handleUploadCustomLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      onNotify?.('err', 'حجم لوگوی داخل QR نباید بیشتر از ۲ مگابایت باشد.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCustomLogoDataUrl(reader.result);
        setCenterLogoMode('custom');
        onNotify?.('ok', 'لوگوی اختصاصی به مرکز تمام کدهای QR اضافه شد.');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const sheetEntries = useMemo(() => {
    if (includeGeneralCard && generalQr) {
      return [generalQr, ...tableQrs];
    }
    return tableQrs;
  }, [includeGeneralCard, generalQr, tableQrs]);

  const activeSingleEntry = useMemo(() => {
    if (selectedTable === 0) return generalQr;
    return tableQrs.find((entry) => entry.tableNumber === selectedTable) ?? tableQrs[0] ?? null;
  }, [selectedTable, generalQr, tableQrs]);

  useEffect(() => {
    if (!printScope || typeof window === 'undefined') return;
    document.body.classList.add('printing-qr-sheet');

    const cleanup = () => {
      document.body.classList.remove('printing-qr-sheet');
      setPrintScope(null);
    };

    window.addEventListener('afterprint', cleanup, { once: true });

    const rafId = window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        window.print();
      }, 90);
    });

    const fallbackTimer = window.setTimeout(cleanup, 4000);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(fallbackTimer);
      window.removeEventListener('afterprint', cleanup);
      document.body.classList.remove('printing-qr-sheet');
    };
  }, [printScope]);

  const triggerDownload = (dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleCopy = async (key: string, url: string) => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedKey(key);
      onNotify?.('ok', 'لینک اختصاصی میز کپی شد.');
      window.setTimeout(() => {
        setCopiedKey((curr) => (curr === key ? null : curr));
      }, 1800);
    } catch {
      onNotify?.('err', 'کپی لینک انجام نشد.');
    }
  };

  const handleDownloadRawQr = (entry: TableQrEntry) => {
    const filename =
      entry.tableNumber > 0
        ? `${cafeSlug}-table-${entry.tableNumber}-qr.png`
        : `${cafeSlug}-menu-qr.png`;
    triggerDownload(entry.dataUrl, filename);
    onNotify?.(
      'ok',
      entry.tableNumber > 0
        ? `کد QR میز شماره ${toPersianDigits(entry.tableNumber)} دانلود شد.`
        : 'کد QR منوی عمومی دانلود شد.',
    );
  };

  const drawPrintableCardOnCanvas = async (
    ctx: CanvasRenderingContext2D,
    entry: TableQrEntry,
    x: number,
    y: number,
    w: number,
    h: number,
  ) => {
    const scale = w / 720;

    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = activeTheme.cardBg;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = activeTheme.cardBorder;
    ctx.lineWidth = Math.max(2, 3 * scale);
    ctx.setLineDash([12 * scale, 8 * scale]);
    ctx.strokeRect(4 * scale, 4 * scale, w - 8 * scale, h - 8 * scale);
    ctx.setLineDash([]);

    const bandH = 178 * scale;
    const inset = 22 * scale;
    ctx.fillStyle = activeTheme.headerBg;
    ctx.fillRect(inset, inset, w - inset * 2, bandH);

    if (activeTheme.minimalHeaderBorder) {
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = Math.max(1.5, 2 * scale);
      ctx.beginPath();
      ctx.moveTo(inset, inset + bandH);
      ctx.lineTo(w - inset, inset + bandH);
      ctx.stroke();
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = activeTheme.headerSub;
    ctx.font = `bold ${Math.round(22 * scale)}px Georgia, serif`;
    ctx.fillText(
      (restaurantNameEn || cafeSlug).toUpperCase(),
      w / 2,
      inset + 58 * scale,
      w - inset * 4,
    );

    ctx.fillStyle = activeTheme.headerText;
    ctx.font = `bold ${Math.round(42 * scale)}px Vazirmatn, sans-serif`;
    ctx.fillText(restaurantNameFa, w / 2, inset + 126 * scale, w - inset * 4);

    ctx.fillStyle = activeTheme.titleColor;
    ctx.font = `bold ${Math.round(36 * scale)}px Vazirmatn, sans-serif`;
    const tableTitle =
      entry.tableNumber > 0
        ? `میز شماره ${toPersianDigits(entry.tableNumber)}`
        : 'منوی دیجیتال کافه';
    ctx.fillText(tableTitle, w / 2, 272 * scale);

    const qrSize = 440 * scale;
    const qrX = (w - qrSize) / 2;
    const qrY = 316 * scale;
    const qrPad = 18 * scale;

    ctx.fillStyle = activeTheme.qrLight;
    ctx.fillRect(qrX - qrPad, qrY - qrPad, qrSize + qrPad * 2, qrSize + qrPad * 2);
    ctx.strokeStyle = activeTheme.cardBorder;
    ctx.lineWidth = Math.max(1.5, 3 * scale);
    ctx.strokeRect(qrX - qrPad, qrY - qrPad, qrSize + qrPad * 2, qrSize + qrPad * 2);

    const qrImg = await loadImage(entry.dataUrl);
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

    ctx.fillStyle = activeTheme.titleColor;
    ctx.font = `bold ${Math.round(25 * scale)}px Vazirmatn, sans-serif`;
    ctx.fillText(
      cardCaption.trim() || 'برای مشاهده منو و ثبت سفارش اسکن کنید',
      w / 2,
      842 * scale,
      w - 72 * scale,
    );

    if (showUrlOnCard) {
      ctx.fillStyle = activeTheme.footerText;
      ctx.font = `${Math.round(17 * scale)}px monospace`;
      const shortPath =
        entry.tableNumber > 0
          ? `/?cafe=${cafeSlug}&table=${entry.tableNumber}`
          : `/?cafe=${cafeSlug}&source=qr`;
      ctx.fillText(shortPath, w / 2, 898 * scale, w - 64 * scale);
    }

    ctx.restore();
  };

  const handleDownloadPrintableCard = async (entry: TableQrEntry) => {
    setExportingTableNum(entry.tableNumber);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 720;
      canvas.height = 960;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      await drawPrintableCardOnCanvas(ctx, entry, 0, 0, canvas.width, canvas.height);

      const url = canvas.toDataURL('image/png');
      const filename =
        entry.tableNumber > 0
          ? `${cafeSlug}-table-${entry.tableNumber}-printable-sheet.png`
          : `${cafeSlug}-general-menu-printable-sheet.png`;
      triggerDownload(url, filename);
      onNotify?.(
        'ok',
        entry.tableNumber > 0
          ? `برگه چاپی میز شماره ${toPersianDigits(entry.tableNumber)} دانلود شد.`
          : 'برگه چاپی منوی عمومی دانلود شد.',
      );
    } catch {
      onNotify?.('err', 'خطا در آماده‌سازی فایل چاپی میز.');
    } finally {
      setExportingTableNum(null);
    }
  };

  const handleDownloadFullSheetPng = async () => {
    if (sheetEntries.length === 0) return;
    setExportingSheet(true);
    try {
      const cols = sheetColumns;
      const rows = Math.ceil(sheetEntries.length / cols);
      const cardW = cols === 2 ? 540 : 420;
      const cardH = Math.round(cardW * (960 / 720));
      const gap = 32;
      const pad = 48;
      const headerH = 100;

      const canvas = document.createElement('canvas');
      canvas.width = pad * 2 + cols * cardW + (cols - 1) * gap;
      canvas.height = pad * 2 + headerH + rows * cardH + (rows - 1) * gap;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = activeTheme.id === 'minimal' ? '#FFFFFF' : '#F4EDE0';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.textAlign = 'center';
      ctx.fillStyle = activeTheme.qrDark;
      ctx.font = 'bold 34px Vazirmatn, sans-serif';
      ctx.fillText(
        `برگه چاپی کدهای QR میزهای ${restaurantNameFa}`,
        canvas.width / 2,
        pad + 38,
      );

      ctx.fillStyle = activeTheme.footerText;
      ctx.font = '20px Vazirmatn, sans-serif';
      ctx.fillText(
        `${toPersianDigits(sheetEntries.length)} کارت آماده برش · خطوط نقطه‌چین محل برش هر میز است`,
        canvas.width / 2,
        pad + 76,
      );

      for (let i = 0; i < sheetEntries.length; i++) {
        const entry = sheetEntries[i];
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = pad + col * (cardW + gap);
        const y = pad + headerH + row * (cardH + gap);
        await drawPrintableCardOnCanvas(ctx, entry, x, y, cardW, cardH);
      }

      const sheetDataUrl = canvas.toDataURL('image/png');
      triggerDownload(sheetDataUrl, `${cafeSlug}-tables-qr-printable-sheet.png`);
      onNotify?.(
        'ok',
        `برگه چاپی کامل برای ${toPersianDigits(sheetEntries.length)} کارت دانلود شد.`,
      );
    } catch {
      onNotify?.('err', 'خطا در تولید برگه چاپی یکپارچه.');
    } finally {
      setExportingSheet(false);
    }
  };

  const printEntries = useMemo(() => {
    if (!printScope) return [];
    if (printScope.mode === 'single') {
      const found =
        printScope.tableNumber === 0
          ? generalQr
          : tableQrs.find((e) => e.tableNumber === printScope.tableNumber);
      return found ? [found] : [];
    }
    return sheetEntries;
  }, [printScope, generalQr, tableQrs, sheetEntries]);

  return (
    <div className="space-y-6">
      {/* Studio Top Bar & Mode Switch */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-dashed border-[#2B1B12]/15 pb-5">
        <div>
          <p className="mb-1 text-xs font-bold text-[#96522B]">
            استودیو چاپ و آمار اسکن QR میزها · {toPersianDigits(safeTableCount)} میز فعال
          </p>
          <h2 className="text-xl font-extrabold text-[#2B1B12] sm:text-2xl">
            ساخت برگه‌های چاپی QR و پایش اسکن هر میز
          </h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[#6A574A] sm:text-sm">
            رنگ‌بندی و لوگوی مرکزی کد QR را متناسب با برند کافه تنظیم کنید، برگه‌های چاپی میزها را
            دانلود کنید و تعداد اسکن واقعی هر میز را لحظه‌ای ببینید.
          </p>
        </div>

        <div className="paper-sheet-kraft flex shrink-0 items-center gap-1 rounded-xl p-1">
          <button
            type="button"
            onClick={() => setViewMode('sheet')}
            className={`inline-flex min-h-[38px] items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors ${
              viewMode === 'sheet' ? 'btn-paper-primary' : 'text-[#5A483C] hover:text-[#2B1B12]'
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span>برگه همه میزها ({toPersianDigits(safeTableCount)})</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('single')}
            className={`inline-flex min-h-[38px] items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors ${
              viewMode === 'single' ? 'btn-paper-primary' : 'text-[#5A483C] hover:text-[#2B1B12]'
            }`}
          >
            <QrCode className="h-3.5 w-3.5" />
            <span>کارت تکی یک میز</span>
          </button>
        </div>
      </div>

      {/* Live QR Scans Per Table Bar Chart & Metrics */}
      <div className="paper-sheet-kraft rounded-2xl border border-[#2B1B12]/10 p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="paper-sheet flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#96522B]">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[#2B1B12]">
                آمار و نمودار اسکن به تفکیک هر میز
              </h3>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[#6A574A]">
                <span className="tabular-nums font-bold text-[#2B1B12]">
                  مجموع: {toPersianDigits(scanSummary.totalAllScans)} اسکن
                </span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">
                  {toPersianDigits(scanSummary.activeScannedTables)} میز اسکن‌شده
                </span>
                {scanSummary.topTable && scanSummary.topTable.scans > 0 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums font-semibold text-[#96522B]">
                      پراسکن‌ترین: میز {toPersianDigits(scanSummary.topTable.tableNumber)} (
                      {toPersianDigits(scanSummary.topTable.scans)})
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={refreshingStats}
              onClick={() => void handleRefreshScanStats(false)}
              className="btn-paper-cream inline-flex min-h-[34px] items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-bold disabled:opacity-55"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshingStats ? 'animate-spin' : ''}`} />
              <span>به‌روزرسانی</span>
            </button>

            {confirmResetStats ? (
              <div className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-800">
                <span>صفر شوند؟</span>
                <button
                  type="button"
                  disabled={resettingStats}
                  onClick={() => void handleResetScanStats()}
                  className="rounded-lg bg-rose-700 px-2 py-0.5 text-[11px] font-bold text-white hover:bg-rose-800"
                >
                  {resettingStats ? '...' : 'بله'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmResetStats(false)}
                  className="rounded-lg bg-white px-2 py-0.5 text-[11px] font-bold text-slate-700"
                >
                  خیر
                </button>
              </div>
            ) : (
              scanSummary.totalAllScans > 0 && (
                <button
                  type="button"
                  onClick={() => setConfirmResetStats(true)}
                  className="btn-paper-cream inline-flex min-h-[34px] items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-bold text-rose-700"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>صفر کردن آمار</span>
                </button>
              )
            )}
          </div>
        </div>

        {/* Clean Tabular Column Bar Chart for Each Table */}
        <div className="paper-sheet rounded-xl p-3.5 sm:p-4">
          <div className="no-scrollbar flex items-end gap-2 overflow-x-auto pb-1 pt-2">
            {scanSummary.perTable.map((row) => {
              const heightPct =
                row.scans === 0
                  ? 6
                  : Math.max(16, Math.round((row.scans / scanSummary.maxScans) * 100));
              const isSelected = viewMode === 'single' && selectedTable === row.tableNumber;

              return (
                <button
                  key={`scan-bar-${row.tableNumber}`}
                  type="button"
                  onClick={() => {
                    setSelectedTable(row.tableNumber);
                    setViewMode('single');
                  }}
                  title={`میز ${row.tableNumber}: ${row.scans} اسکن (${formatRelativeScanTime(row.lastScannedAt)})`}
                  className={`group flex min-w-[38px] flex-1 flex-col items-center gap-1 rounded-lg px-1 py-1 transition-colors ${
                    isSelected ? 'bg-[#2B1B12]/8' : 'hover:bg-[#2B1B12]/5'
                  }`}
                >
                  <span className="tabular-nums text-[10px] font-extrabold text-[#5A483C]">
                    {toPersianDigits(row.scans)}
                  </span>
                  <div className="flex h-16 w-full max-w-[24px] items-end justify-center rounded-md bg-[#E9DEC9]/45 p-0.5">
                    <div
                      style={{
                        height: `${heightPct}%`,
                        backgroundColor:
                          row.scans > 0 ? activeTheme.headerBg : 'rgba(106, 87, 74, 0.25)',
                      }}
                      className="w-full rounded-sm transition-all duration-300"
                    />
                  </div>
                  <span className="tabular-nums text-[10px] font-bold text-[#2B1B12]">
                    م{toPersianDigits(row.tableNumber)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* QR Visual Customizer: Color Theme + Center Logo + Sheet Layout */}
      <div className="paper-sheet-kraft space-y-4 rounded-2xl p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* 1. Color Theme Picker */}
          <div className="lg:col-span-6">
            <span className="mb-2 block text-xs font-bold text-[#2B1B12]">
              تم رنگی کد QR و برگه چاپی
            </span>
            <div className="flex flex-wrap gap-2">
              {QR_COLOR_THEMES.map((theme) => {
                const isActive = theme.id === qrThemeId;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setQrThemeId(theme.id)}
                    className={`inline-flex min-h-[38px] items-center gap-2 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                      isActive ? 'btn-paper-primary' : 'btn-paper-cream'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 rounded-full border border-white/60 shadow-xs"
                      style={{
                        background: `linear-gradient(135deg, ${theme.qrDark} 55%, ${theme.headerSub} 55%)`,
                      }}
                    />
                    <span>{theme.labelFa}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Center Brand Icon / Custom Logo Selector */}
          <div className="lg:col-span-6">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-[#2B1B12]">
                آیکون یا لوگوی مرکز کد QR
              </span>
              <div className="flex items-center gap-2">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleUploadCustomLogo}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="btn-paper-cream inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-bold text-[#96522B]"
                >
                  <Upload className="h-3 w-3" />
                  <span>{customLogoDataUrl ? 'تغییر لوگو' : 'آپلود لوگو'}</span>
                </button>
                {customLogoDataUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomLogoDataUrl('');
                      if (centerLogoMode === 'custom') setCenterLogoMode('cup');
                    }}
                    aria-label="حذف لوگوی آپلودی"
                    className="btn-paper-cream flex h-6 w-6 items-center justify-center rounded-lg text-rose-700"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {(
                [
                  { id: 'none', label: 'بدون لوگو' },
                  { id: 'cup', label: 'آیکون فنجان' },
                  { id: 'bean', label: 'آیکون دانه قهوه' },
                  { id: 'monogram', label: 'مونوگرام برند' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setCenterLogoMode(opt.id)}
                  className={`min-h-[36px] whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-bold ${
                    centerLogoMode === opt.id ? 'btn-paper-terracotta' : 'btn-paper-cream'
                  }`}
                >
                  {opt.label}
                </button>
              ))}

              {resolvedStoreLogoDataUrl && (
                <button
                  type="button"
                  onClick={() => setCenterLogoMode('store-logo')}
                  className={`inline-flex min-h-[36px] items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-bold ${
                    centerLogoMode === 'store-logo' ? 'btn-paper-terracotta' : 'btn-paper-cream'
                  }`}
                >
                  <img
                    src={resolvedStoreLogoDataUrl}
                    alt="لوگوی کافه"
                    className="h-4 w-4 rounded-sm object-cover"
                  />
                  <span>لوگوی فعلی کافه</span>
                </button>
              )}

              {customLogoDataUrl && (
                <button
                  type="button"
                  onClick={() => setCenterLogoMode('custom')}
                  className={`inline-flex min-h-[36px] items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-bold ${
                    centerLogoMode === 'custom' ? 'btn-paper-terracotta' : 'btn-paper-cream'
                  }`}
                >
                  <img
                    src={customLogoDataUrl}
                    alt="لوگوی سفارشی"
                    className="h-4 w-4 rounded-sm object-cover"
                  />
                  <span>لوگوی آپلودشده</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 3. Caption, Grid Columns & Display Toggles */}
        <div className="grid grid-cols-1 gap-4 border-t border-dashed border-[#2B1B12]/15 pt-4 md:grid-cols-12 md:items-end">
          <div className="md:col-span-6">
            <label
              htmlFor="qr-card-caption-input"
              className="mb-1.5 block text-xs font-bold text-[#2B1B12]"
            >
              متن راهنمای پایین کارت چاپی
            </label>
            <input
              id="qr-card-caption-input"
              type="text"
              maxLength={90}
              value={cardCaption}
              onChange={(e) => setCardCaption(e.target.value)}
              placeholder="برای مشاهده منو و ثبت سفارش اسکن کنید"
              className="paper-recess w-full rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#2B1B12] focus:outline-2 focus:outline-[#2B1B12]"
            />
          </div>

          {viewMode === 'sheet' && (
            <div className="md:col-span-3">
              <span className="mb-1.5 block text-xs font-bold text-[#2B1B12]">چیدمان برگه A4</span>
              <div className="paper-sheet flex items-center gap-1 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setSheetColumns(2)}
                  className={`flex-1 whitespace-nowrap rounded-lg px-2 py-1.5 tabular-nums text-xs font-bold transition-colors ${
                    sheetColumns === 2
                      ? 'btn-paper-primary'
                      : 'text-[#5A483C] hover:text-[#2B1B12]'
                  }`}
                >
                  ۲ ستون
                </button>
                <button
                  type="button"
                  onClick={() => setSheetColumns(3)}
                  className={`flex-1 whitespace-nowrap rounded-lg px-2 py-1.5 tabular-nums text-xs font-bold transition-colors ${
                    sheetColumns === 3
                      ? 'btn-paper-primary'
                      : 'text-[#5A483C] hover:text-[#2B1B12]'
                  }`}
                >
                  ۳ ستون
                </button>
              </div>
            </div>
          )}

          <div
            className={`flex flex-wrap items-center gap-4 pb-1.5 ${
              viewMode === 'sheet' ? 'md:col-span-3 md:justify-end' : 'md:col-span-6 md:justify-end'
            }`}
          >
            <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-[#2B1B12]">
              <input
                type="checkbox"
                checked={showUrlOnCard}
                onChange={(e) => setShowUrlOnCard(e.target.checked)}
                className="h-4 w-4 accent-[#2B1B12]"
              />
              <span>نمایش لینک</span>
            </label>
            {viewMode === 'sheet' && (
              <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-[#2B1B12]">
                <input
                  type="checkbox"
                  checked={includeGeneralCard}
                  onChange={(e) => setIncludeGeneralCard(e.target.checked)}
                  className="h-4 w-4 accent-[#2B1B12]"
                />
                <span>کارت عمومی</span>
              </label>
            )}
          </div>
        </div>
      </div>

      {/* VIEW 1: ALL TABLES PRINTABLE SHEET STUDIO */}
      {viewMode === 'sheet' ? (
        <div className="space-y-5">
          {/* Batch Print & Download Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#2B1B12]/10 bg-[#FAF6EE] px-4 py-3.5">
            <div className="text-xs font-semibold text-[#5A483C]">
              <span className="font-extrabold text-[#2B1B12]">
                {toPersianDigits(sheetEntries.length)} برگه آماده چاپ
              </span>
              <span aria-hidden="true"> · </span>
              <span>لینک هر میز به‌صورت خودکار شماره میز را انتخاب و اسکن را ثبت می‌کند</span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                disabled={generatingQrs || exportingSheet || sheetEntries.length === 0}
                onClick={() => void handleDownloadFullSheetPng()}
                className="btn-paper-primary inline-flex min-h-[42px] items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-55"
              >
                <Download className="h-4 w-4 text-[#E5A77B]" />
                <span>
                  {exportingSheet
                    ? 'در حال ساخت برگه یکپارچه...'
                    : 'دانلود برگه چاپی همه میزها (PNG)'}
                </span>
              </button>

              <button
                type="button"
                disabled={generatingQrs || sheetEntries.length === 0}
                onClick={() => setPrintScope({ mode: 'sheet', tableNumber: 0 })}
                className="btn-paper-terracotta inline-flex min-h-[42px] items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-55"
              >
                <Printer className="h-4 w-4" />
                <span>چاپ A4 / ذخیره PDF همه میزها</span>
              </button>
            </div>
          </div>

          {generatingQrs ? (
            <div className="paper-recess rounded-2xl p-12 text-center text-xs font-bold text-[#6A574A]">
              در حال رندر کدهای QR رنگی و لوگودار برای {toPersianDigits(safeTableCount)} میز...
            </div>
          ) : (
            <div
              className={`grid grid-cols-1 gap-5 sm:grid-cols-2 ${
                sheetColumns === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'
              }`}
            >
              {sheetEntries.map((entry) => {
                const isBusy = exportingTableNum === entry.tableNumber;
                const stat = scanStatsMap.get(entry.tableNumber) ?? { count: 0 };
                const scanRatio =
                  entry.tableNumber > 0
                    ? Math.min(100, Math.round((stat.count / scanSummary.maxScans) * 100))
                    : 0;

                return (
                  <div
                    key={`table-sheet-${entry.tableNumber}`}
                    style={{
                      backgroundColor: activeTheme.cardBg,
                      borderColor: activeTheme.cardBorder,
                    }}
                    className="relative flex flex-col justify-between rounded-2xl border-2 border-dashed p-4 text-[#2B1B12]"
                  >
                    <div>
                      <div
                        style={{
                          backgroundColor: activeTheme.headerBg,
                          color: activeTheme.headerText,
                          borderBottom: activeTheme.minimalHeaderBorder
                            ? '1px solid #cbd5e1'
                            : undefined,
                        }}
                        className="rounded-xl px-3.5 py-3 text-center"
                      >
                        <div
                          style={{ color: activeTheme.headerSub }}
                          className="font-display-serif text-[10px] tracking-[0.2em]"
                        >
                          {(restaurantNameEn || cafeSlug).toUpperCase()}
                        </div>
                        <div className="mt-0.5 text-sm font-extrabold">{restaurantNameFa}</div>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-2 px-1">
                        <span
                          style={{ color: activeTheme.titleColor }}
                          className="tabular-nums text-sm font-extrabold"
                        >
                          {entry.tableNumber > 0
                            ? `میز شماره ${toPersianDigits(entry.tableNumber)}`
                            : 'منوی دیجیتال عمومی'}
                        </span>
                        <a
                          href={entry.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#6A574A] hover:text-[#2B1B12] hover:underline"
                        >
                          <span>تست میز</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>

                      <div className="mx-auto my-3 flex aspect-square w-40 items-center justify-center rounded-xl border border-[#2B1B12]/12 bg-white p-2">
                        <img
                          src={entry.dataUrl}
                          alt={
                            entry.tableNumber > 0
                              ? `کد QR میز شماره ${entry.tableNumber}`
                              : 'کد QR منوی کافه'
                          }
                          className="h-full w-full object-contain"
                        />
                      </div>

                      <p
                        style={{ color: activeTheme.footerText }}
                        className="px-2 text-center text-[11px] font-semibold leading-relaxed"
                      >
                        {cardCaption.trim() || 'برای مشاهده منو و ثبت سفارش اسکن کنید'}
                      </p>

                      {showUrlOnCard && (
                        <code
                          dir="ltr"
                          style={{ color: activeTheme.footerText }}
                          className="mt-2 block truncate rounded-lg bg-black/[0.04] px-2 py-1 text-center font-mono text-[10px]"
                        >
                          {entry.tableNumber > 0
                            ? `/?cafe=${cafeSlug}&table=${entry.tableNumber}`
                            : `/?cafe=${cafeSlug}&source=qr`}
                        </code>
                      )}
                    </div>

                    {/* Scan Counter Readout + Download Links */}
                    <div className="mt-4 space-y-2.5 border-t border-dashed border-[#2B1B12]/15 pt-3">
                      <div className="space-y-1 px-0.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="tabular-nums font-extrabold text-[#2B1B12]">
                            {toPersianDigits(stat.count)} اسکن ثبت‌شده
                          </span>
                          <span className="text-[10px] text-[#6A574A]">
                            {entry.tableNumber > 0
                              ? formatRelativeScanTime(stat.lastScannedAt)
                              : 'اسکن عمومی'}
                          </span>
                        </div>
                        {entry.tableNumber > 0 && (
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/[0.07]">
                            <div
                              style={{
                                width: `${stat.count > 0 ? Math.max(8, scanRatio) : 0}%`,
                                backgroundColor: activeTheme.headerBg,
                              }}
                              className="h-full rounded-full transition-all duration-300"
                            />
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void handleDownloadPrintableCard(entry)}
                        className="btn-paper-primary flex w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-bold disabled:opacity-55"
                      >
                        <Download className="h-3.5 w-3.5 text-[#E5A77B]" />
                        <span>
                          {isBusy ? 'در حال ساخت فایل...' : 'دانلود برگه چاپی این میز (PNG)'}
                        </span>
                      </button>

                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleDownloadRawQr(entry)}
                          className="btn-paper-cream inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-lg px-2 py-1.5 text-[11px] font-bold"
                          title="دانلود فقط تصویر مربع کد QR"
                        >
                          <QrCode className="h-3 w-3" />
                          <span>فقط QR</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setPrintScope({ mode: 'single', tableNumber: entry.tableNumber })
                          }
                          className="btn-paper-cream inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-lg px-2 py-1.5 text-[11px] font-bold"
                          title="چاپ یا ذخیره PDF کارت همین میز"
                        >
                          <Printer className="h-3 w-3" />
                          <span>چاپ تکی</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => void handleCopy(`tbl-${entry.tableNumber}`, entry.url)}
                          className="btn-paper-cream inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-lg px-2 py-1.5 text-[11px] font-bold"
                          title="کپی آدرس مستقیم میز"
                        >
                          {copiedKey === `tbl-${entry.tableNumber}` ? (
                            <Check className="h-3 w-3 text-[#5C7247]" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                          <span>{copiedKey === `tbl-${entry.tableNumber}` ? 'کپی شد' : 'لینک'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* VIEW 2: SINGLE TABLE PRINTABLE CARD STUDIO */
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
          <div className="space-y-5 lg:col-span-7">
            <div className="space-y-2">
              <label htmlFor="qr-table-picker" className="block text-xs font-bold text-[#2B1B12]">
                انتخاب شماره میز برای پیش‌نمایش و دانلود کارت چاپی
              </label>
              <select
                id="qr-table-picker"
                value={selectedTable}
                onChange={(e) => setSelectedTable(Number(e.target.value))}
                className="paper-recess w-full rounded-xl px-4 py-3 text-sm font-semibold text-[#2B1B12] focus:outline-2 focus:outline-[#2B1B12]"
              >
                <option value={0}>منوی عمومی کافه (بدون شماره میز)</option>
                {Array.from({ length: safeTableCount }, (_, idx) => idx + 1).map((num) => (
                  <option key={num} value={num}>
                    میز شماره {toPersianDigits(num)} (
                    {toPersianDigits(scanStatsMap.get(num)?.count ?? 0)} اسکن)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: Math.min(safeTableCount, 18) }, (_, idx) => idx + 1).map(
                (num) => {
                  const count = scanStatsMap.get(num)?.count ?? 0;
                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setSelectedTable(num)}
                      className={`tabular-nums min-w-[46px] whitespace-nowrap rounded-xl px-2.5 py-1.5 text-xs font-bold ${
                        selectedTable === num ? 'btn-paper-terracotta' : 'btn-paper-cream'
                      }`}
                    >
                      میز {toPersianDigits(num)}
                      {count > 0 ? ` · ${toPersianDigits(count)}` : ''}
                    </button>
                  );
                },
              )}
            </div>

            {activeSingleEntry && (
              <>
                <div className="paper-sheet-kraft space-y-2 rounded-2xl p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-[#6A574A]">لینک مقصد اسکن QR</span>
                    <span className="tabular-nums font-extrabold text-[#96522B]">
                      {toPersianDigits(scanStatsMap.get(activeSingleEntry.tableNumber)?.count ?? 0)}{' '}
                      اسکن ·{' '}
                      {activeSingleEntry.tableNumber > 0
                        ? formatRelativeScanTime(
                            scanStatsMap.get(activeSingleEntry.tableNumber)?.lastScannedAt,
                          )
                        : 'منوی عمومی'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <code
                      dir="ltr"
                      className="min-w-0 flex-1 truncate text-xs font-semibold text-[#2B1B12]"
                    >
                      {activeSingleEntry.url}
                    </code>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => void handleCopy('single', activeSingleEntry.url)}
                        className="btn-paper-cream inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-bold"
                      >
                        {copiedKey === 'single' ? (
                          <Check className="h-3.5 w-3.5 text-[#5C7247]" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                        <span>{copiedKey === 'single' ? 'کپی شد' : 'کپی لینک'}</span>
                      </button>

                      <a
                        href={activeSingleEntry.url}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-paper-cream inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-bold"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>باز کردن</span>
                      </a>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    disabled={exportingTableNum === activeSingleEntry.tableNumber}
                    onClick={() => void handleDownloadPrintableCard(activeSingleEntry)}
                    className="btn-paper-primary inline-flex min-h-[44px] items-center gap-2 whitespace-nowrap rounded-xl px-5 py-2.5 text-xs font-bold disabled:opacity-50 sm:text-sm"
                  >
                    <Download className="h-4 w-4 text-[#E5A77B]" />
                    <span>
                      {exportingTableNum === activeSingleEntry.tableNumber
                        ? 'در حال آماده‌سازی...'
                        : 'دانلود برگه چاپی میز (PNG)'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownloadRawQr(activeSingleEntry)}
                    className="btn-paper-kraft inline-flex min-h-[44px] items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-bold sm:text-sm"
                  >
                    <QrCode className="h-4 w-4" />
                    <span>دانلود فقط QR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setPrintScope({
                        mode: 'single',
                        tableNumber: activeSingleEntry.tableNumber,
                      })
                    }
                    className="btn-paper-terracotta inline-flex min-h-[44px] items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-bold sm:text-sm"
                  >
                    <Printer className="h-4 w-4" />
                    <span>چاپ یا PDF کارت میز</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Printable Table Tent Live Preview */}
          <div className="flex justify-center lg:col-span-5">
            {activeSingleEntry && (
              <div className="relative w-full max-w-[300px]">
                <div
                  aria-hidden="true"
                  className="paper-sheet-kraft pointer-events-none absolute -bottom-2 inset-x-3 top-3 rounded-3xl"
                />
                <div
                  style={{
                    backgroundColor: activeTheme.cardBg,
                    borderColor: activeTheme.cardBorder,
                  }}
                  className="relative overflow-hidden rounded-3xl border-2 border-dashed text-center text-[#2B1B12]"
                >
                  <div
                    style={{
                      backgroundColor: activeTheme.headerBg,
                      color: activeTheme.headerText,
                      borderBottom: activeTheme.minimalHeaderBorder
                        ? '1px solid #cbd5e1'
                        : undefined,
                    }}
                    className="px-5 py-5"
                  >
                    <div
                      style={{ color: activeTheme.headerSub }}
                      className="font-display-serif text-xs tracking-[0.22em]"
                    >
                      {(restaurantNameEn || cafeSlug).toUpperCase()}
                    </div>
                    <h3 className="mt-1 text-xl font-extrabold">{restaurantNameFa}</h3>
                  </div>

                  <div className="p-6">
                    <p
                      style={{ color: activeTheme.titleColor }}
                      className="tabular-nums text-xs font-extrabold"
                    >
                      {activeSingleEntry.tableNumber > 0
                        ? `میز شماره ${toPersianDigits(activeSingleEntry.tableNumber)}`
                        : 'منوی دیجیتال سه‌بعدی'}
                    </p>

                    <div className="mx-auto my-4 flex aspect-square w-48 items-center justify-center rounded-2xl border border-[#2B1B12]/15 bg-white p-3">
                      <img
                        src={activeSingleEntry.dataUrl}
                        alt="کد QR منوی رستوران"
                        className="h-full w-full rounded-xl object-contain"
                      />
                    </div>

                    <p
                      style={{ color: activeTheme.footerText }}
                      className="text-xs font-semibold"
                    >
                      {cardCaption.trim() || 'دوربین موبایل را برای مشاهده منو اسکن کنید'}
                    </p>

                    {showUrlOnCard && (
                      <code
                        dir="ltr"
                        style={{ color: activeTheme.footerText }}
                        className="mt-2.5 block truncate font-mono text-[10px]"
                      >
                        {activeSingleEntry.tableNumber > 0
                          ? `/?cafe=${cafeSlug}&table=${activeSingleEntry.tableNumber}`
                          : `/?cafe=${cafeSlug}&source=qr`}
                      </code>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Isolated A4 Printable Portal Root */}
      {typeof document !== 'undefined' &&
        printScope &&
        printEntries.length > 0 &&
        createPortal(
          <div id="admin-qr-print-root" className="hidden print:block" dir="rtl">
            <div className="mb-4 border-b border-slate-300 pb-3 text-center">
              <h1 className="text-lg font-extrabold text-[#111111]">
                برگه چاپی کدهای QR میزهای {restaurantNameFa}
              </h1>
              <p className="mt-0.5 text-xs text-slate-600">
                {restaurantNameEn || cafeSlug} · {toPersianDigits(printEntries.length)} کارت آماده برش
              </p>
            </div>

            <div
              className={`grid gap-4 ${
                printScope.mode === 'single'
                  ? 'mx-auto max-w-[360px] grid-cols-1'
                  : sheetColumns === 2
                    ? 'grid-cols-2'
                    : 'grid-cols-3'
              }`}
            >
              {printEntries.map((entry) => (
                <div
                  key={`print-card-${entry.tableNumber}`}
                  style={{
                    backgroundColor: activeTheme.cardBg,
                    borderColor: activeTheme.cardBorder,
                  }}
                  className="qr-print-card rounded-2xl border-2 border-dashed p-4 text-center"
                >
                  <div
                    style={{
                      backgroundColor: activeTheme.headerBg,
                      color: activeTheme.headerText,
                      borderBottom: activeTheme.minimalHeaderBorder
                        ? '1px solid #cbd5e1'
                        : undefined,
                    }}
                    className="rounded-xl px-3 py-2.5"
                  >
                    <div
                      style={{ color: activeTheme.headerSub }}
                      className="font-display-serif text-[10px] tracking-[0.2em]"
                    >
                      {(restaurantNameEn || cafeSlug).toUpperCase()}
                    </div>
                    <div className="text-sm font-extrabold">{restaurantNameFa}</div>
                  </div>

                  <div
                    style={{ color: activeTheme.titleColor }}
                    className="mt-2.5 tabular-nums text-sm font-extrabold"
                  >
                    {entry.tableNumber > 0
                      ? `میز شماره ${toPersianDigits(entry.tableNumber)}`
                      : 'منوی دیجیتال کافه'}
                  </div>

                  <div className="mx-auto my-2.5 flex aspect-square w-36 items-center justify-center rounded-xl border border-slate-300 bg-white p-2">
                    <img
                      src={entry.dataUrl}
                      alt={`کد QR میز ${entry.tableNumber}`}
                      className="h-full w-full object-contain"
                    />
                  </div>

                  <p
                    style={{ color: activeTheme.footerText }}
                    className="text-[11px] font-semibold"
                  >
                    {cardCaption.trim() || 'برای مشاهده منو و ثبت سفارش اسکن کنید'}
                  </p>

                  {showUrlOnCard && (
                    <code
                      dir="ltr"
                      style={{ color: activeTheme.footerText }}
                      className="mt-1.5 block truncate font-mono text-[9px]"
                    >
                      {entry.tableNumber > 0
                        ? `/?cafe=${cafeSlug}&table=${entry.tableNumber}`
                        : `/?cafe=${cafeSlug}&source=qr`}
                    </code>
                  )}
                </div>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};
