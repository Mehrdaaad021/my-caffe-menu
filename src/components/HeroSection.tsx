import React from 'react';
import { CoffeeComicCarousel } from '@/src/components/CoffeeComicCarousel';
import type { AppContentOverrides, LandingTemplateId, MenuItem } from '@/src/types/menu';
import type { MenuLanguage } from '@/src/lib/menuI18n';

interface HeroSectionProps {
  appContent: Required<AppContentOverrides>;
  taglineFa: string;
  tableNumber: number | null;
  featuredItems: MenuItem[];
  lang?: MenuLanguage;
  templateId?: LandingTemplateId;
  onInspectItem: (item: MenuItem) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  lang = 'fa',
  templateId = 'classic-sage',
}) => {
  const tone: 'sage' | 'espresso' | 'slate' =
    templateId === 'editorial-roastery'
      ? 'espresso'
      : templateId === 'botanical-minimal'
        ? 'slate'
        : 'sage';

  const sectionWrapperCls =
    templateId === 'editorial-roastery'
      ? 'relative overflow-hidden border-b border-[#E09862]/20 py-4 sm:py-7'
      : templateId === 'botanical-minimal'
        ? 'relative overflow-hidden bg-[#F4F6F5] py-4 sm:py-7'
        : 'relative overflow-hidden bg-[#FAF6EE] py-4 sm:py-7';

  const sectionBgStyle: React.CSSProperties | undefined =
    templateId === 'editorial-roastery'
      ? {
          background:
            'radial-gradient(circle at 22% 18%, rgba(200, 122, 69, 0.2) 0%, transparent 50%), radial-gradient(circle at 82% 72%, rgba(224, 152, 98, 0.1) 0%, transparent 45%), linear-gradient(160deg, #1E130D 0%, #140C08 100%)',
        }
      : templateId === 'classic-sage'
        ? {
            backgroundImage:
              'radial-gradient(circle at 18% 12%, rgba(122, 152, 108, 0.1) 0%, transparent 42%), radial-gradient(circle at 86% 24%, rgba(194, 146, 98, 0.11) 0%, transparent 40%)',
          }
        : undefined;

  return (
    <section className={sectionWrapperCls} style={sectionBgStyle}>
      <div className="mx-auto max-w-[1440px] px-3 sm:px-6 lg:px-8">
        <CoffeeComicCarousel tone={tone} lang={lang} />
      </div>
    </section>
  );
};
