export interface PersianFontPreset {
  id: string;
  nameFa: string;
  badge: string;
  descriptionFa: string;
  sampleFa: string;
  cssFamily: string;
}

export interface EnglishFontPreset {
  id: string;
  nameFa: string;
  nameEn: string;
  badge: string;
  descriptionFa: string;
  sampleEn: string;
  cssFamily: string;
}

export const PERSIAN_FONT_PRESETS: PersianFontPreset[] = [
  {
    id: 'vazirmatn',
    nameFa: 'وزیرمتن (Vazirmatn)',
    badge: 'پیش‌فرض مدرن',
    descriptionFa: 'متعادل، بسیار خوانا و استاندارد برای منوهای دیجیتال مدرن',
    sampleFa: 'عطر تازه قهوه تخصصی و شیرینی‌های دست‌ساز کافه من',
    cssFamily: "'Vazirmatn', system-ui, -apple-system, sans-serif",
  },
  {
    id: 'markazi',
    nameFa: 'مرکزی (Markazi Text)',
    badge: 'کلاسیک کافه‌نشینی',
    descriptionFa: 'خوش‌تراش، باوقار و الهام‌گرفته از منوهای ادبی و کلاسیک',
    sampleFa: 'عطر تازه قهوه تخصصی و شیرینی‌های دست‌ساز کافه من',
    cssFamily: "'Markazi Text', 'Vazirmatn', serif",
  },
  {
    id: 'noto-naskh',
    nameFa: 'نوتو نسخ (Noto Naskh)',
    badge: 'نسخ نشریاتی',
    descriptionFa: 'نسخ منظم و لطیف با کنتراست خوانا برای توضیحات طولانی',
    sampleFa: 'عطر تازه قهوه تخصصی و شیرینی‌های دست‌ساز کافه من',
    cssFamily: "'Noto Naskh Arabic', 'Vazirmatn', serif",
  },
  {
    id: 'lalezar',
    nameFa: 'لاله‌زار (Lalezar)',
    badge: 'نمایشی و پرانرژی',
    descriptionFa: 'ضخیم، جسور و چشمگیر با هویت کافه‌های هنری و مدرن',
    sampleFa: 'عطر تازه قهوه تخصصی و شیرینی‌های دست‌ساز کافه من',
    cssFamily: "'Lalezar', 'Vazirmatn', sans-serif",
  },
  {
    id: 'gulzar',
    nameFa: 'گلزار (Gulzar)',
    badge: 'نستعلیق و شاعرانه',
    descriptionFa: 'حال‌وهوای دست‌نویس، گرم و سنتی مناسب منوهای اصیل ایرانی',
    sampleFa: 'عطر تازه قهوه تخصصی و شیرینی‌های دست‌ساز کافه من',
    cssFamily: "'Gulzar', 'Vazirmatn', serif",
  },
];

export const ENGLISH_FONT_PRESETS: EnglishFontPreset[] = [
  {
    id: 'cormorant',
    nameFa: 'کورمورانت گاراموند',
    nameEn: 'Cormorant Garamond',
    badge: 'سرمقاله‌ای پیش‌فرض',
    descriptionFa: 'سریفی ظریف و ایتالیک برای زیرنویس‌های لاتین و عناوین برند',
    sampleEn: 'Specialty Coffee & Artisan Pastries · Roasted Daily',
    cssFamily: "'Cormorant Garamond', Georgia, serif",
  },
  {
    id: 'playfair',
    nameFa: 'پلی‌فر دیسپلی',
    nameEn: 'Playfair Display',
    badge: 'مجلل و اصیل',
    descriptionFa: 'پرکنتراست و لوکس مناسب برندینگ کافه‌های بوتیک',
    sampleEn: 'Specialty Coffee & Artisan Pastries · Roasted Daily',
    cssFamily: "'Playfair Display', Georgia, serif",
  },
  {
    id: 'lora',
    nameFa: 'لورا (Lora)',
    nameEn: 'Lora Serif',
    badge: 'گرم و کلاسیک',
    descriptionFa: 'سریفی نرم، متوازن و صمیمی با خوانایی بالا',
    sampleEn: 'Specialty Coffee & Artisan Pastries · Roasted Daily',
    cssFamily: "'Lora', Georgia, serif",
  },
  {
    id: 'plus-jakarta',
    nameFa: 'پلاس جاکارتا',
    nameEn: 'Plus Jakarta Sans',
    badge: 'مینیمال مدرن',
    descriptionFa: 'سن‌سریف تمیز و هندسی برای استایل کاملاً امروزی',
    sampleEn: 'Specialty Coffee & Artisan Pastries · Roasted Daily',
    cssFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
  },
  {
    id: 'space-grotesk',
    nameFa: 'اسپیس گروتسک',
    nameEn: 'Space Grotesk',
    badge: 'معاصر و خاص',
    descriptionFa: 'کاراکتر متمایز و استودیویی برای کافی‌شاپ‌های تخصصی موج سوم',
    sampleEn: 'Specialty Coffee & Artisan Pastries · Roasted Daily',
    cssFamily: "'Space Grotesk', system-ui, sans-serif",
  },
];

export function getPersianFontPreset(id?: string): PersianFontPreset {
  return PERSIAN_FONT_PRESETS.find((f) => f.id === id) ?? PERSIAN_FONT_PRESETS[0];
}

export function getEnglishFontPreset(id?: string): EnglishFontPreset {
  return ENGLISH_FONT_PRESETS.find((f) => f.id === id) ?? ENGLISH_FONT_PRESETS[0];
}

export function applyAppFonts(fontFa?: string, fontEn?: string): void {
  if (typeof document === 'undefined') return;
  const fa = getPersianFontPreset(fontFa);
  const en = getEnglishFontPreset(fontEn);
  const root = document.documentElement;
  root.style.setProperty('--font-sans', fa.cssFamily);
  root.style.setProperty('--font-serif', en.cssFamily);
  document.body.style.fontFamily = fa.cssFamily;
}
