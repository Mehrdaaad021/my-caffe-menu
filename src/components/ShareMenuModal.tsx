import React, { useEffect, useMemo, useState } from 'react';
import { Check, Copy, MessageSquare, Send, Share2, X } from '@/src/components/ClayCafeIcons';

interface ShareMenuModalProps {
  open: boolean;
  cafeNameFa: string;
  cafeNameEn: string;
  cafeSlug: string;
  tableNumber: number | null;
  onClose: () => void;
}

export const ShareMenuModal: React.FC<ShareMenuModalProps> = ({
  open,
  cafeNameFa,
  cafeNameEn,
  cafeSlug,
  tableNumber,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [nativeShared, setNativeShared] = useState(false);

  useEffect(() => {
    if (!open) {
      setCopied(false);
      setNativeShared(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const url = new URL(window.location.origin);
    if (cafeSlug) {
      url.searchParams.set('cafe', cafeSlug);
    }
    if (tableNumber) {
      url.searchParams.set('table', String(tableNumber));
    }
    return url.toString();
  }, [cafeSlug, tableNumber]);

  const shareMessage = useMemo(
    () =>
      `منوی دیجیتال «${cafeNameFa}» — طعم‌ها و سفارش آنلاین:\n${shareUrl}`,
    [cafeNameFa, shareUrl],
  );

  if (!open) return null;

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const area = document.createElement('textarea');
        area.value = shareUrl;
        area.setAttribute('readonly', '');
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        document.execCommand('copy');
        document.body.removeChild(area);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch {
      // Clipboard fallback ignored if blocked
    }
  };

  const canNativeShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const handleNativeShare = async () => {
    if (!canNativeShare) return;
    try {
      await navigator.share({
        title: `${cafeNameFa} | منوی دیجیتال`,
        text: `منوی دیجیتال «${cafeNameFa}» را ببینید:`,
        url: shareUrl,
      });
      setNativeShared(true);
    } catch {
      // User dismissed share sheet
    }
  };

  const smsHref = `sms:?body=${encodeURIComponent(shareMessage)}`;
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
  const telegramHref = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(
    `منوی دیجیتال «${cafeNameFa}»`,
  )}`;
  const xHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    `منوی دیجیتال «${cafeNameFa}»`,
  )}&url=${encodeURIComponent(shareUrl)}`;

  return (
    <div
      className="no-print fixed inset-0 z-[60] flex items-center justify-center bg-[#1F130C]/55 p-3 backdrop-blur-sm sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-menu-title"
    >
      <div
        className="paper-sheet relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-[24px] p-4 text-[#2B1B12] sm:rounded-[28px] sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="mb-5 flex items-start justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <p
              dir="ltr"
              className="font-display-serif text-right text-sm italic text-[#96522B]"
            >
              Share Paper Menu · {cafeNameEn}
            </p>
            <h2 id="share-menu-title" className="text-base font-extrabold text-[#2B1B12] sm:text-lg">
              اشتراک‌گذاری منوی {cafeNameFa}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-[#6A574A]">
              لینک منو را برای دوستانتان در شبکه‌های اجتماعی یا با پیامک ارسال کنید.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="بستن پنجره اشتراک‌گذاری"
            className="btn-paper-cream flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#2B1B12]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Recessed Lavender-Rim Link Copy Pill */}
        <div className="paper-recess mb-5 flex flex-col gap-2 rounded-2xl p-2.5 sm:flex-row sm:items-center sm:rounded-full sm:p-2">
          <input
            type="text"
            readOnly
            dir="ltr"
            value={shareUrl}
            aria-label="لینک اشتراک‌گذاری منو"
            onFocus={(e) => e.currentTarget.select()}
            className="min-h-[38px] min-w-0 flex-1 bg-transparent px-3 text-left text-xs font-semibold text-[#222E27] focus:outline-none"
          />
          <button
            type="button"
            onClick={handleCopy}
            className={`inline-flex min-h-[42px] shrink-0 items-center justify-center gap-1.5 rounded-xl px-4 text-xs font-bold sm:min-h-[38px] sm:rounded-full ${
              copied ? 'btn-paper-lavender' : 'btn-paper-primary'
            }`}
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>کپی شد</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-[#DCE6DD]" />
                <span>کپی لینک</span>
              </>
            )}
          </button>
        </div>

        {/* Soft-3D Tactile Social & SMS Channel Tiles */}
        <div className="grid grid-cols-2 gap-3">
          <a
            href={smsHref}
            className="btn-paper-kraft flex items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-xs font-extrabold"
          >
            <MessageSquare className="h-4 w-4 text-[#536F60]" />
            <span>ارسال با پیامک</span>
          </a>

          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-paper-primary flex items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-xs font-extrabold"
          >
            <Send className="h-4 w-4 text-[#DCE6DD]" />
            <span>واتساپ</span>
          </a>

          <a
            href={telegramHref}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-paper-slate flex items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-xs font-extrabold"
          >
            <Send className="h-4 w-4 text-white" />
            <span>تلگرام</span>
          </a>

          <a
            href={xHref}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-paper-cream flex items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-xs font-extrabold"
          >
            <Share2 className="h-4 w-4 text-[#536F60]" />
            <span>شبکه X</span>
          </a>
        </div>

        {canNativeShare && (
          <button
            type="button"
            onClick={handleNativeShare}
            className="btn-paper-lavender mt-4 flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-xs font-extrabold"
          >
            <Share2 className="h-4 w-4" />
            <span>{nativeShared ? 'پنجره اشتراک‌گذاری باز شد' : 'اشتراک‌گذاری سریع دستگاه'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
