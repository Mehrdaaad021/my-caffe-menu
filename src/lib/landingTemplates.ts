import type { LandingTemplateId } from '@/src/types/menu';

export interface LandingTemplatePreset {
  id: LandingTemplateId;
  titleFa: string;
  subtitleEn: string;
  layoutTagFa: string;
  descriptionFa: string;
  swatches: [string, string, string, string];
  headerTone: 'light' | 'dark';
  headerBg: string;
  popularBg: string;
  waveBackFill: string;
  waveFrontFill: string;
  canvasBg: string;
}

export const LANDING_TEMPLATES: LandingTemplatePreset[] = [
  {
    id: 'classic-sage',
    titleFa: 'کاغذ دست‌ساز و مریم‌گلی',
    subtitleEn: 'Botanical Paper Split',
    layoutTagFa: 'چیدمان دو‌ستونه ویترین لوکس',
    descriptionFa:
      'پس‌زمینه کتان کرم و سبز مریم‌گلی با عکاسی ویترین اختصاصی، دکمه‌های تراکوتا و فواصل تحریریه.',
    swatches: ['#FAF6EE', '#536F60', '#C5D1C3', '#B85D32'],
    headerTone: 'light',
    headerBg: 'bg-[#FAF6EE]/90 border-[#2B1B12]/10',
    popularBg: 'bg-[#FCF9F2]',
    waveBackFill: '#E9DEC9',
    waveFrontFill: '#F2EFE7',
    canvasBg: '#F2EFE7',
  },
  {
    id: 'editorial-roastery',
    titleFa: 'برشته‌کاری اسپرسو و مس',
    subtitleEn: 'Dark Roast & Copper Atelier',
    layoutTagFa: 'صحنه تیره اسپرسو + قاب مس',
    descriptionFa:
      'بخش اول تیره و لوکس با رنگ اسپرسوی برشته، قاب ویترین مس-طلایی، دکمه‌های دوتایی و پالت گرم و عمیق.',
    swatches: ['#1E130D', '#C87A45', '#E8D9C5', '#F4ECE1'],
    headerTone: 'dark',
    headerBg: 'bg-[#1A100B]/92 border-[#E2A16F]/15',
    popularBg: 'bg-[#FAF5EE]',
    waveBackFill: '#E2D0BC',
    waveFrontFill: '#F4ECE1',
    canvasBg: '#F4ECE1',
  },
  {
    id: 'botanical-minimal',
    titleFa: 'گالری مینیمال و زیتونی-لاجورد',
    subtitleEn: 'Centered Gallery Slate',
    layoutTagFa: 'چیدمان مرکزچین پانوراما + بنتو',
    descriptionFa:
      'چیدمان مرکزچین و روشن با پس‌زمینه مرمر خنک، آبی نفتی و زیتونی، ویترین پانورامای عریض و کارت‌های بنتو.',
    swatches: ['#F4F6F5', '#243F47', '#D5E2DA', '#C86D41'],
    headerTone: 'light',
    headerBg: 'bg-[#F4F6F5]/90 border-[#1F353B]/10',
    popularBg: 'bg-[#FAFBFB]',
    waveBackFill: '#D8E3DD',
    waveFrontFill: '#F1F5F3',
    canvasBg: '#F1F5F3',
  },
];

export function normalizeLandingTemplate(value: unknown): LandingTemplateId {
  if (
    value === 'classic-sage' ||
    value === 'editorial-roastery' ||
    value === 'botanical-minimal'
  ) {
    return value;
  }
  return 'classic-sage';
}

export function getLandingTemplatePreset(id?: LandingTemplateId | null): LandingTemplatePreset {
  const safe = normalizeLandingTemplate(id);
  return LANDING_TEMPLATES.find((t) => t.id === safe) ?? LANDING_TEMPLATES[0];
}
