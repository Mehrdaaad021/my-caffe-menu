import React, { useMemo, useState } from 'react';
import { Plus, Sparkles, UtensilsCrossed } from '@/src/components/ClayCafeIcons';
import type { MenuCategory, MenuItem, OrderNoteItem } from '@/src/types/menu';
import { resolveMenuImage } from '@/src/lib/imageAssets';
import { useTransparent3DCutout } from '@/src/lib/cutout3d';
import { formatPrice } from '@/src/lib/formatters';
import { getFoodPairings } from '@/src/lib/foodPairing';
import { getUiStrings, type MenuLanguage } from '@/src/lib/menuI18n';

interface TrayComplementarySuggestionsProps {
  trayItems: OrderNoteItem[];
  allItems: MenuItem[];
  categories: MenuCategory[];
  currencyLabel: string;
  lang?: MenuLanguage;
  onAddItem: (item: MenuItem) => void;
}

const SuggestionThumb: React.FC<{ imageUrl: string; name: string }> = ({ imageUrl, name }) => {
  const { cutoutSrc } = useTransparent3DCutout(resolveMenuImage(imageUrl));
  const [failed, setFailed] = useState(false);

  return (
    <div className="paper-recess flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl p-1">
      {!failed ? (
        <img
          src={cutoutSrc}
          alt={name}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="h-full w-full object-contain drop-shadow-[0_4px_5px_rgba(36,48,39,0.2)]"
        />
      ) : (
        <UtensilsCrossed className="h-4 w-4 text-[#536F60]" />
      )}
    </div>
  );
};

function norm(v: string): string {
  return v.toLowerCase().replace(/ي/g, 'ی').replace(/ك/g, 'ک').trim();
}

export const TrayComplementarySuggestions: React.FC<TrayComplementarySuggestionsProps> = ({
  trayItems,
  allItems,
  categories,
  currencyLabel,
  lang = 'fa',
  onAddItem,
}) => {
  const ui = getUiStrings(lang);
  const suggestions = useMemo(() => {
    if (trayItems.length === 0 || allItems.length === 0) return [];

    const inTrayIds = new Set(trayItems.map((entry) => entry.item.id));
    const catMap = new Map<string, string>(categories.map((c) => [c.id, c.nameFa]));

    let trayHasDrink = false;
    let trayHasSavory = false;
    let trayHasSweetOrDessert = false;

    for (const entry of trayItems) {
      const catName = catMap.get(entry.item.categoryId) ?? '';
      const corpus = norm(
        `${entry.item.categoryId} ${catName} ${entry.item.nameFa} ${entry.item.nameEn} ${entry.item.descriptionFa}`,
      );
      if (
        corpus.includes('drink') ||
        corpus.includes('نوشیدنی') ||
        corpus.includes('قهوه') ||
        corpus.includes('لاته') ||
        corpus.includes('اسپرسو') ||
        corpus.includes('چای')
      ) {
        trayHasDrink = true;
      } else if (
        corpus.includes('کیک') ||
        corpus.includes('دسر') ||
        corpus.includes('شیرینی') ||
        corpus.includes('تارت') ||
        corpus.includes('کروسان')
      ) {
        trayHasSweetOrDessert = true;
      } else {
        trayHasSavory = true;
      }
    }

    const scoreMap = new Map<
      string,
      { item: MenuItem; score: number; roleFa: string; reasonFa: string }
    >();

    // Seed from item-by-item food pairing affinity
    for (const entry of trayItems) {
      const pairings = getFoodPairings(entry.item, allItems, categories, 4);
      pairings.forEach((pair, idx) => {
        if (inTrayIds.has(pair.item.id) || !pair.item.isAvailable) return;
        const prev = scoreMap.get(pair.item.id);
        const bonus = (4 - idx) * 14 * Math.min(entry.quantity, 2);
        scoreMap.set(pair.item.id, {
          item: pair.item,
          score: (prev?.score ?? 0) + bonus,
          roleFa: pair.badgeFa,
          reasonFa: prev?.reasonFa || `مکمل ${entry.item.nameFa}`,
        });
      });
    }

    // Apply basket-gap synergy (missing drink / missing dessert / missing starter or sauce)
    for (const candidate of allItems) {
      if (inTrayIds.has(candidate.id) || !candidate.isAvailable) continue;
      const catName = catMap.get(candidate.categoryId) ?? '';
      const corpus = norm(
        `${candidate.categoryId} ${catName} ${candidate.nameFa} ${candidate.nameEn} ${candidate.descriptionFa} ${candidate.ingredientsFa.join(' ')}`,
      );

      const isDrink =
        corpus.includes('drink') ||
        corpus.includes('نوشیدنی') ||
        corpus.includes('قهوه') ||
        corpus.includes('لاته') ||
        corpus.includes('تونیک');
      const isDessert =
        corpus.includes('کیک') ||
        corpus.includes('دسر') ||
        corpus.includes('تارت') ||
        corpus.includes('شیرینی') ||
        corpus.includes('پسته');
      const isSauceOrSide =
        corpus.includes('سس') ||
        corpus.includes('دیپ') ||
        corpus.includes('پیش') ||
        corpus.includes('کروسان') ||
        corpus.includes('نان') ||
        corpus.includes('سالاد');

      const existing = scoreMap.get(candidate.id);
      let extraScore = existing?.score ?? (candidate.isSignature ? 12 : 4);
      let roleFa = existing?.roleFa ?? (catName || 'پیشنهاد مکمل');
      let reasonFa = existing?.reasonFa ?? 'انتخاب پیشنهادی کنار اقلام سینی';

      if (trayHasSavory && !trayHasDrink && isDrink) {
        extraScore += 42;
        roleFa = 'نوشیدنی مکمل سفارش';
        reasonFa = 'برای متعادل کردن طعم غذاهای سینی شما';
      } else if ((trayHasSavory || trayHasDrink) && !trayHasSweetOrDessert && isDessert) {
        extraScore += 34;
        roleFa = 'دسر و شیرینی مکمل';
        reasonFa = 'پایانی دلپذیر کنار نوشیدنی یا غذای اصلی';
      } else if (isSauceOrSide) {
        extraScore += 28;
        roleFa = 'پیش‌غذا و طعم‌افزای مکمل';
        reasonFa = 'هم‌نشینی عالی با سینی فعلی شما';
      }

      scoreMap.set(candidate.id, {
        item: candidate,
        score: extraScore,
        roleFa,
        reasonFa,
      });
    }

    return Array.from(scoreMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [trayItems, allItems, categories]);

  if (suggestions.length === 0) return null;

  return (
    <div className="paper-tray-complement mt-5 rounded-3xl p-4">
      <div className="mb-3 flex items-center justify-between gap-2 border-b border-dashed border-[#536F60]/25 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#536F60] text-white shadow-[0_2px_0_#3B5246]">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <div>
            <h3 className="text-xs font-extrabold text-[#222E27]">
              {ui.tray.suggestionsTitle}
            </h3>
            <p className="text-[10px] font-medium text-[#5A6A60]">
              {ui.tray.suggestionsSub}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2.5">
        {suggestions.map(({ item, roleFa, reasonFa }) => (
          <div
            key={item.id}
            className="paper-sheet flex items-center justify-between gap-3 rounded-2xl p-2.5"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <SuggestionThumb imageUrl={item.imageUrl} name={item.nameFa} />
              <div className="min-w-0">
                <p className="truncate text-[10px] font-bold text-[#536F60]">
                  {lang === 'en' ? ui.itemFallbackCategory : roleFa}
                </p>
                <p className="truncate text-xs font-extrabold text-[#222E27]">{item.nameFa}</p>
                <p className="truncate text-[10px] text-[#647068]">
                  {lang === 'en' ? item.descriptionFa : reasonFa}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <span className="tabular-nums text-[11px] font-extrabold text-[#222E27]">
                {formatPrice(item.price, lang)}{' '}
                <span className="text-[9px] font-semibold text-[#647068]">{currencyLabel}</span>
              </span>
              <button
                type="button"
                onClick={() => onAddItem(item)}
                className="btn-paper-lavender inline-flex min-h-[30px] items-center gap-1 whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-bold"
              >
                <Plus className="h-3 w-3" />
                <span>{ui.addShort}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
