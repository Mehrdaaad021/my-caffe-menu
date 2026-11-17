import type { AppContentOverrides, MenuDatabase } from '@/src/types/menu';

export type MenuLanguage = 'fa' | 'en';

export interface TranslatedContentOverrides {
  navFeaturedLabel?: string;
  navCatalogLabel?: string;
  navInfoLabel?: string;
  headerShareLabel?: string;
  headerTrayLabel?: string;
  heroTitleFa?: string;
  heroSubtitleFa?: string;
  searchPlaceholderFa?: string;
  heroFilterSignatureLabelFa?: string;
  heroPrimaryCtaFa?: string;
  heroSecondaryCtaFa?: string;
  heroHighlight1Fa?: string;
  heroHighlight2Fa?: string;
  heroHighlight3Fa?: string;
  heroQualityBadgeFa?: string;
  heroFeaturedLabelFa?: string;
  heroFeaturedActionFa?: string;
  craftPillar1TitleFa?: string;
  craftPillar1DescFa?: string;
  craftPillar2TitleFa?: string;
  craftPillar2DescFa?: string;
  craftPillar3TitleFa?: string;
  craftPillar3DescFa?: string;
  craftPillar4TitleFa?: string;
  craftPillar4DescFa?: string;
  popularTitleFa?: string;
  popularActionFa?: string;
  catalogTitleFa?: string;
  catalogAllChaptersFa?: string;
  menuGridViewLabelFa?: string;
  menuListViewLabelFa?: string;
  emptySearchTitleFa?: string;
  infoSectionTitleFa?: string;
  infoAddressTitleFa?: string;
  infoHoursTitleFa?: string;
  infoPhoneTitleFa?: string;
  infoQrTitleFa?: string;
  infoQrDescFa?: string;
  footerCopyFa?: string;
}

export interface EnglishMenuTranslation {
  signature: string;
  settings: {
    nameEn: string;
    taglineEn: string;
    addressEn: string;
    hoursEn: string;
    currencyLabelEn: string;
  };
  categories: Array<{
    id: string;
    nameEn: string;
  }>;
  items: Array<{
    id: string;
    nameEn: string;
    descriptionEn: string;
    ingredientsEn: string[];
  }>;
  contentOverrides?: TranslatedContentOverrides;
}

export const DEFAULT_ENGLISH_APP_CONTENT: Required<AppContentOverrides> = {
  brandLogoUrl: '',
  heroFeaturedImageUrl: '',
  menuBannerImageUrl: '',
  infoSectionImageUrl: '',
  navFeaturedLabel: 'Signature Picks',
  navCatalogLabel: 'Full Menu',
  navInfoLabel: 'Visit & Info',
  headerShareLabel: 'Share',
  headerTrayLabel: 'Order Tray',
  heroBadgeEn: 'Handcrafted Paper Menu',
  heroTitleFa: 'Coffee you fall in love with from the very first sip',
  heroSubtitleFa: '',
  searchPlaceholderFa: 'Search drinks, dishes, or ingredients...',
  heroFilterSignatureLabelFa: 'Signatures',
  heroPrimaryCtaFa: 'Explore Menu',
  heroSecondaryCtaFa: 'Chef & Barista Reserve',
  heroHighlight1Fa: 'Specialty Coffee',
  heroHighlight2Fa: 'Crafted with Love',
  heroHighlight3Fa: 'Cozy Daily Atmosphere',
  heroQualityBadgeFa: '100% Arabica',
  heroFeaturedTagEn: 'Chef & Barista Reserve',
  heroFeaturedLabelFa: "Today's Special",
  heroFeaturedActionFa: '3D View & Order',
  craftPillar1TitleFa: 'Hand-Picked Beans',
  craftPillar1DescFa: 'Direct partnerships with top specialty farms and boutique roasteries.',
  craftPillar2TitleFa: 'Fresh Weekly Roast',
  craftPillar2DescFa: 'Small-batch weekly roasting to preserve authentic aroma and crema.',
  craftPillar3TitleFa: 'Master Baristas',
  craftPillar3DescFa: 'Dedicated craftspeople brewing every cup with precision and care.',
  craftPillar4TitleFa: 'Warm & Cozy Space',
  craftPillar4DescFa: 'Inviting architecture, natural light, and freshly ground coffee aroma.',
  popularEyebrowEn: 'Signature Paper Collection',
  popularTitleFa: 'Barista & Chef Selections',
  popularActionFa: 'All Menu Chapters',
  catalogEyebrowEn: 'The Layered Espresso & Culinary Book',
  catalogTitleFa: 'Complete Menu Book',
  catalogAllChaptersFa: 'All Chapters',
  menuGridViewLabelFa: 'Paper Gallery',
  menuListViewLabelFa: 'Classic List',
  emptySearchTitleFa: 'No matching dish or drink found',
  infoSectionTitleFa: 'Contact & Visiting Info',
  infoAddressTitleFa: 'Address',
  infoHoursTitleFa: 'Opening Hours',
  infoPhoneTitleFa: 'Reservation & Phone',
  infoPhoneValueFa: '021-88441290',
  infoQrTitleFa: 'Table-Side Ordering',
  infoQrDescFa: 'All prices, ingredients, and item availability update live from our bar & kitchen.',
  footerCopyFa: 'All rights reserved.',
  footerTaglineEn: 'Layered Paper Craft Menu',
};

export function applyEnglishMenuTranslation(
  menu: MenuDatabase,
  baseAppContent: Required<AppContentOverrides>,
  translation: EnglishMenuTranslation,
): { menu: MenuDatabase; appContent: Required<AppContentOverrides> } {
  const catMap = new Map(translation.categories.map((c) => [c.id, c.nameEn]));
  const itemMap = new Map(translation.items.map((i) => [i.id, i]));

  const localizedMenu: MenuDatabase = {
    ...menu,
    settings: {
      ...menu.settings,
      nameFa: translation.settings.nameEn || menu.settings.nameEn || menu.settings.nameFa,
      taglineFa: translation.settings.taglineEn || menu.settings.taglineFa,
      addressFa: translation.settings.addressEn || menu.settings.addressFa,
      hoursFa: translation.settings.hoursEn || menu.settings.hoursFa,
      currencyLabel: translation.settings.currencyLabelEn || 'Toman',
    },
    categories: menu.categories.map((cat) => ({
      ...cat,
      nameFa: catMap.get(cat.id) || cat.nameEn || cat.nameFa,
    })),
    items: menu.items.map((item) => {
      const tr = itemMap.get(item.id);
      return {
        ...item,
        nameFa: tr?.nameEn || item.nameEn || item.nameFa,
        descriptionFa: tr?.descriptionEn || item.descriptionFa,
        ingredientsFa:
          tr?.ingredientsEn && tr.ingredientsEn.length > 0 ? tr.ingredientsEn : item.ingredientsFa,
      };
    }),
  };

  const trOverrides = translation.contentOverrides ?? {};
  const hasCustomOverride = (key: keyof AppContentOverrides) =>
    Boolean(menu.contentOverrides?.[key]?.trim());

  const pickContent = (key: keyof TranslatedContentOverrides & keyof AppContentOverrides) => {
    if (hasCustomOverride(key) && trOverrides[key]?.trim()) {
      return trOverrides[key]!.trim();
    }
    return DEFAULT_ENGLISH_APP_CONTENT[key] || baseAppContent[key];
  };

  const localizedAppContent: Required<AppContentOverrides> = {
    ...baseAppContent,
    navFeaturedLabel: pickContent('navFeaturedLabel'),
    navCatalogLabel: pickContent('navCatalogLabel'),
    navInfoLabel: pickContent('navInfoLabel'),
    headerShareLabel: pickContent('headerShareLabel'),
    headerTrayLabel: pickContent('headerTrayLabel'),
    heroTitleFa: pickContent('heroTitleFa'),
    heroSubtitleFa: hasCustomOverride('heroSubtitleFa')
      ? trOverrides.heroSubtitleFa?.trim() || localizedMenu.settings.taglineFa
      : localizedMenu.settings.taglineFa,
    searchPlaceholderFa: pickContent('searchPlaceholderFa'),
    heroFilterSignatureLabelFa: pickContent('heroFilterSignatureLabelFa'),
    heroPrimaryCtaFa: pickContent('heroPrimaryCtaFa'),
    heroSecondaryCtaFa: pickContent('heroSecondaryCtaFa'),
    heroHighlight1Fa: pickContent('heroHighlight1Fa'),
    heroHighlight2Fa: pickContent('heroHighlight2Fa'),
    heroHighlight3Fa: pickContent('heroHighlight3Fa'),
    heroQualityBadgeFa: pickContent('heroQualityBadgeFa'),
    heroFeaturedLabelFa: pickContent('heroFeaturedLabelFa'),
    heroFeaturedActionFa: pickContent('heroFeaturedActionFa'),
    craftPillar1TitleFa: pickContent('craftPillar1TitleFa'),
    craftPillar1DescFa: pickContent('craftPillar1DescFa'),
    craftPillar2TitleFa: pickContent('craftPillar2TitleFa'),
    craftPillar2DescFa: pickContent('craftPillar2DescFa'),
    craftPillar3TitleFa: pickContent('craftPillar3TitleFa'),
    craftPillar3DescFa: pickContent('craftPillar3DescFa'),
    craftPillar4TitleFa: pickContent('craftPillar4TitleFa'),
    craftPillar4DescFa: pickContent('craftPillar4DescFa'),
    popularTitleFa: pickContent('popularTitleFa'),
    popularActionFa: pickContent('popularActionFa'),
    catalogTitleFa: pickContent('catalogTitleFa'),
    catalogAllChaptersFa: pickContent('catalogAllChaptersFa'),
    menuGridViewLabelFa: pickContent('menuGridViewLabelFa'),
    menuListViewLabelFa: pickContent('menuListViewLabelFa'),
    emptySearchTitleFa: pickContent('emptySearchTitleFa'),
    infoSectionTitleFa: pickContent('infoSectionTitleFa'),
    infoAddressTitleFa: pickContent('infoAddressTitleFa'),
    infoHoursTitleFa: pickContent('infoHoursTitleFa'),
    infoPhoneTitleFa: pickContent('infoPhoneTitleFa'),
    infoQrTitleFa: pickContent('infoQrTitleFa'),
    infoQrDescFa: pickContent('infoQrDescFa'),
    footerCopyFa: pickContent('footerCopyFa'),
  };

  return { menu: localizedMenu, appContent: localizedAppContent };
}

export function getUiStrings(lang: MenuLanguage) {
  if (lang === 'en') {
    return {
      isEn: true,
      tableTag: (n: number) => `Table ${n}`,
      servedDirectlyTable: (n: number) => `Served directly to Table #${n}`,
      shareTitle: 'Share menu with friends',
      galleryView: 'Paper Gallery',
      listView: 'Classic List',
      itemsUnit: 'items',
      itemFallbackCategory: 'Signature Pick',
      noItemFoundTitle: 'No matching dish or drink found',
      resetMenuBtn: 'Reset & Show All Menu',
      scrollTopLabel: 'Back to top',
      viewTrayLabel: (count: number) => `View Order Tray (${count})`,
      trayShortLabel: (count: number) => `Tray (${count})`,
      addedToast: (name: string) => `${name} added to tray`,
      translateBtnLabel: 'فارسی',
      translateBtnAria: 'Switch menu language to Persian',
      translatingLabel: 'Translating...',
      minutesUnit: 'min',
      caloriesUnit: 'kcal',
      addShort: 'Add',
      soldOut: 'Sold Out',
      signatureShort: 'Signature',
      houseSignature: 'House Signature',
      craftPillars: [
        {
          title: 'Hand-Picked Beans',
          desc: 'Direct partnerships with top specialty farms and boutique roasteries.',
        },
        {
          title: 'Fresh Weekly Roast',
          desc: 'Small-batch weekly roasting to preserve authentic aroma and crema.',
        },
        {
          title: 'Master Baristas',
          desc: 'Dedicated craftspeople brewing every cup with precision and care.',
        },
        {
          title: 'Warm & Cozy Space',
          desc: 'Inviting architecture, natural light, and freshly ground coffee aroma.',
        },
      ],
      modal: {
        ingredientsTitle: 'Layers & Ingredients',
        sizeTitleDrink: 'Serving Size',
        sizeTitleFood: 'Portion Size',
        sizeChoicesDrink: ['Small', 'Medium', 'Large'],
        sizeChoicesFood: ['Single', 'Double Special'],
        milkTitleDrink: 'Milk & Texture',
        milkTitleFood: 'Serving Preference',
        milkChoicesDrink: ['Regular Milk', 'Oat Milk', 'Almond Milk', 'Light Sugar'],
        milkChoicesFood: ['Standard Serve', 'Extra Truffle Sauce', 'No Onion'],
        noteLabel: 'Special Note (Optional)',
        notePlaceholder: 'e.g., milder temperature or serve together...',
        pairingHeader: 'Flavor Pairing Suggestion',
        addPairing: 'Add Pairing',
        addedPairing: 'Added',
        addToTray: 'Add to Order Tray',
        unavailable: 'This item is currently sold out.',
        arButton: 'AR View on Table',
        rotateLeft: 'Left',
        rotateRight: 'Right',
        resetView: 'Reset',
        hintDrag: 'Drag or move pointer to inspect in 3D',
      },
      tray: {
        title: 'Your Order Tray',
        steps: ['Selected', 'Submitted', 'Preparing', 'Ready'],
        tableLabel: 'Serving Table',
        takeawayOption: 'Select Table (or Takeaway)',
        tableOption: (n: number) => `Table #${n}`,
        orderSlip: (num: string) => `Order Ticket #${num}`,
        takeawayTag: 'Takeaway',
        totalRecorded: 'Total Recorded',
        newOrderBtn: 'Place New Order',
        emptyTitle: 'Your order tray is empty',
        emptyDesc: 'Choose drinks and dishes from the menu to add them to your table order.',
        noteLabel: 'Overall Order Note (Optional)',
        notePlaceholder: 'e.g., serve drinks together',
        subtotal: 'Subtotal',
        serviceFee: (pct: number) => `Service Charge (${pct}%)`,
        finalTotal: 'Final Total',
        submitting: 'Submitting Order...',
        submitBtn: 'Confirm & Send Order',
        clearBtn: 'Clear',
        suggestionsTitle: 'Complementary Picks for Your Tray',
        suggestionsSub: 'Curated from flavor notes of items in your tray',
        statusMap: {
          pending: 'Order received and sent to bar & kitchen',
          preparing: 'Barista and kitchen are preparing your order',
          ready: 'Your order is ready for table service',
          completed: 'Order completed and served',
          cancelled: 'This order was cancelled',
        },
      },
    };
  }

  return {
    isEn: false,
    tableTag: (n: number) => `میز ${n}`,
    servedDirectlyTable: (n: number) => `سرو مستقیم روی میز شماره ${n}`,
    shareTitle: 'اشتراک‌گذاری منو با دوستان',
    galleryView: 'گالری کاغذی',
    listView: 'لیست کلاسیک',
    itemsUnit: 'آیتم',
    itemFallbackCategory: 'انتخاب ویژه',
    noItemFoundTitle: 'آیتمی مطابق جستجو یا فیلتر شما یافت نشد',
    resetMenuBtn: 'بازنشانی و نمایش همه منو',
    scrollTopLabel: 'بازگشت به بالا',
    viewTrayLabel: (count: number) => `مشاهده سینی سفارش (${count})`,
    trayShortLabel: (count: number) => `سینی (${count})`,
    addedToast: (name: string) => `${name} به سینی اضافه شد`,
    translateBtnLabel: 'EN',
    translateBtnAria: 'ترجمه خودکار منو به انگلیسی',
    translatingLabel: 'در حال ترجمه...',
    minutesUnit: 'دقیقه',
    caloriesUnit: 'کالری',
    addShort: 'افزودن',
    soldOut: 'اتمام موجودی',
    signatureShort: 'ویژه',
    houseSignature: 'دست‌ساز ویژه',
    craftPillars: [
      {
        title: 'دانه‌های دست‌چین',
        desc: 'همکاری مستقیم با برترین مزارع و برشته‌کاری‌های تخصصی دنیا.',
      },
      {
        title: 'برشته‌کاری تازه',
        desc: 'رُست هفتگی در حجم‌های محدود برای حفظ عطر و رایحه اصیل دانه.',
      },
      {
        title: 'باریستاهای مجرب',
        desc: 'حرفه‌ای‌هایی که هر فنجان را با دقت، حوصله و استاندارد جهانی دم می‌کنند.',
      },
      {
        title: 'فضای دنج و آرام',
        desc: 'معماری گرم، نور طبیعی و عطر قهوه‌ی تازه برای لحظه‌های ناب شما.',
      },
    ],
    modal: {
      ingredientsTitle: 'لایه‌ها و ترکیبات',
      sizeTitleDrink: 'انتخاب سایز سرو',
      sizeTitleFood: 'انتخاب پرس',
      sizeChoicesDrink: ['کوچک', 'متوسط', 'بزرگ'],
      sizeChoicesFood: ['تک‌نفره', 'دوبل ویژه'],
      milkTitleDrink: 'نوع شیر و بافت سرو',
      milkTitleFood: 'شخصی‌سازی سرو',
      milkChoicesDrink: ['شیر معمولی', 'شیر جو دوسر', 'شیر بادام', 'کم‌شکر'],
      milkChoicesFood: ['سرو استاندارد', 'سس ترافل اضافه', 'بدون پیاز'],
      noteLabel: 'یادداشت اختصاصی (اختیاری)',
      notePlaceholder: 'مثلاً: دمای ملایم‌تر یا سرو هم‌زمان...',
      pairingHeader: 'پیشنهاد جفت‌سازی طعم (Food Pairing)',
      addPairing: 'افزودن مکمل',
      addedPairing: 'اضافه شد',
      addToTray: 'افزودن به سینی سفارش',
      unavailable: 'این آیتم در حال حاضر ناموجود است.',
      arButton: 'نمایش روی میز (AR)',
      rotateLeft: 'چپ',
      rotateRight: 'راست',
      resetView: 'بازنشانی',
      hintDrag: 'برای زاویه سه‌بعدی، نشانگر را روی تصویر حرکت دهید',
    },
    tray: {
      title: 'سینی سفارش شما',
      steps: ['انتخاب شده', 'ثبت سفارش', 'آماده‌سازی', 'آماده سرو'],
      tableLabel: 'شماره میز سرو',
      takeawayOption: 'انتخاب میز (یا بیرون‌بر)',
      tableOption: (n: number) => `میز شماره ${n}`,
      orderSlip: (num: string) => `فیش سفارش #${num}`,
      takeawayTag: 'بیرون‌بر',
      totalRecorded: 'مبلغ کل ثبت‌شده',
      newOrderBtn: 'ثبت سفارش جدید',
      emptyTitle: 'سینی سفارش شما خالی است',
      emptyDesc: 'از منو نوشیدنی‌ها و غذاهای دلخواه را انتخاب کنید تا روی کارت سفارش میز قرار گیرند.',
      noteLabel: 'توضیحات کلی سفارش (اختیاری)',
      notePlaceholder: 'مثلاً: سرو هم‌زمان نوشیدنی‌ها',
      subtotal: 'جمع سفارش',
      serviceFee: (pct: number) => `حق سرویس (${pct}٪)`,
      finalTotal: 'مبلغ نهایی',
      submitting: 'در حال ارسال سفارش...',
      submitBtn: 'ثبت نهایی سفارش',
      clearBtn: 'پاک کردن',
      suggestionsTitle: 'پیشنهادهای مکمل برای سینی شما',
      suggestionsSub: 'انتخاب‌شده بر اساس ترکیب طعم آیتم‌های فعلی سینی',
      statusMap: {
        pending: 'سفارش ثبت شد و به بار و آشپزخانه ارسال گردید',
        preparing: 'باریستا و آشپزخانه در حال آماده‌سازی هستند',
        ready: 'سفارش آماده سرو روی میز شماست',
        completed: 'سفارش تکمیل و سرو شد',
        cancelled: 'این سفارش لغو شده است',
      },
    },
  };
}
