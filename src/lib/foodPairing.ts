import type { MenuCategory, MenuItem } from '@/src/types/menu';

export interface PairingSuggestion {
  item: MenuItem;
  categoryLabel: string;
  badgeFa: string;
  reasonFa: string;
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .trim();
}

function isDrinkCategory(catId: string, catName: string): boolean {
  const combined = normalizeText(`${catId} ${catName}`);
  return (
    combined.includes('drink') ||
    combined.includes('نوشیدنی') ||
    combined.includes('قهوه') ||
    combined.includes('بار') ||
    combined.includes('coffee') ||
    combined.includes('tea') ||
    combined.includes('دمنوش')
  );
}

function isColdDrinkItem(item: MenuItem, catName: string): boolean {
  const combined = normalizeText(
    `${item.categoryId} ${catName} ${item.nameFa} ${item.nameEn} ${item.ingredientsFa.join(' ')}`,
  );
  return (
    combined.includes('cold') ||
    combined.includes('سرد') ||
    combined.includes('آیس') ||
    combined.includes('تونیک') ||
    combined.includes('پرتقال') ||
    combined.includes('لیمو') ||
    combined.includes('موکتل') ||
    combined.includes('اسموتی')
  );
}

function isHotDrinkItem(item: MenuItem, catName: string): boolean {
  const combined = normalizeText(
    `${item.categoryId} ${catName} ${item.nameFa} ${item.nameEn} ${item.ingredientsFa.join(' ')}`,
  );
  return (
    combined.includes('hot') ||
    combined.includes('گرم') ||
    combined.includes('لاته') ||
    combined.includes('کاپوچینو') ||
    combined.includes('اسپرسو') ||
    combined.includes('چای') ||
    combined.includes('هات')
  );
}

export function getFoodPairings(
  currentItem: MenuItem,
  allItems: MenuItem[],
  categories: MenuCategory[],
  limit = 2,
): PairingSuggestion[] {
  const categoryMap = new Map<string, string>(categories.map((c) => [c.id, c.nameFa]));
  const currentCatName = categoryMap.get(currentItem.categoryId) ?? '';
  const currentCorpus = normalizeText(
    `${currentItem.categoryId} ${currentCatName} ${currentItem.nameFa} ${currentItem.nameEn} ${currentItem.descriptionFa} ${currentItem.ingredientsFa.join(' ')}`,
  );

  const currentIsDrink = isDrinkCategory(currentItem.categoryId, currentCatName);
  const currentIsRichSavory =
    currentCorpus.includes('برگر') ||
    currentCorpus.includes('گوشت') ||
    currentCorpus.includes('چدار') ||
    currentCorpus.includes('پیتزا') ||
    currentCorpus.includes('پپرونی') ||
    currentCorpus.includes('بوراتا') ||
    currentCorpus.includes('ترافل') ||
    currentCorpus.includes('پارمزان') ||
    currentCorpus.includes('سالمون') ||
    currentCorpus.includes('خامه');
  const currentIsPastryOrLight =
    currentCorpus.includes('کروسان') ||
    currentCorpus.includes('کیک') ||
    currentCorpus.includes('تارت') ||
    currentCorpus.includes('شیرینی') ||
    currentCorpus.includes('آووکادو');
  const currentIsSaffronOrNutty =
    currentCorpus.includes('زعفران') ||
    currentCorpus.includes('پسته') ||
    currentCorpus.includes('هل') ||
    currentCorpus.includes('بادام') ||
    currentCorpus.includes('کارامل');

  const candidates = allItems.filter(
    (candidate) => candidate.id !== currentItem.id && candidate.isAvailable,
  );

  const scored = candidates.map((candidate) => {
    const candCatName = categoryMap.get(candidate.categoryId) ?? '';
    const candCorpus = normalizeText(
      `${candidate.categoryId} ${candCatName} ${candidate.nameFa} ${candidate.nameEn} ${candidate.descriptionFa} ${candidate.ingredientsFa.join(' ')}`,
    );

    const candIsDrink = isDrinkCategory(candidate.categoryId, candCatName);
    const candIsCold = isColdDrinkItem(candidate, candCatName);
    const candIsHot = isHotDrinkItem(candidate, candCatName);
    const candIsPastry =
      candCorpus.includes('کروسان') ||
      candCorpus.includes('کیک') ||
      candCorpus.includes('تارت') ||
      candCorpus.includes('برانچ') ||
      candCorpus.includes('پیش');

    let score = candidate.isSignature ? 15 : 5;
    let badgeFa = candIsDrink ? 'نوشیدنی مکمل' : 'میان‌وعده و خوراک مکمل';
    let reasonFa = 'ترکیبی متعادل از بافت و عطر برای لذت بیشتر کنار انتخاب شما.';

    if (!currentIsDrink) {
      // Current item is Food -> strongly prioritize Drinks as primary pairing
      if (candIsDrink) {
        score += 55;
        if (currentIsRichSavory && candIsCold) {
          score += 32;
          badgeFa = 'نوشیدنی متعادل‌کننده طعم';
          reasonFa =
            'اسیدیته تازه و خنکی این نوشیدنی، غنای پنیر و بافت چرب غذا را متعادل کرده و کام را تازه نگه می‌دارد.';
        } else if (currentIsPastryOrLight && candIsHot) {
          score += 28;
          badgeFa = 'همراه کلاسیک بار گرم';
          reasonFa =
            'عطر برشته قهوه و لطافت شیر گرم در کنار بافت کره‌ای و لطیف این آیتم یک جفت‌سازی ایده‌آل می‌سازد.';
        } else if (candIsCold) {
          score += 20;
          badgeFa = 'نوشیدنی خنک مکمل';
          reasonFa =
            'طراوت گیاهی و نت‌های مرکباتی این نوشیدنی، تجربه مزه غذا را سبک‌تر و خوش‌عطرتر می‌کند.';
        } else {
          badgeFa = 'نوشیدنی گرم مکمل';
          reasonFa =
            'عطر گرم و مخملی این نوشیدنی پس از هر لقمه، طعم‌های برشته و معطر غذا را تکمیل می‌کند.';
        }
      } else if (candidate.categoryId !== currentItem.categoryId) {
        score += 18;
        if (candIsPastry) {
          badgeFa = 'میان‌وعده مکمل میز';
          reasonFa =
            'بافت ترد و سبک این انتخاب کنار سفارش اصلی، تنوع لذیذی برای اشتراک سرمیز ایجاد می‌کند.';
        }
      }
    } else {
      // Current item is Drink -> strongly prioritize Pastry / Brunch / Savory food
      if (!candIsDrink) {
        score += 55;
        if (candIsPastry) {
          score += 30;
          badgeFa = 'میان‌وعده پیشنهادی';
          reasonFa = currentIsSaffronOrNutty
            ? 'بافت کره‌ای و ترد این انتخاب، رایحه زعفران، پسته و اسپرسو را به‌زیبایی برجسته می‌کند.'
            : 'تردی لایه‌ای و طعم متعادل این میان‌وعده با تلخی ملایم و عطر قهوه کاملاً هم‌خوانی دارد.';
        } else if (isColdDrinkItem(currentItem, currentCatName)) {
          score += 24;
          badgeFa = 'خوراک مکمل طراوت';
          reasonFa =
            'طعم‌های غنی و ادویه‌دار این غذا در کنار خنکی و نت‌های مرکباتی نوشیدنی شما تعادل فوق‌العاده‌ای می‌سازد.';
        } else {
          badgeFa = 'غذای پیشنهادی سرآشپز';
          reasonFa =
            'هم‌نشینی عطر برشته نوشیدنی گرم با بافت دلپذیر این خوراک، یک ترکیب کامل سرمیز می‌آفریند.';
        }
      }
    }

    // Ingredient synergy bonuses
    if (
      (currentCorpus.includes('ترافل') || currentCorpus.includes('پاستا')) &&
      (candCorpus.includes('پرتقال') || candCorpus.includes('تونیک') || candCorpus.includes('رزماری'))
    ) {
      score += 16;
      reasonFa =
        'رزماری و مرکبات تلخ-شیرین، عطر خاکی ترافل سیاه و سس خامه‌ای قارچ را به‌طرز چشمگیری باز می‌کند.';
    }

    if (
      (currentCorpus.includes('سالمون') || currentCorpus.includes('آووکادو')) &&
      (candCorpus.includes('زعفران') || candCorpus.includes('پسته') || candCorpus.includes('پرتقال'))
    ) {
      score += 14;
    }

    return {
      item: candidate,
      categoryLabel: candCatName || 'منوی کافه من',
      badgeFa,
      reasonFa,
      score,
    };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map(({ item, categoryLabel, badgeFa, reasonFa }) => ({
    item,
    categoryLabel,
    badgeFa,
    reasonFa,
  }));
}
