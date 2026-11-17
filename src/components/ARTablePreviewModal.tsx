import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Camera,
  Move,
  RefreshCw,
  Rotate3d,
  RotateCcw,
  UtensilsCrossed,
  X,
  ZoomIn,
  ZoomOut,
} from '@/src/components/ClayCafeIcons';
import type { MenuItem } from '@/src/types/menu';
import { formatPriceFa, toPersianDigits } from '@/src/lib/formatters';

interface ARTablePreviewModalProps {
  open: boolean;
  item: MenuItem;
  cutoutSrc: string;
  currencyLabel: string;
  onClose: () => void;
  onAddQuick?: () => void;
}

export const ARTablePreviewModal: React.FC<ARTablePreviewModalProps> = ({
  open,
  item,
  cutoutSrc,
  currencyLabel,
  onClose,
  onAddQuick,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraState, setCameraState] = useState<'starting' | 'active' | 'fallback'>('starting');
  const [cameraError, setCameraError] = useState('');

  // Interactive AR placement & 3D transform state
  const [position, setPosition] = useState({ x: 0, y: 12 });
  const [scale, setScale] = useState(1);
  const [yaw, setYaw] = useState(-8);
  const [imgFailed, setImgFailed] = useState(false);

  const dragStartRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(
    async (targetFacing: 'environment' | 'user') => {
      stopCamera();
      setCameraState('starting');
      setCameraError('');

      if (
        typeof navigator === 'undefined' ||
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        setCameraState('fallback');
        setCameraError('مرورگر شما از دوربین زنده پشتیبانی نمی‌کند؛ نمای شبیه‌سازی میز فعال شد.');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: targetFacing },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {
            // Ignore autoplay promise restriction
          });
        }
        setCameraState('active');
      } catch {
        setCameraState('fallback');
        setCameraError(
          'دسترسی به دوربین فعال نشد؛ می‌توانید مدل سه‌بعدی را روی میز شبیه‌سازی جابه‌جا کنید.',
        );
      }
    },
    [stopCamera],
  );

  useEffect(() => {
    if (!open) {
      stopCamera();
      return;
    }
    setPosition({ x: 0, y: 12 });
    setScale(1);
    setYaw(-8);
    setImgFailed(false);
    startCamera(facingMode);

    return () => {
      stopCamera();
    };
  }, [open, facingMode, startCamera, stopCamera]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, input')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origX: position.x,
      origY: position.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current || dragStartRef.current.pointerId !== e.pointerId) return;
    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;
    setPosition({
      x: Math.max(-180, Math.min(180, dragStartRef.current.origX + dx)),
      y: Math.max(-150, Math.min(160, dragStartRef.current.origY + dy)),
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartRef.current && dragStartRef.current.pointerId === e.pointerId) {
      dragStartRef.current = null;
    }
  };

  const handleResetPlacement = () => {
    setPosition({ x: 0, y: 12 });
    setScale(1);
    setYaw(-8);
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-[#120A05] text-[#FCF9F2]"
      role="dialog"
      aria-modal="true"
      aria-label={`نمایش واقعیت افزوده ${item.nameFa}`}
    >
      {/* Live Camera Feed or Fallback Cafe Table Surface */}
      <div
        ref={stageRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="scene-3d relative flex-1 cursor-grab touch-none overflow-hidden active:cursor-grabbing"
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
            cameraState === 'active' ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {cameraState !== 'active' && (
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at 50% 35%, #5C3D28 0%, #3A2519 48%, #1C1009 100%)',
            }}
          >
            {/* Subtle Perspective Table Plane Grid for Placement Reference */}
            <div
              className="absolute inset-x-0 bottom-0 h-[56%] opacity-35"
              style={{
                background:
                  'linear-gradient(180deg, rgba(233,222,201,0.12) 0%, rgba(233,222,201,0.28) 100%)',
                backgroundImage:
                  'linear-gradient(to right, rgba(252,249,242,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(252,249,242,0.12) 1px, transparent 1px)',
                backgroundSize: '42px 42px',
                transform: 'perspective(540px) rotateX(48deg)',
                transformOrigin: 'bottom center',
              }}
            />
          </div>
        )}

        {/* Overhead Vignette for Clarity */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#120A05]/65 via-transparent to-[#120A05]/75"
        />

        {/* Top AR Controls Bar */}
        <div className="relative z-20 flex items-center justify-between gap-3 px-4 pt-4 sm:px-6">
          <div className="paper-sheet flex items-center gap-2.5 rounded-2xl px-3.5 py-2 text-[#2B1B12]">
            <Camera className="h-4 w-4 text-[#C27445]" />
            <div>
              <p className="text-xs font-extrabold">{item.nameFa}</p>
              <p className="text-[10px] font-semibold text-[#6A574A]">
                {cameraState === 'active'
                  ? 'دوربین را روی میز بگیرید و محصول را بکشید'
                  : 'پیش‌نمایش روی میز — مدل را بکشید و بچرخانید'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))
              }
              title="تغییر دوربین"
              aria-label="تغییر دوربین"
              className="btn-paper-cream flex h-10 w-10 items-center justify-center rounded-full text-[#2B1B12]"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="بستن نمای محیط"
              className="btn-paper-cream flex h-10 w-10 items-center justify-center rounded-full text-[#2B1B12]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Camera Notice Banner (only when fallback) */}
        {cameraState === 'fallback' && cameraError && (
          <div className="relative z-20 mx-auto mt-3 flex max-w-md items-center justify-between gap-3 rounded-2xl border border-white/15 bg-[#2B1B12]/85 px-4 py-2 text-[11px] text-[#E9DEC9] backdrop-blur-sm">
            <span>{cameraError}</span>
            <button
              type="button"
              onClick={() => startCamera(facingMode)}
              className="btn-paper-terracotta shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-bold"
            >
              تلاش مجدد
            </button>
          </div>
        )}

        {/* Interactive 3D Paper-Cut AR Model Anchored to Table */}
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          style={{
            transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${scale})`,
            transition: dragStartRef.current ? 'none' : 'transform 160ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div className="card-3d-preserve relative flex flex-col items-center justify-center">
            {/* Table Contact Shadow & Perspective Paper-Cut Coaster Ring */}
            <div
              aria-hidden="true"
              className="absolute -bottom-6 h-44 w-44 rounded-full bg-[#120A05]/55 blur-xl"
              style={{ transform: 'rotateX(70deg)' }}
            />
            <div
              aria-hidden="true"
              className="absolute -bottom-5 h-44 w-44 rounded-full border-2 border-[#FCF9F2]/60 bg-[#E9DEC9]/80 shadow-[0_14px_24px_rgba(0,0,0,0.45)]"
              style={{ transform: 'rotateX(68deg)' }}
            />
            <div
              aria-hidden="true"
              className="absolute -bottom-4 h-36 w-36 rounded-full border border-dashed border-[#C27445]/55"
              style={{ transform: 'rotateX(68deg)' }}
            />

            {/* Overhead AR Studio Rim Glow */}
            <div
              aria-hidden="true"
              className="absolute -top-8 h-52 w-52 rounded-full blur-xl"
              style={{
                background:
                  'radial-gradient(circle, rgba(255, 250, 232, 0.38) 0%, rgba(255, 250, 232, 0) 70%)',
              }}
            />

            {/* 3D Layered Paper-Cut Product Cutout */}
            <div
              className="card-3d-preserve relative flex items-center justify-center"
              style={{
                transform: `rotateX(8deg) rotateY(${yaw}deg)`,
                transition: 'transform 120ms cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              {!imgFailed ? (
                <img
                  src={cutoutSrc}
                  alt={item.nameFa}
                  referrerPolicy="no-referrer"
                  onError={() => setImgFailed(true)}
                  className="h-60 w-60 select-none object-contain sm:h-72 sm:w-72"
                  style={{
                    transform: 'translateZ(42px)',
                    filter: 'drop-shadow(0 28px 18px rgba(10, 5, 2, 0.62))',
                  }}
                />
              ) : (
                <div className="paper-sheet flex h-44 w-44 flex-col items-center justify-center rounded-full text-[#C27445]">
                  <UtensilsCrossed className="mb-2 h-8 w-8" />
                  <span className="text-xs font-bold">{item.nameFa}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Drag Helper Hint */}
        <div className="pointer-events-none absolute bottom-4 left-1/2 z-20 -translate-x-1/2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1F130C]/75 px-3 py-1 text-[11px] font-medium text-[#E9DEC9] backdrop-blur-sm">
            <Move className="h-3 w-3 text-[#E5A77B]" />
            <span>برای تنظیم جا روی میز، محصول را بکشید</span>
          </span>
        </div>
      </div>

      {/* Bottom AR Control Dock (Scale, 3D Rotation, Reset & Add) */}
      <div className="paper-sheet pb-safe relative z-20 rounded-t-[26px] px-3.5 pt-3.5 text-[#2B1B12] sm:px-6 sm:py-4">
        <div className="mx-auto flex max-w-3xl flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
            {/* Scale Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setScale((s) => Math.max(0.55, Number((s - 0.15).toFixed(2))))}
                aria-label="کوچک‌نمایی مدل"
                className="btn-paper-cream flex h-9 w-9 items-center justify-center rounded-full"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <input
                type="range"
                min={0.55}
                max={1.75}
                step={0.05}
                value={scale}
                aria-label="تغییر مقیاس مدل AR"
                onChange={(e) => setScale(Number(e.target.value))}
                className="w-20 accent-[#9186C7] sm:w-28"
              />
              <button
                type="button"
                onClick={() => setScale((s) => Math.min(1.75, Number((s + 0.15).toFixed(2))))}
                aria-label="بزرگ‌نمایی مدل"
                className="btn-paper-cream flex h-9 w-9 items-center justify-center rounded-full"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <span className="tabular-nums text-xs font-bold text-[#5C6B61]">
                {toPersianDigits(Math.round(scale * 100))}٪
              </span>
            </div>

            {/* 3D Angle Slider */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Rotate3d className="h-4 w-4 text-[#536F60]" />
              <input
                type="range"
                min={-35}
                max={35}
                value={yaw}
                aria-label="چرخش افقی مدل AR"
                onChange={(e) => setYaw(Number(e.target.value))}
                className="w-20 accent-[#536F60] sm:w-28"
              />
              <button
                type="button"
                onClick={handleResetPlacement}
                title="بازنشانی موقعیت"
                aria-label="بازنشانی موقعیت"
                className="btn-paper-kraft inline-flex h-9 items-center gap-1 rounded-full px-3 text-xs font-bold"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">بازنشانی</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-dashed border-[#536F60]/25 pt-3 sm:gap-3">
            <div>
              <p className="text-xs font-bold text-[#5C6B61]">قیمت سفارش</p>
              <p className="tabular-nums text-sm font-extrabold text-[#222E27] sm:text-base">
                {formatPriceFa(item.price)}{' '}
                <span className="text-xs font-medium text-[#5C6B61]">{currencyLabel}</span>
              </p>
            </div>

            <div className="flex items-center gap-2 sm:gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="btn-paper-cream min-h-[42px] rounded-full px-4 py-2 text-xs font-bold sm:px-5 sm:py-2.5"
              >
                بازگشت
              </button>
              {item.isAvailable && onAddQuick && (
                <button
                  type="button"
                  onClick={() => {
                    onAddQuick();
                    onClose();
                  }}
                  className="btn-paper-primary min-h-[42px] whitespace-nowrap rounded-full px-5 py-2 text-xs font-bold sm:px-6 sm:py-2.5"
                >
                  افزودن به سینی
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
