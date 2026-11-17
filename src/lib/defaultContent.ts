import type { AppContentOverrides, RestaurantSettings } from '@/src/types/menu';

export const DEFAULT_APP_CONTENT: Required<AppContentOverrides> = {
  brandLogoUrl: '',
  heroFeaturedImageUrl: '',
  menuBannerImageUrl: '',
  infoSectionImageUrl: '',
  navFeaturedLabel: 'برگزیده کافه من',
  navCatalogLabel: 'دفترچه منو',
  navInfoLabel: 'اطلاعات تماس',
  headerShareLabel: 'اشتراک‌گذاری',
  headerTrayLabel: 'سینی سفارش',
  heroBadgeEn: 'Handcrafted Paper Menu',
  heroTitleFa: 'قهوه‌ای که از اولین جرعه عاشقش می‌شوید',
  heroSubtitleFa: '',
  searchPlaceholderFa: 'جستجوی نام نوشیدنی، غذا یا ترکیبات...',
  heroFilterSignatureLabelFa: 'برگزیده‌ها',
  heroPrimaryCtaFa: 'مشاهده منو',
  heroSecondaryCtaFa: 'منتخب سرآشپز و باریستا',
  heroHighlight1Fa: 'قهوه تخصصی',
  heroHighlight2Fa: 'تهیه با عشق',
  heroHighlight3Fa: 'دنج همه‌روزه',
  heroQualityBadgeFa: '۱۰۰٪ عربیکا',
  heroFeaturedTagEn: 'Chef & Barista Reserve',
  heroFeaturedLabelFa: 'پیشنهاد ویژه امروز',
  heroFeaturedActionFa: 'نمای سه‌بعدی و سفارش',
  craftPillar1TitleFa: 'دانه‌های دست‌چین',
  craftPillar1DescFa: 'همکاری مستقیم با برترین مزارع و برشته‌کاری‌های تخصصی دنیا.',
  craftPillar2TitleFa: 'برشته‌کاری تازه',
  craftPillar2DescFa: 'رُست هفتگی در حجم‌های محدود برای حفظ عطر و رایحه اصیل دانه.',
  craftPillar3TitleFa: 'باریستاهای مجرب',
  craftPillar3DescFa: 'حرفه‌ای‌هایی که هر فنجان را با دقت، حوصله و استاندارد جهانی دم می‌کنند.',
  craftPillar4TitleFa: 'فضای دنج و آرام',
  craftPillar4DescFa: 'معماری گرم، نور طبیعی و عطر قهوه‌ی تازه برای لحظه‌های ناب شما.',
  popularEyebrowEn: 'Signature Paper Collection',
  popularTitleFa: 'برگزیده‌های باریستا و سرآشپز',
  popularActionFa: 'همه فصل‌های منو',
  catalogEyebrowEn: 'The Layered Espresso & Culinary Book',
  catalogTitleFa: 'دفترچه کامل منو',
  catalogAllChaptersFa: 'همه فصل‌ها',
  menuGridViewLabelFa: 'گالری کاغذی',
  menuListViewLabelFa: 'لیست کلاسیک',
  emptySearchTitleFa: 'آیتمی مطابق جستجو یا فیلتر شما یافت نشد',
  infoSectionTitleFa: 'اطلاعات تماس و بازدید حضوری',
  infoAddressTitleFa: 'نشانی عمارت',
  infoHoursTitleFa: 'ساعات پذیرایی',
  infoPhoneTitleFa: 'تلفن رزرو و تماس',
  infoPhoneValueFa: '۰۲۱-۸۸۴۴۱۲۹۰',
  infoQrTitleFa: 'سفارش مستقیم سرمیز',
  infoQrDescFa: 'تمامی قیمت‌ها، ترکیبات و موجودی منو هم‌زمان از بار و آشپزخانه به‌روزرسانی می‌شوند.',
  footerCopyFa: 'تمامی حقوق محفوظ است.',
  footerTaglineEn: 'Layered Paper Craft Menu',
};

export function resolveAppContent(
  settings?: Partial<RestaurantSettings>,
  overrides?: AppContentOverrides,
): Required<AppContentOverrides> {
  const clean = (val: string | undefined, fallback: string) =>
    val && val.trim().length > 0 ? val.trim() : fallback;

  return {
    brandLogoUrl: clean(overrides?.brandLogoUrl, DEFAULT_APP_CONTENT.brandLogoUrl),
    heroFeaturedImageUrl: clean(
      overrides?.heroFeaturedImageUrl,
      DEFAULT_APP_CONTENT.heroFeaturedImageUrl,
    ),
    menuBannerImageUrl: clean(
      overrides?.menuBannerImageUrl,
      DEFAULT_APP_CONTENT.menuBannerImageUrl,
    ),
    infoSectionImageUrl: clean(
      overrides?.infoSectionImageUrl,
      DEFAULT_APP_CONTENT.infoSectionImageUrl,
    ),
    navFeaturedLabel: clean(overrides?.navFeaturedLabel, DEFAULT_APP_CONTENT.navFeaturedLabel),
    navCatalogLabel: clean(overrides?.navCatalogLabel, DEFAULT_APP_CONTENT.navCatalogLabel),
    navInfoLabel: clean(overrides?.navInfoLabel, DEFAULT_APP_CONTENT.navInfoLabel),
    headerShareLabel: clean(overrides?.headerShareLabel, DEFAULT_APP_CONTENT.headerShareLabel),
    headerTrayLabel: clean(overrides?.headerTrayLabel, DEFAULT_APP_CONTENT.headerTrayLabel),
    heroBadgeEn: clean(overrides?.heroBadgeEn, DEFAULT_APP_CONTENT.heroBadgeEn),
    heroTitleFa: clean(overrides?.heroTitleFa, DEFAULT_APP_CONTENT.heroTitleFa),
    heroSubtitleFa: clean(overrides?.heroSubtitleFa, settings?.taglineFa ?? ''),
    searchPlaceholderFa: clean(
      overrides?.searchPlaceholderFa,
      DEFAULT_APP_CONTENT.searchPlaceholderFa,
    ),
    heroFilterSignatureLabelFa: clean(
      overrides?.heroFilterSignatureLabelFa,
      DEFAULT_APP_CONTENT.heroFilterSignatureLabelFa,
    ),
    heroPrimaryCtaFa: clean(overrides?.heroPrimaryCtaFa, DEFAULT_APP_CONTENT.heroPrimaryCtaFa),
    heroSecondaryCtaFa: clean(
      overrides?.heroSecondaryCtaFa,
      DEFAULT_APP_CONTENT.heroSecondaryCtaFa,
    ),
    heroHighlight1Fa: clean(overrides?.heroHighlight1Fa, DEFAULT_APP_CONTENT.heroHighlight1Fa),
    heroHighlight2Fa: clean(overrides?.heroHighlight2Fa, DEFAULT_APP_CONTENT.heroHighlight2Fa),
    heroHighlight3Fa: clean(overrides?.heroHighlight3Fa, DEFAULT_APP_CONTENT.heroHighlight3Fa),
    heroQualityBadgeFa: clean(
      overrides?.heroQualityBadgeFa,
      DEFAULT_APP_CONTENT.heroQualityBadgeFa,
    ),
    heroFeaturedTagEn: clean(overrides?.heroFeaturedTagEn, DEFAULT_APP_CONTENT.heroFeaturedTagEn),
    heroFeaturedLabelFa: clean(
      overrides?.heroFeaturedLabelFa,
      DEFAULT_APP_CONTENT.heroFeaturedLabelFa,
    ),
    heroFeaturedActionFa: clean(
      overrides?.heroFeaturedActionFa,
      DEFAULT_APP_CONTENT.heroFeaturedActionFa,
    ),
    craftPillar1TitleFa: clean(
      overrides?.craftPillar1TitleFa,
      DEFAULT_APP_CONTENT.craftPillar1TitleFa,
    ),
    craftPillar1DescFa: clean(
      overrides?.craftPillar1DescFa,
      DEFAULT_APP_CONTENT.craftPillar1DescFa,
    ),
    craftPillar2TitleFa: clean(
      overrides?.craftPillar2TitleFa,
      DEFAULT_APP_CONTENT.craftPillar2TitleFa,
    ),
    craftPillar2DescFa: clean(
      overrides?.craftPillar2DescFa,
      DEFAULT_APP_CONTENT.craftPillar2DescFa,
    ),
    craftPillar3TitleFa: clean(
      overrides?.craftPillar3TitleFa,
      DEFAULT_APP_CONTENT.craftPillar3TitleFa,
    ),
    craftPillar3DescFa: clean(
      overrides?.craftPillar3DescFa,
      DEFAULT_APP_CONTENT.craftPillar3DescFa,
    ),
    craftPillar4TitleFa: clean(
      overrides?.craftPillar4TitleFa,
      DEFAULT_APP_CONTENT.craftPillar4TitleFa,
    ),
    craftPillar4DescFa: clean(
      overrides?.craftPillar4DescFa,
      DEFAULT_APP_CONTENT.craftPillar4DescFa,
    ),
    popularEyebrowEn: clean(overrides?.popularEyebrowEn, DEFAULT_APP_CONTENT.popularEyebrowEn),
    popularTitleFa: clean(overrides?.popularTitleFa, DEFAULT_APP_CONTENT.popularTitleFa),
    popularActionFa: clean(overrides?.popularActionFa, DEFAULT_APP_CONTENT.popularActionFa),
    catalogEyebrowEn: clean(overrides?.catalogEyebrowEn, DEFAULT_APP_CONTENT.catalogEyebrowEn),
    catalogTitleFa: clean(overrides?.catalogTitleFa, DEFAULT_APP_CONTENT.catalogTitleFa),
    catalogAllChaptersFa: clean(
      overrides?.catalogAllChaptersFa,
      DEFAULT_APP_CONTENT.catalogAllChaptersFa,
    ),
    menuGridViewLabelFa: clean(
      overrides?.menuGridViewLabelFa,
      DEFAULT_APP_CONTENT.menuGridViewLabelFa,
    ),
    menuListViewLabelFa: clean(
      overrides?.menuListViewLabelFa,
      DEFAULT_APP_CONTENT.menuListViewLabelFa,
    ),
    emptySearchTitleFa: clean(
      overrides?.emptySearchTitleFa,
      DEFAULT_APP_CONTENT.emptySearchTitleFa,
    ),
    infoSectionTitleFa: clean(
      overrides?.infoSectionTitleFa,
      DEFAULT_APP_CONTENT.infoSectionTitleFa,
    ),
    infoAddressTitleFa: clean(
      overrides?.infoAddressTitleFa,
      DEFAULT_APP_CONTENT.infoAddressTitleFa,
    ),
    infoHoursTitleFa: clean(overrides?.infoHoursTitleFa, DEFAULT_APP_CONTENT.infoHoursTitleFa),
    infoPhoneTitleFa: clean(overrides?.infoPhoneTitleFa, DEFAULT_APP_CONTENT.infoPhoneTitleFa),
    infoPhoneValueFa: clean(overrides?.infoPhoneValueFa, DEFAULT_APP_CONTENT.infoPhoneValueFa),
    infoQrTitleFa: clean(overrides?.infoQrTitleFa, DEFAULT_APP_CONTENT.infoQrTitleFa),
    infoQrDescFa: clean(overrides?.infoQrDescFa, DEFAULT_APP_CONTENT.infoQrDescFa),
    footerCopyFa: clean(overrides?.footerCopyFa, DEFAULT_APP_CONTENT.footerCopyFa),
    footerTaglineEn: clean(overrides?.footerTaglineEn, DEFAULT_APP_CONTENT.footerTaglineEn),
  };
}
