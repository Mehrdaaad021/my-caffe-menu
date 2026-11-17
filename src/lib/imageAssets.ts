import espressoTonicImg from '@/src/assets/images/pop_3d_espresso_tonic_1794746469660.jpg';
import saffronLatteImg from '@/src/assets/images/pop_3d_saffron_latte_1794746470367.jpg';
import filetMignonImg from '@/src/assets/images/pop_3d_filet_mignon_1794746472471.jpg';
import trufflePastaImg from '@/src/assets/images/pop_3d_truffle_pasta_1794746472881.jpg';
import pistachioCakeImg from '@/src/assets/images/pop_3d_pistachio_cake_1794746472983.jpg';
import croissantBrunchImg from '@/src/assets/images/pop_3d_croissant_brunch_1794746473902.jpg';
import burgerImg from '@/src/assets/images/pop_3d_burger_1794747171119.jpg';
import pizzaImg from '@/src/assets/images/pop_3d_pizza_1794747172095.jpg';

export interface Studio3DPreset {
  key: string;
  labelFa: string;
  src: string;
}

export const STUDIO_3D_PRESETS: Studio3DPreset[] = [
  {
    key: 'preset:saffron_latte',
    labelFa: 'نوشیدنی گرم (لاته زعفران)',
    src: saffronLatteImg,
  },
  {
    key: 'preset:espresso_tonic',
    labelFa: 'نوشیدنی سرد (اسپرسو تونیک)',
    src: espressoTonicImg,
  },
  {
    key: 'preset:burger',
    labelFa: 'برگر دبل اسمَش',
    src: burgerImg,
  },
  {
    key: 'preset:pizza',
    labelFa: 'پیتزا ناپولیتن',
    src: pizzaImg,
  },
  {
    key: 'preset:croissant_brunch',
    labelFa: 'پیش غذا و برانچ',
    src: croissantBrunchImg,
  },
  {
    key: 'preset:truffle_pasta',
    labelFa: 'پاستا ترافل سیاه',
    src: trufflePastaImg,
  },
  {
    key: 'preset:filet_mignon',
    labelFa: 'استیک فیله مینیون',
    src: filetMignonImg,
  },
  {
    key: 'preset:pistachio_cake',
    labelFa: 'انتروپه پسته و رزبری',
    src: pistachioCakeImg,
  },
];

const PRESET_MAP: Record<string, string> = Object.fromEntries(
  STUDIO_3D_PRESETS.map((preset) => [preset.key, preset.src]),
);

export function resolveMenuImage(imageUrl: string): string {
  if (!imageUrl) return saffronLatteImg;
  if (PRESET_MAP[imageUrl]) {
    return PRESET_MAP[imageUrl];
  }
  return imageUrl;
}
