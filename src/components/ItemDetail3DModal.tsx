import React, { useEffect, useMemo, useState } from 'react';
import {
  Camera,
  Check,
  Clock,
  Flame,
  Heart,
  Minus,
  Plus,
  Rotate3d,
  Sparkles,
  UtensilsCrossed,
  X,
} from '@/src/components/ClayCafeIcons';
import type { MenuCategory, MenuItem } from '@/src/types/menu';
import { resolveMenuImage } from '@/src/lib/imageAssets';
import { useTransparent3DCutout } from '@/src/lib/cutout3d';
import { formatDigits, formatPrice } from '@/src/lib/formatters';
import { getFoodPairings } from '@/src/lib/foodPairing';
import { getUiStrings, type MenuLanguage } from '@/src/lib/menuI18n';
import { ARTablePreviewModal } from '@/src/components/ARTablePreviewModal';

const PairingCutoutThumb: React.FC<{ imageUrl: string; alt: string }> = ({ imageUrl, alt }) => {
  const { cutoutSrc } = useTransparent3DCutout(resolveMenuImage(imageUrl));
  const [failed, setFailed] = useState(false);

  return (
    <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
      <div
        aria-hidden="true"
        className="absolute h-11 w-11 rounded-full bg-[#FCF9F2] shadow-[0_3px_8px_rgba(43,27,18,0.12)]"
      />
      {!failed ? (
        <img
          src={cutoutSrc}
          alt={alt}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="relative z-10 h-14 w-14 object-contain drop-shadow-[0_6px_6px_rgba(43,27,18,0.22)]"
        />
      ) : (
        <UtensilsCrossed className="relative z-10 h-5 w-5 text-[#C27445]" />
      )}
    </div>
  );
};

interface ItemDetail3DModalProps {
  item: MenuItem | null;
  allItems?: MenuItem[];
  categories?: MenuCategory[];
  categoryLabel: string;
  currencyLabel: string;
  lang?: MenuLanguage;
  showPrepTime?: boolean;
  showCalories?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: (itemId: string) => void;
  onSelectItem?: (item: MenuItem) => void;
  onClose: () => void;
  onAdd: (item: MenuItem, quantity: number, note: string) => void;
}

export const ItemDetail3DModal: React.FC<ItemDetail3DModalProps> = ({
  item,
  allItems = [],
  categories = [],
  categoryLabel,
  currencyLabel,
  lang = 'fa',
  showPrepTime = true,
  showCalories = true,
  isFavorite = false,
  onToggleFavorite,
  onSelectItem,
  onClose,
  onAdd,
}) => {
  const ui = getUiStrings(lang);
  const [quantity, setQuantity] = useState(1);
  const [sizeOption, setSizeOption] = useState(ui.modal.sizeChoicesDrink[1]);
  const [extraOption, setExtraOption] = useState(ui.modal.milkChoicesDrink[0]);
  const [note, setNote] = useState('');
  const [rotation, setRotation] = useState({ x: 4, y: -8 });
  const [imgFailed, setImgFailed] = useState(false);
  const [arOpen, setArOpen] = useState(false);
  const [addedPairingId, setAddedPairingId] = useState<string | null>(null);

  const rawSrc = resolveMenuImage(item?.imageUrl ?? '');
  const { cutoutSrc } = useTransparent3DCutout(rawSrc);

  const pairings = useMemo(
    () => (item ? getFoodPairings(item, allItems, categories, 2) : []),
    [item, allItems, categories],
  );

  const isDrink =
    item?.categoryId.includes('drink') ||
    categoryLabel.includes('نوشیدنی') ||
    categoryLabel.includes('قهوه') ||
    categoryLabel.toLowerCase().includes('drink') ||
    categoryLabel.toLowerCase().includes('coffee');

  useEffect(() => {
    const nextUi = getUiStrings(lang);
    setQuantity(1);
    setSizeOption(isDrink ? nextUi.modal.sizeChoicesDrink[1] : nextUi.modal.sizeChoicesFood[0]);
    setExtraOption(isDrink ? nextUi.modal.milkChoicesDrink[0] : nextUi.modal.milkChoicesFood[0]);
    setNote('');
    setRotation({ x: 4, y: -8 });
    setImgFailed(false);
    setArOpen(false);
    setAddedPairingId(null);
  }, [item?.id, isDrink, lang]);

  useEffect(() => {
    if (!item || arOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [item, arOpen, onClose]);

  if (!item) return null;

  const handleStageMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setRotation({
      x: Number((-py * 22).toFixed(2)),
      y: Number((px * 28).toFixed(2)),
    });
  };

  const sizeChoices = isDrink ? ui.modal.sizeChoicesDrink : ui.modal.sizeChoicesFood;
  const secondaryChoices = isDrink ? ui.modal.milkChoicesDrink : ui.modal.milkChoicesFood;

  const handleConfirmAdd = () => {
    const combinedNote = [sizeOption, extraOption, note.trim()].filter(Boolean).join(' · ');
    onAdd(item, quantity, combinedNote);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[#1F130C]/65 p-2 backdrop-blur-xs sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={item.nameFa}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="paper-sheet cafe-shadow-deep relative grid max-h-[94dvh] w-full max-w-5xl grid-cols-1 overflow-y-auto rounded-[24px] sm:rounded-[28px] lg:grid-cols-12"
      >
        <div className="absolute left-3 top-3 z-30 flex items-center gap-2 sm:left-4 sm:top-4">
          {onToggleFavorite && (
            <button
              type="button"
              onClick={() => onToggleFavorite(item.id)}
              aria-label="افزودن به علاقه‌مندی‌ها"
              className="btn-paper-cream flex h-10 w-10 items-center justify-center rounded-full"
            >
              <Heart
                className={`h-4 w-4 ${isFavorite ? 'fill-[#C27445] text-[#C27445]' : 'text-[#6A574A]'}`}
              />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن"
            className="btn-paper-cream flex h-10 w-10 items-center justify-center rounded-full"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Left / Top: Layered Paper Cut Diorama Stage */}
        <div
          onPointerMove={handleStageMove}
          onPointerLeave={() => setRotation({ x: 4, y: -8 })}
          className="paper-recess-dark scene-3d relative flex min-h-[270px] flex-col items-center justify-between overflow-hidden p-5 text-[#FCF9F2] sm:min-h-[340px] sm:p-8 lg:col-span-6 lg:min-h-[540px]"
        >
          {/* Multi-layered Cut-Paper Tunnel Rings */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 h-[230px] w-[230px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#2B1B12] shadow-[inset_0_10px_22px_rgba(0,0,0,0.45),0_8px_18px_rgba(0,0,0,0.4)] sm:h-[340px] sm:w-[340px]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 h-[180px] w-[180px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#3D261A] shadow-[inset_0_8px_18px_rgba(0,0,0,0.35),0_8px_16px_rgba(0,0,0,0.35)] sm:h-[265px] sm:w-[265px]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 h-[130px] w-[130px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#C27445]/30 shadow-[0_8px_20px_rgba(0,0,0,0.35)] sm:h-[195px] sm:w-[195px]"
          />

          {/* Top Paper Tag */}
          <div className="relative z-20 flex w-full items-center justify-between text-[11px] font-semibold text-[#E9DEC9]">
            <span>{categoryLabel}</span>
            <span dir="ltr" className="font-display-serif italic tracking-widest uppercase">
              PAPER DIORAMA 3D
            </span>
          </div>

          {/* 3D Floating Cutout */}
          <div
            className="card-3d-preserve relative my-3 flex items-center justify-center sm:my-4"
            style={{
              transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
              transition: 'transform 140ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {!imgFailed ? (
              <img
                src={cutoutSrc}
                alt={item.nameFa}
                referrerPolicy="no-referrer"
                onError={() => setImgFailed(true)}
                style={{
                  transform: 'translateZ(68px)',
                  filter: 'drop-shadow(0 28px 20px rgba(0, 0, 0, 0.58))',
                }}
                className="relative z-10 h-44 w-44 select-none object-contain sm:h-76 sm:w-76"
              />
            ) : (
              <div className="flex h-44 w-44 flex-col items-center justify-center rounded-2xl border border-[#C27445]/35 bg-[#2B1B12] text-[#E5A77B] sm:h-52 sm:w-52">
                <UtensilsCrossed className="mb-2 h-10 w-10" />
                <span className="text-sm font-bold">{item.nameFa}</span>
              </div>
            )}
          </div>

          {/* Interactive 3D & AR Paper Strip Controls */}
          <div className="relative z-20 flex w-full flex-col gap-2.5">
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setArOpen(true)}
                className="btn-paper-lavender inline-flex min-h-[42px] items-center gap-2 rounded-full px-5 py-2 text-xs font-extrabold"
              >
                <Camera className="h-4 w-4" />
                <span>{ui.modal.arButton}</span>
              </button>
            </div>

            <div className="flex w-full flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/15 bg-[#2A3B31]/90 px-3 py-2 text-xs shadow-[0_6px_16px_rgba(0,0,0,0.35)] sm:rounded-full sm:px-4">
              <div className="flex items-center gap-1.5 text-[#DCE6DD]">
                <Rotate3d className="h-4 w-4 text-[#C6BDEC]" />
                <span>{lang === 'en' ? '3D Angle' : 'زاویه دید'}</span>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => setRotation({ x: 3, y: -18 })}
                  className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-white/20 sm:px-3"
                >
                  {ui.modal.rotateLeft}
                </button>
                <input
                  type="range"
                  min={-28}
                  max={28}
                  value={rotation.y}
                  aria-label="3D rotation"
                  onChange={(e) => setRotation((prev) => ({ ...prev, y: Number(e.target.value) }))}
                  className="w-20 accent-[#9186C7] sm:w-24"
                />
                <button
                  type="button"
                  onClick={() => setRotation({ x: 3, y: 18 })}
                  className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-white/20 sm:px-3"
                >
                  {ui.modal.rotateRight}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right / Bottom: Cardstock Customization Folio */}
        <div className="flex flex-col justify-between bg-[#FCF9F2] p-4 sm:p-8 lg:col-span-6">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-[#96522B]">
              <span>{categoryLabel}</span>
              {showPrepTime && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <Clock className="h-3.5 w-3.5" />
                    {formatDigits(item.prepTimeMinutes, lang)} {ui.minutesUnit}
                  </span>
                </>
              )}
              {showCalories && item.calories && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <Flame className="h-3.5 w-3.5" />
                    {formatDigits(item.calories, lang)} {ui.caloriesUnit}
                  </span>
                </>
              )}
            </div>

            <div className="mb-3 flex flex-wrap items-start justify-between gap-3 border-b border-dashed border-[#2B1B12]/15 pb-4">
              <div className="min-w-0">
                <h2 className="text-xl font-extrabold text-[#2B1B12] sm:text-2xl">{item.nameFa}</h2>
                {lang === 'fa' && item.nameEn && (
                  <p dir="ltr" className="font-display-serif mt-0.5 text-right text-sm italic text-[#6A574A] sm:text-base">
                    {item.nameEn}
                  </p>
                )}
              </div>

              <div className="shrink-0 text-left">
                <span className="tabular-nums text-xl font-extrabold text-[#2B1B12] sm:text-2xl">
                  {formatPrice(item.price, lang)}
                </span>
                <span className="mx-1 text-xs font-medium text-[#6A574A]">{currencyLabel}</span>
              </div>
            </div>

            <p className="mb-4 text-sm leading-relaxed text-[#524338]">{item.descriptionFa}</p>

            {item.ingredientsFa.length > 0 && (
              <div className="mb-5">
                <p className="mb-2 text-[11px] font-bold text-[#96522B]">{ui.modal.ingredientsTitle}</p>
                <div className="flex flex-wrap gap-1.5">
                  {item.ingredientsFa.map((ing) => (
                    <span
                      key={ing}
                      className="paper-sheet-kraft rounded-lg px-2.5 py-1 text-xs font-semibold text-[#2B1B12]"
                    >
                      {ing}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Customize Section 1: Size */}
            <div className="mb-4">
              <div className="mb-2 text-xs font-bold text-[#222E27]">
                {isDrink ? ui.modal.sizeTitleDrink : ui.modal.sizeTitleFood}
              </div>
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5">
                {sizeChoices.map((choice) => {
                  const active = sizeOption === choice;
                  return (
                    <button
                      key={choice}
                      type="button"
                      onClick={() => setSizeOption(choice)}
                      className={`inline-flex min-h-[42px] items-center justify-center gap-1 whitespace-nowrap rounded-full px-2 py-2 text-[11px] font-bold sm:gap-1.5 sm:px-3 sm:text-xs ${
                        active ? 'btn-paper-primary' : 'btn-paper-cream'
                      }`}
                    >
                      {active && <Check className="h-3.5 w-3.5 shrink-0 text-[#DCE6DD]" />}
                      <span className="truncate">{choice}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Customize Section 2: Milk / Extra */}
            <div className="mb-5">
              <div className="mb-2 text-xs font-bold text-[#222E27]">
                {isDrink ? ui.modal.milkTitleDrink : ui.modal.milkTitleFood}
              </div>
              <div className="flex flex-wrap gap-2">
                {secondaryChoices.map((choice) => {
                  const active = extraOption === choice;
                  return (
                    <button
                      key={choice}
                      type="button"
                      onClick={() => setExtraOption(choice)}
                      className={`inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-bold ${
                        active ? 'btn-paper-slate' : 'btn-paper-cream'
                      }`}
                    >
                      {active && <Check className="h-3.5 w-3.5 text-[#DCE6DD]" />}
                      <span>{choice}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-5">
              <label htmlFor="item-note-input" className="mb-1.5 block text-xs font-bold text-[#222E27]">
                {ui.modal.noteLabel}
              </label>
              <input
                id="item-note-input"
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={ui.modal.notePlaceholder}
                className="paper-recess w-full rounded-full px-4 py-2.5 text-sm font-medium text-[#222E27] placeholder:text-[#6B7A70] focus:outline-none"
              />
            </div>

            {pairings.length > 0 && (
              <div className="paper-tray-complement mb-5 rounded-3xl p-4">
                <div className="mb-2.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-[#536F60]" />
                    <span className="text-xs font-extrabold text-[#222E27]">
                      {ui.modal.pairingHeader}
                    </span>
                  </div>
                  <span dir="ltr" className="font-display-serif text-[11px] italic text-[#536F60]">
                    Perfect Match
                  </span>
                </div>

                <div className="space-y-2.5">
                  {pairings.map((pairing) => {
                    const justAdded = addedPairingId === pairing.item.id;
                    return (
                      <div
                        key={pairing.item.id}
                        className="paper-sheet flex items-center gap-3 rounded-2xl p-2.5"
                      >
                        <button
                          type="button"
                          onClick={() => onSelectItem?.(pairing.item)}
                          className={`flex min-w-0 flex-1 items-center gap-3 ${
                            lang === 'en' ? 'text-left' : 'text-right'
                          }`}
                          title={pairing.item.nameFa}
                        >
                          <PairingCutoutThumb
                            imageUrl={pairing.item.imageUrl}
                            alt={pairing.item.nameFa}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold text-[#536F60]">
                              <span>{lang === 'en' ? ui.itemFallbackCategory : pairing.badgeFa}</span>
                              <span aria-hidden="true">·</span>
                              <span className="text-[#5C6B61]">{pairing.categoryLabel}</span>
                            </div>
                            <p className="truncate text-xs font-extrabold text-[#222E27]">
                              {pairing.item.nameFa}
                            </p>
                            <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-[#5C6B61]">
                              {lang === 'en' ? pairing.item.descriptionFa : pairing.reasonFa}
                            </p>
                          </div>
                        </button>

                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                          <span className="tabular-nums text-[11px] font-extrabold text-[#222E27]">
                            {formatPrice(pairing.item.price, lang)} {currencyLabel}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              onAdd(
                                pairing.item,
                                1,
                                lang === 'en' ? `Paired with ${item.nameFa}` : `مکمل پیشنهادی با ${item.nameFa}`,
                              );
                              setAddedPairingId(pairing.item.id);
                              setTimeout(() => {
                                setAddedPairingId((prev) =>
                                  prev === pairing.item.id ? null : prev,
                                );
                              }, 2000);
                            }}
                            className={`inline-flex min-h-[32px] items-center gap-1 whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-bold ${
                              justAdded ? 'btn-paper-primary' : 'btn-paper-lavender'
                            }`}
                          >
                            {justAdded ? (
                              <>
                                <Check className="h-3 w-3" />
                                <span>{ui.modal.addedPairing}</span>
                              </>
                            ) : (
                              <>
                                <Plus className="h-3 w-3" />
                                <span>{ui.modal.addPairing}</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-dashed border-[#536F60]/25 pt-4">
            {item.isAvailable ? (
              <div className="flex flex-wrap items-center gap-2.5 sm:flex-nowrap sm:gap-3">
                <div className="paper-sheet-kraft flex shrink-0 items-center rounded-full p-1">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    aria-label="کاهش تعداد"
                    className="btn-paper-cream flex h-9 w-9 items-center justify-center rounded-full"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-9 text-center tabular-nums text-sm font-extrabold text-[#222E27]">
                    {formatDigits(quantity, lang)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(20, q + 1))}
                    aria-label="Increase"
                    className="btn-paper-cream flex h-9 w-9 items-center justify-center rounded-full"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleConfirmAdd}
                  className="btn-paper-primary flex min-h-[48px] min-w-[190px] flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 py-3 text-xs font-bold sm:px-6 sm:text-sm"
                >
                  <span>{ui.modal.addToTray}</span>
                  <span className="tabular-nums text-[#DCE6DD]">
                    · {formatPrice(item.price * quantity, lang)} {currencyLabel}
                  </span>
                </button>
              </div>
            ) : (
              <div className="paper-sheet-kraft rounded-full px-4 py-3 text-center text-sm font-semibold text-[#5C6B61]">
                {ui.modal.unavailable}
              </div>
            )}
          </div>
        </div>
      </div>

      <ARTablePreviewModal
        open={arOpen}
        item={item}
        cutoutSrc={cutoutSrc}
        currencyLabel={currencyLabel}
        onClose={() => setArOpen(false)}
        onAddQuick={handleConfirmAdd}
      />
    </div>
  );
};
