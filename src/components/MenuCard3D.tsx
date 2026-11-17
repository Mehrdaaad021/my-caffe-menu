import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react';
import { Heart, Minus, Plus, Rotate3d, UtensilsCrossed } from '@/src/components/ClayCafeIcons';
import type { MenuItem } from '@/src/types/menu';
import { resolveMenuImage } from '@/src/lib/imageAssets';
import { useTransparent3DCutout } from '@/src/lib/cutout3d';
import { formatDigits, formatPrice } from '@/src/lib/formatters';
import { getUiStrings, type MenuLanguage } from '@/src/lib/menuI18n';

interface MenuCard3DProps {
  item: MenuItem;
  index?: number;
  layout?: 'grid' | 'list';
  lang?: MenuLanguage;
  showPrepTime?: boolean;
  categoryLabel: string;
  currencyLabel: string;
  quantityInTray: number;
  isFavorite?: boolean;
  onToggleFavorite?: (itemId: string) => void;
  onInspect: (item: MenuItem) => void;
  onAddToTray: (item: MenuItem) => void;
  onDecrementFromTray?: (item: MenuItem) => void;
  onHoverChange?: (hovering: boolean) => void;
}

export const MenuCard3D: React.FC<MenuCard3DProps> = ({
  item,
  index = 0,
  layout = 'grid',
  lang = 'fa',
  showPrepTime = true,
  categoryLabel,
  currencyLabel,
  quantityInTray,
  isFavorite = false,
  onToggleFavorite,
  onInspect,
  onAddToTray,
  onDecrementFromTray,
  onHoverChange,
}) => {
  const ui = getUiStrings(lang);
  const outerRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0, active: false });
  const [imgFailed, setImgFailed] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const prefersReduced = useReducedMotion();

  useEffect(() => {
    if (prefersReduced) {
      setIsVisible(true);
      return;
    }
    const el = outerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -12px 0px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [prefersReduced]);

  const { scrollYProgress } = useScroll({
    target: outerRef,
    offset: ['start end', 'end start'],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 115,
    damping: 22,
    mass: 0.4,
  });

  const dishParallaxY = useTransform(smoothProgress, [0, 1], prefersReduced ? [0, 0] : [14, -16]);

  const rawSrc = resolveMenuImage(item.imageUrl);
  const { cutoutSrc } = useTransparent3DCutout(rawSrc);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch' || prefersReduced) return;
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    setTilt({
      rotateX: (0.5 - py) * 9,
      rotateY: (px - 0.5) * 11,
      active: true,
    });
  };

  const handlePointerEnter = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType === 'touch') return;
    onHoverChange?.(true);
  };

  const handlePointerLeave = () => {
    setTilt({ rotateX: 0, rotateY: 0, active: false });
    onHoverChange?.(false);
  };

  const handleInspectItem = () => {
    onHoverChange?.(false);
    onInspect(item);
  };

  const staggerStyle = {
    '--cafe-delay': `${(index % 4) * 70}ms`,
  } as React.CSSProperties;

  const renderPaperAction = () => {
    if (!item.isAvailable) {
      return (
        <span className="whitespace-nowrap text-xs font-semibold text-[#8E7C6D]">
          {ui.soldOut}
        </span>
      );
    }

    if (quantityInTray > 0 && onDecrementFromTray) {
      return (
        <div
          onClick={(e) => e.stopPropagation()}
          className="inline-flex h-10 shrink-0 items-center rounded-full border border-[#3C5648] bg-gradient-to-b from-[#628270] to-[#4E6B5B] p-1 text-white shadow-[inset_0_1.5px_0_rgba(255,255,255,0.35),0_4px_0_#374E42,0_8px_16px_-6px_rgba(38,56,46,0.36)]"
        >
          <button
            type="button"
            onClick={() => onDecrementFromTray(item)}
            aria-label={`Remove ${item.nameFa}`}
            className="flex h-7 w-7 items-center justify-center rounded-full text-[#EEF4EE] transition-colors hover:bg-white/15 hover:text-white"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="min-w-[26px] text-center tabular-nums text-xs font-extrabold">
            {formatDigits(quantityInTray, lang)}
          </span>
          <button
            type="button"
            onClick={() => onAddToTray(item)}
            aria-label={`Add ${item.nameFa}`}
            className="btn-paper-cream flex h-7 w-7 items-center justify-center rounded-full text-[#222E27]"
          >
            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
          </button>
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onAddToTray(item);
        }}
        aria-label={`${ui.addShort} ${item.nameFa}`}
        className="btn-paper-primary inline-flex h-10 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-4 text-xs font-bold"
      >
        <Plus className="h-3.5 w-3.5 text-[#DCE6DD]" />
        <span>{ui.addShort}</span>
      </button>
    );
  };

  if (layout === 'list') {
    return (
      <div
        ref={outerRef}
        style={staggerStyle}
        className={`scene-3d paper-card-wrapper relative ${
          isVisible ? 'cafe-card-stagger-in' : 'cafe-card-hidden'
        }`}
      >
        <div className="paper-hover-float relative">
          {/* Soft Feathered Ambient Pool & Overhead Top-Down Pendant Light */}
          <div
            aria-hidden="true"
            className="paper-spotlight-pool pointer-events-none absolute -inset-x-10 -inset-y-7 rounded-[56px]"
            style={{
              background:
                'radial-gradient(ellipse 88% 84% at 50% 50%, rgba(249, 244, 234, 0.96) 0%, rgba(246, 239, 226, 0.85) 36%, rgba(244, 236, 222, 0.48) 62%, rgba(244, 236, 222, 0.14) 82%, rgba(244, 236, 222, 0) 98%)',
              filter: 'blur(28px)',
            }}
          />
          <div
            aria-hidden="true"
            className="paper-spotlight-cone pointer-events-none absolute -top-28 -inset-x-6 bottom-0"
          >
            <div
              className="absolute inset-0 rounded-[72px]"
              style={{
                background:
                  'radial-gradient(ellipse 52% 84% at 50% 0%, rgba(255, 249, 232, 0.68) 0%, rgba(255, 239, 204, 0.32) 42%, rgba(255, 235, 192, 0.08) 72%, rgba(255, 235, 192, 0) 96%)',
                filter: 'blur(22px)',
              }}
            />
          </div>

          <article
            ref={cardRef}
            onPointerEnter={handlePointerEnter}
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
            onFocus={() => onHoverChange?.(true)}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                onHoverChange?.(false);
              }
            }}
            onClick={handleInspectItem}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleInspectItem();
              }
            }}
            style={{
              transform: `rotateX(${tilt.rotateX * 0.45}deg) rotateY(${tilt.rotateY * 0.45}deg)`,
              transition: tilt.active
                ? 'transform 90ms cubic-bezier(0.16, 1, 0.3, 1)'
                : 'transform 340ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            className={`card-3d-preserve group relative z-10 flex cursor-pointer flex-col gap-4 border-b border-dashed border-[#2B1B12]/14 px-2 pb-6 pt-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2B1B12] sm:flex-row sm:items-center ${
              !item.isAvailable ? 'opacity-60' : ''
            }`}
          >
            {/* Floating Circular Cut-Paper Coaster + 3D Dish Cutout (Zero Rectangular Box) */}
            <div className="relative flex h-32 w-full shrink-0 items-center justify-center overflow-visible sm:w-32">
              <div
                aria-hidden="true"
                className="paper-spotlight-rim pointer-events-none absolute -top-8 h-32 w-32 rounded-full"
                style={{
                  background:
                    'radial-gradient(ellipse 75% 70% at 50% 18%, rgba(255, 252, 240, 0.58) 0%, rgba(255, 238, 202, 0.24) 48%, rgba(255, 238, 202, 0) 82%)',
                  filter: 'blur(18px)',
                }}
              />
              <div
                aria-hidden="true"
                className="paper-halo-outer pointer-events-none absolute h-24 w-24 translate-x-1.5 translate-y-1.5 rounded-full bg-[#E9DEC9]/85 shadow-[0_10px_20px_-8px_rgba(43,27,18,0.18),inset_0_1px_0_rgba(255,255,255,0.75)]"
              />
              <div
                aria-hidden="true"
                className={`paper-halo-inner pointer-events-none absolute h-20 w-20 rounded-full shadow-[0_6px_14px_rgba(43,27,18,0.14),inset_0_1px_0_rgba(255,255,255,0.9)] ${
                  item.isSignature ? 'bg-[#D69265]/40' : 'bg-[#FCF9F2]/95'
                }`}
              />
              <div
                aria-hidden="true"
                className="paper-ground-shadow pointer-events-none absolute bottom-1 h-3.5 w-20 rounded-full bg-[#2B1B12]/22 blur-[6px]"
              />
              <motion.div
                style={{ y: dishParallaxY, transformStyle: 'preserve-3d' }}
                className="pointer-events-none"
              >
                <div className="popout-layer-front">
                  <div className="paper-dish-float">
                    {!imgFailed ? (
                      <img
                        src={cutoutSrc}
                        alt={item.nameFa}
                        referrerPolicy="no-referrer"
                        onError={() => setImgFailed(true)}
                        style={{
                          filter: 'drop-shadow(0 18px 14px rgba(43, 27, 18, 0.28))',
                        }}
                        className="-mt-2 h-28 w-28 select-none object-contain transition-transform duration-200 group-hover:scale-110"
                      />
                    ) : (
                      <UtensilsCrossed className="h-7 w-7 text-[#C27445]" />
                    )}
                  </div>
                </div>
              </motion.div>
              {/* Natural Overhead Top-Down Grazing Light Onto Dish */}
              <div
                aria-hidden="true"
                className="paper-spotlight-rim pointer-events-none absolute -top-10 inset-x-0 bottom-6 z-20"
                style={{
                  background:
                    'radial-gradient(ellipse 68% 64% at 50% 8%, rgba(255, 250, 236, 0.44) 0%, rgba(255, 240, 206, 0.16) 46%, rgba(255, 240, 206, 0) 82%)',
                  filter: 'blur(14px)',
                  mixBlendMode: 'screen',
                }}
              />
            </div>

            {/* Open Floating Editorial Typography */}
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-[#96522B]">
                <span>{categoryLabel}</span>
                {showPrepTime && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">
                      {formatDigits(item.prepTimeMinutes, lang)} {ui.minutesUnit}
                    </span>
                  </>
                )}
                {item.isSignature && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-bold text-[#2B1B12]">{ui.houseSignature}</span>
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <h3 className="text-base font-extrabold text-[#2B1B12]">{item.nameFa}</h3>
                {lang === 'fa' && item.nameEn && (
                  <span dir="ltr" className="font-display-serif text-sm italic text-[#7A6658]">
                    {item.nameEn}
                  </span>
                )}
              </div>

              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#6A574A]">
                {item.descriptionFa}
              </p>

              {item.ingredientsFa.length > 0 && (
                <p className="mt-1.5 truncate text-[11px] text-[#8E7C6D]">
                  {item.ingredientsFa.slice(0, 3).join(' · ')}
                </p>
              )}
            </div>

            {/* Price & Floating Tactile Paper Action */}
            <div className="flex shrink-0 items-center justify-between gap-4 pt-1 sm:flex-col sm:items-end sm:justify-between sm:self-stretch">
              <div className="flex items-baseline gap-1">
                <span className="tabular-nums text-base font-extrabold text-[#2B1B12]">
                  {formatPrice(item.price, lang)}
                </span>
                <span className="text-[11px] font-medium text-[#7A6658]">{currencyLabel}</span>
              </div>

              {renderPaperAction()}
            </div>
          </article>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={outerRef}
      style={staggerStyle}
      className={`scene-3d paper-card-wrapper relative ${
        isVisible ? 'cafe-card-stagger-in' : 'cafe-card-hidden'
      }`}
    >
      <div className="paper-hover-float relative h-full">
        {/* Soft Feathered Ambient Pool & Overhead Top-Down Pendant Light */}
        <div
          aria-hidden="true"
          className="paper-spotlight-pool pointer-events-none absolute -inset-x-14 -inset-y-10 rounded-[80px]"
          style={{
            background:
              'radial-gradient(ellipse 88% 84% at 50% 50%, rgba(249, 244, 234, 0.96) 0%, rgba(246, 239, 226, 0.85) 36%, rgba(244, 236, 222, 0.48) 62%, rgba(244, 236, 222, 0.14) 82%, rgba(244, 236, 222, 0) 98%)',
            filter: 'blur(32px)',
          }}
        />
        <div
          aria-hidden="true"
          className="paper-spotlight-cone pointer-events-none absolute -top-32 -inset-x-8 -bottom-2"
        >
          {/* Soft Directional Overhead Lamp Falloff Pouring Downward From Top Center */}
          <div
            className="absolute inset-0 rounded-[88px]"
            style={{
              background:
                'radial-gradient(ellipse 52% 84% at 50% 0%, rgba(255, 249, 232, 0.72) 0%, rgba(255, 239, 204, 0.34) 40%, rgba(255, 235, 192, 0.08) 70%, rgba(255, 235, 192, 0) 96%)',
              filter: 'blur(24px)',
            }}
          />
          {/* Subtle Inner Downward Key Shaft */}
          <div
            className="absolute inset-x-12 top-0 bottom-16 rounded-full"
            style={{
              background:
                'radial-gradient(ellipse 58% 82% at 50% 4%, rgba(255, 252, 242, 0.62) 0%, rgba(255, 242, 208, 0.22) 46%, rgba(255, 242, 208, 0) 86%)',
              filter: 'blur(18px)',
            }}
          />
        </div>

        <article
          ref={cardRef}
          onPointerEnter={handlePointerEnter}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          onFocus={() => onHoverChange?.(true)}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
              onHoverChange?.(false);
            }
          }}
          onClick={handleInspectItem}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleInspectItem();
            }
          }}
          style={{
            transform: `rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg)`,
            transition: tilt.active
              ? 'transform 90ms cubic-bezier(0.16, 1, 0.3, 1)'
              : 'transform 340ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          className={`card-3d-preserve group relative z-10 flex h-full cursor-pointer flex-col justify-between px-2 py-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2B1B12] ${
            !item.isAvailable ? 'opacity-60' : ''
          }`}
        >
          {/* Floating Organic Paper-Cut Moon & 3D Cutout Stage (Zero Rectangular Frame) */}
          <div className="relative mb-4 flex h-56 items-center justify-center overflow-visible">
            {/* Overhead Light Halo Casting Downward Onto Dish Stage */}
            <div
              aria-hidden="true"
              className="paper-spotlight-rim pointer-events-none absolute -top-12 h-56 w-56 rounded-full"
              style={{
                background:
                  'radial-gradient(ellipse 72% 68% at 50% 16%, rgba(255, 252, 240, 0.6) 0%, rgba(255, 238, 202, 0.24) 48%, rgba(255, 238, 202, 0) 82%)',
                filter: 'blur(22px)',
              }}
            />
            {/* Outer Offset Kraft Paper-Cut Disc */}
            <div
              aria-hidden="true"
              className="paper-halo-outer pointer-events-none absolute h-44 w-44 translate-x-2 translate-y-2 rounded-full bg-[#E9DEC9]/80 shadow-[0_14px_26px_-10px_rgba(43,27,18,0.18),inset_0_1px_0_rgba(255,255,255,0.7)]"
            />

            {/* Inner Cream / Terracotta Paper-Cut Moon Disc */}
            <div
              aria-hidden="true"
              className={`paper-halo-inner pointer-events-none absolute h-36 w-36 rounded-full shadow-[0_8px_18px_rgba(43,27,18,0.14),inset_0_1px_0_rgba(255,255,255,0.9)] ${
                item.isSignature ? 'bg-[#D69265]/40' : 'bg-[#FCF9F2]/95'
              }`}
            />

            {/* Soft Elliptical Cast Shadow Floating on Page Canvas */}
            <div
              aria-hidden="true"
              className="paper-ground-shadow pointer-events-none absolute bottom-3 h-5 w-32 rounded-full bg-[#2B1B12]/18 blur-[7px]"
            />

            {/* Subtle Circular Floating Micro-Controls */}
            <div className="absolute inset-x-3 top-2 z-20 flex items-center justify-between">
              <span
                className="btn-paper-cream inline-flex h-8 w-8 items-center justify-center rounded-full text-[#2B1B12] opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                title="نمای سه‌بعدی و شخصی‌سازی"
              >
                <Rotate3d className="h-3.5 w-3.5" />
              </span>

              {onToggleFavorite && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(item.id);
                  }}
                  aria-label="علاقه‌مندی"
                  className="btn-paper-cream flex h-8 w-8 items-center justify-center rounded-full"
                >
                  <Heart
                    className={`h-3.5 w-3.5 transition-colors ${
                      isFavorite ? 'fill-[#C27445] text-[#C27445]' : 'text-[#6A574A]'
                    }`}
                  />
                </button>
              )}
            </div>

            {/* 3D Transparent Dish Cutout Freely Floating Above Page */}
            <motion.div
              style={{ y: dishParallaxY, transformStyle: 'preserve-3d' }}
              className="pointer-events-none flex items-center justify-center"
            >
              <div className="popout-layer-front">
                <div className="paper-dish-float">
                  {!imgFailed ? (
                    <img
                      src={cutoutSrc}
                      alt={item.nameFa}
                      referrerPolicy="no-referrer"
                      onError={() => setImgFailed(true)}
                      className="h-52 w-52 select-none object-contain transition-transform duration-200 group-hover:scale-[1.08]"
                      style={{
                        filter: 'drop-shadow(0 26px 18px rgba(31, 19, 12, 0.34))',
                        transform: `translate3d(${tilt.rotateY * 0.85}px, ${tilt.rotateX * -0.85}px, 0)`,
                      }}
                    />
                  ) : (
                    <div className="paper-sheet flex h-36 w-36 flex-col items-center justify-center rounded-full text-[#C27445]">
                      <UtensilsCrossed className="mb-1.5 h-7 w-7" />
                      <span className="px-2 text-center text-xs font-semibold">{item.nameFa}</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Soft Top-Down Overhead Illumination Directly Onto Upper Surface of Item */}
            <div
              aria-hidden="true"
              className="paper-spotlight-rim pointer-events-none absolute -top-16 inset-x-4 bottom-8 z-20"
              style={{
                background:
                  'radial-gradient(ellipse 68% 66% at 50% 12%, rgba(255, 251, 238, 0.46) 0%, rgba(255, 240, 206, 0.18) 48%, rgba(255, 240, 206, 0) 82%)',
                filter: 'blur(16px)',
                mixBlendMode: 'screen',
              }}
            />
          </div>

          {/* Open Floating Editorial Typography Directly on the Page Canvas */}
          <div className="popout-layer-mid flex flex-1 flex-col justify-between px-1">
            <div>
              <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-[#96522B]">
                <span className="truncate">{categoryLabel}</span>
                {showPrepTime && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="whitespace-nowrap tabular-nums">
                      {formatDigits(item.prepTimeMinutes, lang)} {ui.minutesUnit}
                    </span>
                  </>
                )}
                {item.isSignature && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="whitespace-nowrap font-bold text-[#2B1B12]">{ui.signatureShort}</span>
                  </>
                )}
              </div>

              <h3 className="text-[17px] font-extrabold leading-snug text-[#2B1B12]">
                {item.nameFa}
              </h3>

              {lang === 'fa' && item.nameEn && (
                <p
                  dir="ltr"
                  className="font-display-serif mt-0.5 truncate text-right text-sm italic text-[#7A6658]"
                >
                  {item.nameEn}
                </p>
              )}

              <p className="mt-2 mb-3 line-clamp-2 text-xs leading-relaxed text-[#6A574A]">
                {item.descriptionFa}
              </p>
            </div>

            <div>
              {item.ingredientsFa.length > 0 && (
                <p className="mb-3 truncate text-[11px] text-[#8E7C6D]">
                  {item.ingredientsFa.slice(0, 3).join(' · ')}
                </p>
              )}

              <div className="flex items-center justify-between gap-2 border-t border-dashed border-[#2B1B12]/15 pt-3">
                <div className="flex items-baseline gap-1">
                  <span className="tabular-nums text-[17px] font-extrabold text-[#2B1B12]">
                    {formatPrice(item.price, lang)}
                  </span>
                  <span className="text-[11px] font-medium text-[#7A6658]">{currencyLabel}</span>
                </div>

                {renderPaperAction()}
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
};
