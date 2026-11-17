import React, { useId } from 'react';

export interface ClayIconProps {
  className?: string;
  'aria-hidden'?: boolean | 'true' | 'false';
}

const CLAY_DROP_STYLE: React.CSSProperties = {
  filter: 'drop-shadow(0 3px 4px rgba(42, 30, 24, 0.24))',
  flexShrink: 0,
};

function useClayIds(prefix: string) {
  const uid = useId().replace(/:/g, '');
  return (name: string) => `${prefix}-${name}-${uid}`;
}

/* 1. Miniature Sage Cafe Storefront (Bottom-Right of Reference) */
export const ClayCafeStorefront: React.FC<ClayIconProps> = ({ className = 'h-6 w-6', ...rest }) => {
  const id = useClayIds('store');
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} style={CLAY_DROP_STYLE} {...rest}>
      <defs>
        <linearGradient id={id('sage')} x1="8" y1="6" x2="40" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#92AC87" />
          <stop offset="55%" stopColor="#728E68" />
          <stop offset="100%" stopColor="#56704D" />
        </linearGradient>
        <linearGradient id={id('wood')} x1="16" y1="26" x2="32" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#B8835C" />
          <stop offset="100%" stopColor="#7E5233" />
        </linearGradient>
        <linearGradient id={id('cream')} x1="18" y1="9" x2="30" y2="16" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFDF8" />
          <stop offset="100%" stopColor="#E4DAC6" />
        </linearGradient>
      </defs>
      {/* Main Sage Building Body */}
      <rect x="8" y="6" width="32" height="36" rx="6" fill={`url(#${id('sage')})`} />
      <rect x="9.5" y="7.5" width="29" height="4" rx="2" fill="#A9C2A0" opacity="0.55" />
      {/* Cream Signboard */}
      <rect x="17" y="10" width="14" height="5.5" rx="2.5" fill={`url(#${id('cream')})`} />
      {/* Striped Awning */}
      <path d="M5.5 21C5.5 19.3 6.9 18 8.6 18H39.4C41.1 18 42.5 19.3 42.5 21L43.5 25C43.5 26.8 41.9 28 40 28H8C6.1 28 4.5 26.8 4.5 25L5.5 21Z" fill="#3B2C24" />
      <rect x="9.5" y="18.5" width="4.5" height="9" rx="2" fill="#7D9A73" />
      <rect x="18.5" y="18.5" width="4.5" height="9" rx="2" fill="#7D9A73" />
      <rect x="27.5" y="18.5" width="4.5" height="9" rx="2" fill="#7D9A73" />
      <rect x="35.5" y="18.5" width="4" height="9" rx="2" fill="#7D9A73" />
      {/* Warm Wood Doors */}
      <rect x="15" y="29" width="18" height="12" rx="2.5" fill={`url(#${id('wood')})`} />
      <line x1="24" y1="29.5" x2="24" y2="41" stroke="#4B2F1D" strokeWidth="1.4" />
      {/* Base Plinth */}
      <rect x="6" y="40" width="36" height="4" rx="2" fill="#5D7754" />
    </svg>
  );
};

/* 2. Sage Espresso Squircle Top-View (Top-Left of Reference) */
export const ClaySageEspressoSquircle: React.FC<ClayIconProps> = ({ className = 'h-6 w-6', ...rest }) => {
  const id = useClayIds('sq');
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} style={CLAY_DROP_STYLE} {...rest}>
      <defs>
        <linearGradient id={id('bg')} x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#94AE8A" />
          <stop offset="55%" stopColor="#74906B" />
          <stop offset="100%" stopColor="#56704E" />
        </linearGradient>
        <radialGradient id={id('cup')} cx="45%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#4A382F" />
          <stop offset="100%" stopColor="#261B15" />
        </radialGradient>
        <linearGradient id={id('rim')} x1="12" y1="10" x2="36" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFDF9" />
          <stop offset="100%" stopColor="#DDD2BE" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="40" height="40" rx="13" fill={`url(#${id('bg')})`} />
      <rect x="6" y="5.5" width="36" height="5" rx="3" fill="#B5CCA9" opacity="0.45" />
      <circle cx="24" cy="24" r="13.5" fill={`url(#${id('rim')})`} />
      <circle cx="24" cy="24" r="10.2" fill={`url(#${id('cup')})`} />
      {/* Cream Marshmallow / Foam Cube */}
      <rect x="19" y="19" width="10" height="10" rx="3.5" fill={`url(#${id('rim')})`} />
      <rect x="20.5" y="20" width="7" height="3" rx="1.5" fill="#FFFFFF" opacity="0.7" />
    </svg>
  );
};

/* 3. Ribbed Kraft Takeaway Cup (Top-Middle of Reference) */
export const ClayTakeawayCup: React.FC<ClayIconProps> = ({ className = 'h-6 w-6', ...rest }) => {
  const id = useClayIds('takeaway');
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} style={CLAY_DROP_STYLE} {...rest}>
      <defs>
        <linearGradient id={id('cup')} x1="12" y1="16" x2="36" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#D3A27B" />
          <stop offset="55%" stopColor="#BA865F" />
          <stop offset="100%" stopColor="#8F5E3B" />
        </linearGradient>
        <linearGradient id={id('lid')} x1="10" y1="6" x2="38" y2="18" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFDF9" />
          <stop offset="100%" stopColor="#E1D6C3" />
        </linearGradient>
      </defs>
      {/* Cup Tapered Body */}
      <path d="M12.5 17H35.5L32.2 41.5C31.9 43.2 30.5 44.5 28.8 44.5H19.2C17.5 44.5 16.1 43.2 15.8 41.5L12.5 17Z" fill={`url(#${id('cup')})`} />
      {/* Subtle Ribbed Texture Lines */}
      <path d="M16.5 19L18.4 42M20.5 19L21.4 42M24 19V42M27.5 19L26.6 42M31.5 19L29.6 42" stroke="#855635" strokeWidth="1.2" strokeLinecap="round" opacity="0.45" />
      {/* Sculpted Cream Domed Lid */}
      <rect x="10" y="12.5" width="28" height="5.5" rx="2.75" fill={`url(#${id('lid')})`} />
      <path d="M14 12.5C14.8 9.2 16.8 7.5 19.5 7.5H28.5C31.2 7.5 33.2 9.2 34 12.5H14Z" fill={`url(#${id('lid')})`} />
      <rect x="19" y="6" width="10" height="2.5" rx="1.25" fill="#FFFFFF" opacity="0.9" />
    </svg>
  );
};

/* 4. Dark Espresso Squircle with Caramel Cup & Steam (Top-Right of Reference) */
export const ClayEspressoTile: React.FC<ClayIconProps> = ({ className = 'h-6 w-6', ...rest }) => {
  const id = useClayIds('esptile');
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} style={CLAY_DROP_STYLE} {...rest}>
      <defs>
        <linearGradient id={id('dark')} x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4F3E35" />
          <stop offset="55%" stopColor="#382A23" />
          <stop offset="100%" stopColor="#231914" />
        </linearGradient>
        <linearGradient id={id('caramel')} x1="16" y1="22" x2="31" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#DFB38D" />
          <stop offset="100%" stopColor="#B68058" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="40" height="40" rx="13" fill={`url(#${id('dark')})`} />
      <rect x="7" y="5.5" width="34" height="4" rx="2" fill="#6E5A4F" opacity="0.4" />
      {/* Steam Wisps */}
      <path d="M21 18C19.5 15.5 22.5 13 21 10.5M26.5 18C25 15.5 28 13 26.5 10.5" stroke="#EFE6D5" strokeWidth="2.2" strokeLinecap="round" />
      {/* Cup */}
      <path d="M16.5 22H30.5V29C30.5 32.5 27.6 35 23.5 35C19.4 35 16.5 32.5 16.5 29V22Z" fill={`url(#${id('caramel')})`} />
      <rect x="17" y="24" width="13" height="2.8" rx="1.4" fill="#F6EFE2" opacity="0.85" />
      <path d="M30.5 24C33 24 34.5 25.5 34.5 27.5C34.5 29.5 33 31 30.5 31" stroke="#D1A17A" strokeWidth="2.4" strokeLinecap="round" />
      {/* Saucer */}
      <rect x="13" y="36.5" width="21" height="2.6" rx="1.3" fill="#EFE6D5" />
    </svg>
  );
};

/* 5. Espresso Cup & Saucer with Latte Art (Middle-Left of Reference) */
export const ClayLatteSaucer: React.FC<ClayIconProps> = ({ className = 'h-6 w-6', ...rest }) => {
  const id = useClayIds('latte');
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} style={CLAY_DROP_STYLE} {...rest}>
      <defs>
        <linearGradient id={id('dark')} x1="8" y1="14" x2="40" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#514037" />
          <stop offset="100%" stopColor="#261B16" />
        </linearGradient>
        <radialGradient id={id('crema')} cx="45%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#DFB48F" />
          <stop offset="100%" stopColor="#AE7B53" />
        </radialGradient>
      </defs>
      {/* Saucer */}
      <ellipse cx="23" cy="35.5" rx="18.5" ry="7.5" fill={`url(#${id('dark')})`} />
      <ellipse cx="23" cy="34.5" rx="16.5" ry="5.5" fill="#46362E" />
      {/* Cup Body */}
      <path d="M10.5 18.5H35.5L33.2 31C32.4 34.5 28 37 23 37C18 37 13.6 34.5 12.8 31L10.5 18.5Z" fill={`url(#${id('dark')})`} />
      {/* Handle */}
      <path d="M34.8 22.5C38.5 22.5 40.5 24.5 40.5 27.2C40.5 29.8 38.2 31.8 34 31.8" stroke="#47362D" strokeWidth="3.5" strokeLinecap="round" />
      {/* Cream Cup Rim & Latte Art */}
      <ellipse cx="23" cy="18.5" rx="12.5" ry="6.2" fill="#EFE6D5" />
      <ellipse cx="23" cy="18.7" rx="10.8" ry="4.9" fill={`url(#${id('crema')})`} />
      <path d="M23 15.2C21.2 16.5 21.2 19.2 23 21.6C24.8 19.2 24.8 16.5 23 15.2Z" fill="#FFFDF8" opacity="0.92" />
      <path d="M19.5 17.8C20.8 17.5 22 18.4 23 19.8C24 18.4 25.2 17.5 26.5 17.8" stroke="#FFFDF8" strokeWidth="1.4" strokeLinecap="round" opacity="0.9" />
    </svg>
  );
};

/* 6. Matcha-Cream Layered Jar (Middle-Center of Reference) */
export const ClayMatchaJar: React.FC<ClayIconProps> = ({ className = 'h-6 w-6', ...rest }) => {
  const id = useClayIds('jar');
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} style={CLAY_DROP_STYLE} {...rest}>
      <defs>
        <linearGradient id={id('lid')} x1="14" y1="6" x2="34" y2="15" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#56443A" />
          <stop offset="100%" stopColor="#281D17" />
        </linearGradient>
        <linearGradient id={id('sage')} x1="12" y1="15" x2="36" y2="25" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#92AC87" />
          <stop offset="100%" stopColor="#607C57" />
        </linearGradient>
        <linearGradient id={id('milk')} x1="12" y1="24" x2="36" y2="43" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFDF8" />
          <stop offset="100%" stopColor="#E1D6C2" />
        </linearGradient>
      </defs>
      {/* Cream Base */}
      <rect x="12" y="22" width="24" height="20" rx="5.5" fill={`url(#${id('milk')})`} />
      {/* Sage Green Collar Band */}
      <rect x="11.5" y="15" width="25" height="9" rx="3.5" fill={`url(#${id('sage')})`} />
      <rect x="13" y="16" width="22" height="2.2" rx="1.1" fill="#B2C9A8" opacity="0.6" />
      {/* Dark Espresso Lid */}
      <rect x="13.5" y="7" width="21" height="8.5" rx="3.5" fill={`url(#${id('lid')})`} />
      <line x1="16" y1="10.5" x2="32" y2="10.5" stroke="#6D584D" strokeWidth="1.2" opacity="0.6" />
    </svg>
  );
};

/* 7. Warm Caramel Mug with Black Coffee (Middle-Right of Reference) */
export const ClayCaramelMug: React.FC<ClayIconProps> = ({ className = 'h-6 w-6', ...rest }) => {
  const id = useClayIds('cmug');
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} style={CLAY_DROP_STYLE} {...rest}>
      <defs>
        <linearGradient id={id('body')} x1="10" y1="12" x2="34" y2="43" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#D3A27B" />
          <stop offset="55%" stopColor="#B8825B" />
          <stop offset="100%" stopColor="#8F5D3A" />
        </linearGradient>
      </defs>
      {/* Handle */}
      <path d="M32.5 21C37.2 21 39.5 23.5 39.5 27.5C39.5 31.5 37 34 32 34" stroke="#B6805A" strokeWidth="4" strokeLinecap="round" />
      {/* Mug Body */}
      <path d="M10.5 15H34.5L32.8 38.5C32.5 41.2 30.2 43 27.5 43H17.5C14.8 43 12.5 41.2 12.2 38.5L10.5 15Z" fill={`url(#${id('body')})`} />
      {/* Mug Top Rim & Black Coffee */}
      <ellipse cx="22.5" cy="15" rx="12" ry="4.8" fill="#D5A680" />
      <ellipse cx="22.5" cy="15.3" rx="9.5" ry="3.4" fill="#2E2019" />
    </svg>
  );
};

/* 8. Matte Sage Mug with Latte Art & Steam (Bottom-Left of Reference) */
export const ClaySageMug: React.FC<ClayIconProps> = ({ className = 'h-6 w-6', ...rest }) => {
  const id = useClayIds('smug');
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} style={CLAY_DROP_STYLE} {...rest}>
      <defs>
        <linearGradient id={id('sage')} x1="10" y1="14" x2="34" y2="43" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#94AE8A" />
          <stop offset="55%" stopColor="#74906B" />
          <stop offset="100%" stopColor="#556F4D" />
        </linearGradient>
      </defs>
      {/* Steam */}
      <path d="M20.5 11.5C19.5 9.2 22 7.5 21 5.5M26 11C25 8.8 27.5 7 26.5 5" stroke="#EFE6D5" strokeWidth="2.1" strokeLinecap="round" />
      {/* Handle */}
      <path d="M32 22C36.8 22 39 24.5 39 28.5C39 32.5 36.5 35 31.5 35" stroke="#6E8A65" strokeWidth="4" strokeLinecap="round" />
      {/* Mug Body */}
      <path d="M10.5 17H34L32.2 39C31.9 41.5 29.8 43.2 27.2 43.2H17.2C14.6 43.2 12.5 41.5 12.2 39L10.5 17Z" fill={`url(#${id('sage')})`} />
      {/* Top Rim & Latte Foam */}
      <ellipse cx="22.2" cy="17" rx="11.8" ry="4.5" fill="#9CB692" />
      <ellipse cx="22.2" cy="17.2" rx="9.4" ry="3.2" fill="#D5A67F" />
      <ellipse cx="22.2" cy="17.2" rx="4.5" ry="1.8" fill="#FFFDF8" opacity="0.9" />
    </svg>
  );
};

/* 9. Trio of 3D Roasted Coffee Beans (Bottom-Middle of Reference) */
export const ClayCoffeeBeans: React.FC<ClayIconProps> = ({ className = 'h-6 w-6', ...rest }) => {
  const id = useClayIds('beans');
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} style={CLAY_DROP_STYLE} {...rest}>
      <defs>
        <radialGradient id={id('bean')} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#6D5245" />
          <stop offset="60%" stopColor="#4A362C" />
          <stop offset="100%" stopColor="#2D1F18" />
        </radialGradient>
      </defs>
      {/* Top Bean */}
      <g transform="translate(24 14) rotate(-25)">
        <ellipse cx="0" cy="0" rx="7.5" ry="10.2" fill={`url(#${id('bean')})`} />
        <path d="M0 -8.8C-2 -3 2 3 0 8.8" stroke="#221610" strokeWidth="1.9" strokeLinecap="round" />
      </g>
      {/* Bottom-Left Bean */}
      <g transform="translate(15 32) rotate(28)">
        <ellipse cx="0" cy="0" rx="7.2" ry="9.6" fill={`url(#${id('bean')})`} />
        <path d="M0 -8.2C-2 -2.5 2 2.5 0 8.2" stroke="#221610" strokeWidth="1.8" strokeLinecap="round" />
      </g>
      {/* Bottom-Right Bean */}
      <g transform="translate(33 32) rotate(-52)">
        <ellipse cx="0" cy="0" rx="7.2" ry="9.6" fill={`url(#${id('bean')})`} />
        <path d="M0 -8.2C-2 -2.5 2 2.5 0 8.2" stroke="#221610" strokeWidth="1.8" strokeLinecap="round" />
      </g>
    </svg>
  );
};

/* ---- Cohesive 3D Clay Squircle & Sculpted Functional UI Icons ---- */

export const Heart: React.FC<ClayIconProps> = ({ className = 'h-4 w-4', ...rest }) => {
  const id = useClayIds('heart');
  const isFilled = className.includes('fill-');
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} style={CLAY_DROP_STYLE} {...rest}>
      <defs>
        <linearGradient id={id('h')} x1="10" y1="8" x2="38" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={isFilled ? '#E38A5C' : '#96B08C'} />
          <stop offset="100%" stopColor={isFilled ? '#B95A2D' : '#617D58'} />
        </linearGradient>
      </defs>
      <path
        d="M24 41.5C24 41.5 7 30.6 7 18.2C7 12.3 11.7 7.8 17.3 7.8C20.6 7.8 23.1 9.5 24 11.4C24.9 9.5 27.4 7.8 30.7 7.8C36.3 7.8 41 12.3 41 18.2C41 30.6 24 41.5 24 41.5Z"
        fill={`url(#${id('h')})`}
      />
      <ellipse cx="16.5" cy="15.5" rx="3.8" ry="2.2" transform="rotate(-28 16.5 15.5)" fill="#FFFDF8" opacity="0.55" />
    </svg>
  );
};

export const Plus: React.FC<ClayIconProps> = ({ className = 'h-4 w-4', ...rest }) => {
  const id = useClayIds('plus');
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} style={CLAY_DROP_STYLE} {...rest}>
      <defs>
        <linearGradient id={id('p')} x1="12" y1="10" x2="36" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFDF9" />
          <stop offset="100%" stopColor="#E4D7C1" />
        </linearGradient>
      </defs>
      {/* Espresso Clay Shadow Rim for high contrast on both light and dark surfaces */}
      <rect x="18.5" y="7.5" width="11" height="33" rx="5.5" fill="#3A2B24" fillOpacity="0.72" />
      <rect x="7.5" y="18.5" width="33" height="11" rx="5.5" fill="#3A2B24" fillOpacity="0.72" />
      <rect x="20" y="9" width="8" height="30" rx="4" fill={`url(#${id('p')})`} />
      <rect x="9" y="20" width="30" height="8" rx="4" fill={`url(#${id('p')})`} />
    </svg>
  );
};

export const Minus: React.FC<ClayIconProps> = ({ className = 'h-4 w-4', ...rest }) => {
  const id = useClayIds('minus');
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} style={CLAY_DROP_STYLE} {...rest}>
      <defs>
        <linearGradient id={id('m')} x1="9" y1="20" x2="39" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#D6A882" />
          <stop offset="100%" stopColor="#A6724C" />
        </linearGradient>
      </defs>
      <rect x="9" y="19.5" width="30" height="9" rx="4.5" fill={`url(#${id('m')})`} />
      <rect x="12" y="21" width="24" height="2.4" rx="1.2" fill="#FFFDF8" opacity="0.45" />
    </svg>
  );
};

export const X: React.FC<ClayIconProps> = ({ className = 'h-4 w-4', ...rest }) => {
  const id = useClayIds('close');
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} style={CLAY_DROP_STYLE} {...rest}>
      <defs>
        <linearGradient id={id('x')} x1="10" y1="10" x2="38" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#5C493E" />
          <stop offset="100%" stopColor="#2F221B" />
        </linearGradient>
      </defs>
      <g transform="rotate(45 24 24)">
        <rect x="20" y="8" width="8" height="32" rx="4" fill={`url(#${id('x')})`} />
        <rect x="8" y="20" width="32" height="8" rx="4" fill={`url(#${id('x')})`} />
      </g>
    </svg>
  );
};

export const Check: React.FC<ClayIconProps> = ({ className = 'h-4 w-4', ...rest }) => {
  const id = useClayIds('chk');
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} style={CLAY_DROP_STYLE} {...rest}>
      <defs>
        <linearGradient id={id('c')} x1="8" y1="12" x2="40" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFDF8" />
          <stop offset="100%" stopColor="#DECFAF" />
        </linearGradient>
      </defs>
      <path d="M10 24.5L19.5 34L38 14.5" stroke="#3A2B24" strokeOpacity="0.65" strokeWidth="10.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 24.5L19.5 34L38 14.5" stroke={`url(#${id('c')})`} strokeWidth="6.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

export const CheckCircle2: React.FC<ClayIconProps> = ({ className = 'h-5 w-5', ...rest }) => {
  const id = useClayIds('chkc');
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} style={CLAY_DROP_STYLE} {...rest}>
      <defs>
        <linearGradient id={id('bg')} x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#94AE8A" />
          <stop offset="100%" stopColor="#56704E" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="40" height="40" rx="20" fill={`url(#${id('bg')})`} />
      <path d="M15 24.5L21.5 31L33.5 18" stroke="#FFFDF8" strokeWidth="5.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

export const Search: React.FC<ClayIconProps> = ({ className = 'h-4 w-4', ...rest }) => {
  const id = useClayIds('search');
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} style={CLAY_DROP_STYLE} {...rest}>
      <defs>
        <linearGradient id={id('ring')} x1="8" y1="8" x2="34" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#8EA884" />
          <stop offset="100%" stopColor="#556F4D" />
        </linearGradient>
        <linearGradient id={id('handle')} x1="28" y1="28" x2="42" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#C99670" />
          <stop offset="100%" stopColor="#8F5E3C" />
        </linearGradient>
      </defs>
      <path d="M30 30L40 40" stroke={`url(#${id('handle')})`} strokeWidth="7" strokeLinecap="round" />
      <circle cx="21" cy="21" r="12.5" stroke={`url(#${id('ring')})`} strokeWidth="6" fill="#FFFDF8" fillOpacity="0.6" />
      <ellipse cx="16.5" cy="16.5" rx="3.2" ry="1.8" transform="rotate(-35 16.5 16.5)" fill="#FFFFFF" opacity="0.85" />
    </svg>
  );
};

export const Clock: React.FC<ClayIconProps> = ({ className = 'h-4 w-4', ...rest }) => {
  const id = useClayIds('clk');
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} style={CLAY_DROP_STYLE} {...rest}>
      <defs>
        <linearGradient id={id('rim')} x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#94AE8A" />
          <stop offset="100%" stopColor="#587350" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="19" fill={`url(#${id('rim')})`} />
      <circle cx="24" cy="24" r="13.5" fill="#F8F3E8" />
      <path d="M24 14.5V24.5L30.5 28" stroke="#382A23" strokeWidth="3.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="24" cy="24" r="2.5" fill="#BA865F" />
    </svg>
  );
};

export const Phone: React.FC<ClayIconProps> = ({ className = 'h-4 w-4', ...rest }) => {
  const id = useClayIds('phone');
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} style={CLAY_DROP_STYLE} {...rest}>
      <defs>
        <linearGradient id={id('bg')} x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#94AE8A" />
          <stop offset="100%" stopColor="#587350" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="40" height="40" rx="13" fill={`url(#${id('bg')})`} />
      <path
        d="M17.5 13C18.6 13 19.6 13.7 20 14.7L21.6 18.6C21.9 19.4 21.7 20.4 21 21L19.2 22.6C20.5 25.1 22.8 27.4 25.3 28.7L26.9 26.9C27.5 26.2 28.5 26 29.3 26.3L33.2 27.9C34.2 28.3 34.9 29.3 34.9 30.4V33.2C34.9 34.7 33.7 35.8 32.2 35.7C21.2 35.1 12.8 26.7 12.2 15.7C12.1 14.2 13.2 13 14.7 13H17.5Z"
        fill="#FFFDF8"
      />
    </svg>
  );
};

export const QrCode: React.FC<ClayIconProps> = ({ className = 'h-4 w-4', ...rest }) => {
  const id = useClayIds('qr');
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} style={CLAY_DROP_STYLE} {...rest}>
      <defs>
        <linearGradient id={id('bg')} x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFDF8" />
          <stop offset="100%" stopColor="#DED3BF" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="40" height="40" rx="12" fill={`url(#${id('bg')})`} />
      <rect x="10" y="10" width="11" height="11" rx="3" stroke="#382A23" strokeWidth="3.2" fill="#75926C" fillOpacity="0.3" />
      <rect x="27" y="10" width="11" height="11" rx="3" stroke="#382A23" strokeWidth="3.2" fill="#BA865F" fillOpacity="0.35" />
      <rect x="10" y="27" width="11" height="11" rx="3" stroke="#382A23" strokeWidth="3.2" fill="#BA865F" fillOpacity="0.35" />
      <rect x="27" y="27" width="5" height="5" rx="1.5" fill="#382A23" />
      <rect x="33.5" y="33.5" width="5" height="5" rx="1.5" fill="#587350" />
    </svg>
  );
};

export const Share2: React.FC<ClayIconProps> = ({ className = 'h-4 w-4', ...rest }) => {
  const id = useClayIds('share');
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} style={CLAY_DROP_STYLE} {...rest}>
      <defs>
        <linearGradient id={id('dot')} x1="8" y1="8" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFDF8" />
          <stop offset="100%" stopColor="#DFD2BC" />
        </linearGradient>
      </defs>
      <path d="M16 24L32 14M16 24L32 34" stroke="#3A2B24" strokeOpacity="0.65" strokeWidth="6.5" strokeLinecap="round" />
      <path d="M16 24L32 14M16 24L32 34" stroke="#F4EDE0" strokeWidth="3.8" strokeLinecap="round" />
      <circle cx="14" cy="24" r="6.8" fill="#3A2B24" fillOpacity="0.55" />
      <circle cx="33" cy="13" r="6.8" fill="#3A2B24" fillOpacity="0.55" />
      <circle cx="33" cy="35" r="6.8" fill="#3A2B24" fillOpacity="0.55" />
      <circle cx="14" cy="24" r="5.5" fill={`url(#${id('dot')})`} />
      <circle cx="33" cy="13" r="5.5" fill="#75926C" />
      <circle cx="33" cy="35" r="5.5" fill="#BA8863" />
    </svg>
  );
};

export const Send: React.FC<ClayIconProps> = ({ className = 'h-4 w-4', ...rest }) => {
  const id = useClayIds('send');
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} style={CLAY_DROP_STYLE} {...rest}>
      <defs>
        <linearGradient id={id('s')} x1="8" y1="8" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFDF8" />
          <stop offset="100%" stopColor="#DFD3BF" />
        </linearGradient>
      </defs>
      <path d="M40 9L28 40L22.5 25.5L8 20L40 9Z" fill={`url(#${id('s')})`} stroke="#3A2B24" strokeOpacity="0.55" strokeWidth="2.2" strokeLinejoin="round" />
    </svg>
  );
};

export const MessageSquare: React.FC<ClayIconProps> = ({ className = 'h-4 w-4', ...rest }) => {
  const id = useClayIds('msg');
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} style={CLAY_DROP_STYLE} {...rest}>
      <defs>
        <linearGradient id={id('m')} x1="6" y1="8" x2="42" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#94AE8A" />
          <stop offset="100%" stopColor="#587350" />
        </linearGradient>
      </defs>
      <path d="M8 14C8 10.7 10.7 8 14 8H34C37.3 8 40 10.7 40 14V28C40 31.3 37.3 34 34 34H20L11 41V34C9.3 33.4 8 31.8 8 28V14Z" fill={`url(#${id('m')})`} />
      <rect x="15" y="16" width="18" height="3.2" rx="1.6" fill="#FFFDF8" opacity="0.9" />
      <rect x="15" y="22.5" width="12" height="3.2" rx="1.6" fill="#FFFDF8" opacity="0.75" />
    </svg>
  );
};

export const Copy: React.FC<ClayIconProps> = ({ className = 'h-4 w-4', ...rest }) => {
  const id = useClayIds('copy');
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} style={CLAY_DROP_STYLE} {...rest}>
      <defs>
        <linearGradient id={id('f')} x1="16" y1="16" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFDF8" />
          <stop offset="100%" stopColor="#DDD1BC" />
        </linearGradient>
      </defs>
      <rect x="9" y="9" width="21" height="23" rx="5" fill="#BA8863" />
      <rect x="17" y="16" width="22" height="23" rx="5" fill={`url(#${id('f')})`} />
    </svg>
  );
};

export const Trash2: React.FC<ClayIconProps> = ({ className = 'h-4 w-4', ...rest }) => {
  const id = useClayIds('trash');
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} style={CLAY_DROP_STYLE} {...rest}>
      <defs>
        <linearGradient id={id('b')} x1="12" y1="16" x2="36" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#BA8863" />
          <stop offset="100%" stopColor="#855737" />
        </linearGradient>
      </defs>
      <rect x="10" y="11" width="28" height="5" rx="2.5" fill="#4E3B31" />
      <rect x="19" y="6.5" width="10" height="4.5" rx="2.2" fill="#74906B" />
      <path d="M13 17H35L32.8 39C32.5 41.2 30.6 42.5 28.4 42.5H19.6C17.4 42.5 15.5 41.2 15.2 39L13 17Z" fill={`url(#${id('b')})`} />
      <line x1="20" y1="22" x2="20.5" y2="37" stroke="#FFFDF8" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
      <line x1="28" y1="22" x2="27.5" y2="37" stroke="#FFFDF8" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
};

export const Camera: React.FC<ClayIconProps> = ({ className = 'h-4 w-4', ...rest }) => {
  const id = useClayIds('cam');
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} style={CLAY_DROP_STYLE} {...rest}>
      <defs>
        <linearGradient id={id('b')} x1="6" y1="12" x2="42" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#94AE8A" />
          <stop offset="100%" stopColor="#56704E" />
        </linearGradient>
      </defs>
      <path d="M16 10C16.6 8.8 17.8 8 19.2 8H28.8C30.2 8 31.4 8.8 32 10L34 13H38C40.8 13 43 15.2 43 18V35C43 37.8 40.8 40 38 40H10C7.2 40 5 37.8 5 35V18C5 15.2 7.2 13 10 13H14L16 10Z" fill={`url(#${id('b')})`} />
      <circle cx="24" cy="26.5" r="9" fill="#FFFDF8" />
      <circle cx="24" cy="26.5" r="6" fill="#382A23" />
      <circle cx="22" cy="24.5" r="1.8" fill="#FFFDF8" opacity="0.75" />
    </svg>
  );
};

export const Rotate3d: React.FC<ClayIconProps> = ({ className = 'h-4 w-4', ...rest }) => {
  const id = useClayIds('r3d');
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} style={CLAY_DROP_STYLE} {...rest}>
      <defs>
        <linearGradient id={id('top')} x1="12" y1="8" x2="36" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFDF8" />
          <stop offset="100%" stopColor="#DFD4C0" />
        </linearGradient>
      </defs>
      <path d="M24 8L38 15.5L24 23L10 15.5L24 8Z" fill={`url(#${id('top')})`} />
      <path d="M10 15.5L24 23V39.5L10 32V15.5Z" fill="#75926C" />
      <path d="M38 15.5L24 23V39.5L38 32V15.5Z" fill="#BA8863" />
    </svg>
  );
};

export const RotateCcw: React.FC<ClayIconProps> = ({ className = 'h-4 w-4', ...rest }) => (
  <svg viewBox="0 0 48 48" fill="none" className={className} style={CLAY_DROP_STYLE} {...rest}>
    <path d="M12 18C15 12.5 21 9.5 27.5 10.5C35 11.7 40 18.6 39 26.2C38 33.8 31 39 23.5 38C18.5 37.3 14.3 34.2 12.2 29.8" stroke="#5A7752" strokeWidth="6" strokeLinecap="round" />
    <path d="M10 11V21H20" stroke="#BA8863" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const RefreshCw: React.FC<ClayIconProps> = ({ className = 'h-4 w-4', ...rest }) => (
  <svg viewBox="0 0 48 48" fill="none" className={className} style={CLAY_DROP_STYLE} {...rest}>
    <path d="M37 19C34.5 13.5 28.5 10 22 11C14.8 12.2 10 18.8 11 26" stroke="#74906B" strokeWidth="5.8" strokeLinecap="round" />
    <path d="M11 29C13.5 34.5 19.5 38 26 37C33.2 35.8 38 29.2 37 22" stroke="#BA8863" strokeWidth="5.8" strokeLinecap="round" />
    <circle cx="37" cy="19" r="3.5" fill="#382A23" />
    <circle cx="11" cy="29" r="3.5" fill="#382A23" />
  </svg>
);

export const LayoutGrid: React.FC<ClayIconProps> = ({ className = 'h-4 w-4', ...rest }) => {
  const id = useClayIds('grid');
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} style={CLAY_DROP_STYLE} {...rest}>
      <defs>
        <linearGradient id={id('a')} x1="6" y1="6" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFDF8" />
          <stop offset="100%" stopColor="#DED3BF" />
        </linearGradient>
      </defs>
      <rect x="6" y="6" width="16" height="16" rx="5" fill={`url(#${id('a')})`} />
      <rect x="26" y="6" width="16" height="16" rx="5" fill="#BA8863" />
      <rect x="6" y="26" width="16" height="16" rx="5" fill="#8DA883" />
      <rect x="26" y="26" width="16" height="16" rx="5" fill={`url(#${id('a')})`} />
    </svg>
  );
};

export const List: React.FC<ClayIconProps> = ({ className = 'h-4 w-4', ...rest }) => (
  <svg viewBox="0 0 48 48" fill="none" className={className} style={CLAY_DROP_STYLE} {...rest}>
    <rect x="7" y="10" width="8" height="8" rx="4" fill="#BA8863" />
    <rect x="19" y="11" width="22" height="6" rx="3" fill="#FFFDF8" stroke="#3A2B24" strokeOpacity="0.45" strokeWidth="1.4" />
    <rect x="7" y="20" width="8" height="8" rx="4" fill="#8DA883" />
    <rect x="19" y="21" width="22" height="6" rx="3" fill="#EFE6D5" stroke="#3A2B24" strokeOpacity="0.45" strokeWidth="1.4" />
    <rect x="7" y="30" width="8" height="8" rx="4" fill="#BA8863" />
    <rect x="19" y="31" width="22" height="6" rx="3" fill="#FFFDF8" stroke="#3A2B24" strokeOpacity="0.45" strokeWidth="1.4" />
  </svg>
);

export const ArrowUpLeft: React.FC<ClayIconProps> = ({ className = 'h-4 w-4', ...rest }) => (
  <svg viewBox="0 0 48 48" fill="none" className={className} style={CLAY_DROP_STYLE} {...rest}>
    <path d="M34 34L14 14M14 14H30M14 14V30" stroke="#3B5245" strokeWidth="6.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ZoomIn: React.FC<ClayIconProps> = ({ className = 'h-4 w-4', ...rest }) => (
  <svg viewBox="0 0 48 48" fill="none" className={className} style={CLAY_DROP_STYLE} {...rest}>
    <path d="M31 31L40 40" stroke="#BA8863" strokeWidth="6.5" strokeLinecap="round" />
    <circle cx="21" cy="21" r="13" fill="#F4EDE0" stroke="#5A7752" strokeWidth="5.5" />
    <path d="M21 15.5V26.5M15.5 21H26.5" stroke="#382A23" strokeWidth="3.8" strokeLinecap="round" />
  </svg>
);

export const ZoomOut: React.FC<ClayIconProps> = ({ className = 'h-4 w-4', ...rest }) => (
  <svg viewBox="0 0 48 48" fill="none" className={className} style={CLAY_DROP_STYLE} {...rest}>
    <path d="M31 31L40 40" stroke="#BA8863" strokeWidth="6.5" strokeLinecap="round" />
    <circle cx="21" cy="21" r="13" fill="#F4EDE0" stroke="#5A7752" strokeWidth="5.5" />
    <path d="M15.5 21H26.5" stroke="#382A23" strokeWidth="3.8" strokeLinecap="round" />
  </svg>
);

export const Move: React.FC<ClayIconProps> = ({ className = 'h-4 w-4', ...rest }) => (
  <svg viewBox="0 0 48 48" fill="none" className={className} style={CLAY_DROP_STYLE} {...rest}>
    <path d="M24 7V41M7 24H41" stroke="#F4EDE0" strokeWidth="5.2" strokeLinecap="round" />
    <circle cx="24" cy="24" r="5.5" fill="#BA8863" />
    <circle cx="24" cy="8" r="3" fill="#8DA883" />
    <circle cx="24" cy="40" r="3" fill="#8DA883" />
    <circle cx="8" cy="24" r="3" fill="#8DA883" />
    <circle cx="40" cy="24" r="3" fill="#8DA883" />
  </svg>
);

export const Printer: React.FC<ClayIconProps> = ({ className = 'h-4 w-4', ...rest }) => (
  <svg viewBox="0 0 48 48" fill="none" className={className} style={CLAY_DROP_STYLE} {...rest}>
    <rect x="13" y="6" width="22" height="12" rx="3.5" fill="#FFFDF8" />
    <rect x="6" y="16" width="36" height="19" rx="6" fill="#5A7752" />
    <rect x="12" y="28" width="24" height="14" rx="3.5" fill="#F4EDE0" />
    <circle cx="35" cy="22" r="2.2" fill="#D5A67F" />
  </svg>
);

export const FileDown: React.FC<ClayIconProps> = ({ className = 'h-4 w-4', ...rest }) => (
  <svg viewBox="0 0 48 48" fill="none" className={className} style={CLAY_DROP_STYLE} {...rest}>
    <rect x="9" y="5" width="30" height="38" rx="6" fill="#F4EDE0" />
    <path d="M24 14V30M24 30L17.5 23.5M24 30L30.5 23.5" stroke="#5A7752" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ScrollText: React.FC<ClayIconProps> = ({ className = 'h-4 w-4', ...rest }) => (
  <svg viewBox="0 0 48 48" fill="none" className={className} style={CLAY_DROP_STYLE} {...rest}>
    <rect x="10" y="6" width="28" height="36" rx="6" fill="#EBDAC0" />
    <rect x="8" y="34" width="32" height="8" rx="4" fill="#BA8863" />
    <rect x="16" y="13" width="16" height="3.2" rx="1.6" fill="#382A23" />
    <rect x="16" y="20" width="16" height="3.2" rx="1.6" fill="#75926C" />
    <rect x="16" y="27" width="11" height="3.2" rx="1.6" fill="#382A23" opacity="0.7" />
  </svg>
);

export const Download: React.FC<ClayIconProps> = ({ className = 'h-4 w-4', ...rest }) => (
  <svg viewBox="0 0 48 48" fill="none" className={className} style={CLAY_DROP_STYLE} {...rest}>
    <rect x="8" y="33" width="32" height="7" rx="3.5" fill="#BA8863" />
    <path d="M24 8V28M24 28L16 20M24 28L32 20" stroke="#74906B" strokeWidth="5.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Upload: React.FC<ClayIconProps> = ({ className = 'h-4 w-4', ...rest }) => (
  <svg viewBox="0 0 48 48" fill="none" className={className} style={CLAY_DROP_STYLE} {...rest}>
    <rect x="8" y="33" width="32" height="7" rx="3.5" fill="#BA8863" />
    <path d="M24 29V9M24 9L16 17M24 9L32 17" stroke="#74906B" strokeWidth="5.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Lock: React.FC<ClayIconProps> = ({ className = 'h-4 w-4', ...rest }) => (
  <svg viewBox="0 0 48 48" fill="none" className={className} style={CLAY_DROP_STYLE} {...rest}>
    <path d="M15 21V15C15 10 19 6 24 6C29 6 33 10 33 15V21" stroke="#BA8863" strokeWidth="5.5" strokeLinecap="round" />
    <rect x="9" y="19" width="30" height="23" rx="7" fill="#5A7752" />
    <circle cx="24" cy="30.5" r="3.5" fill="#FFFDF8" />
  </svg>
);

export const ShieldCheck: React.FC<ClayIconProps> = ({ className = 'h-4 w-4', ...rest }) => (
  <svg viewBox="0 0 48 48" fill="none" className={className} style={CLAY_DROP_STYLE} {...rest}>
    <path d="M24 5L39 11V23C39 33 32.5 39.5 24 43C15.5 39.5 9 33 9 23V11L24 5Z" fill="#74906B" />
    <path d="M17.5 24.5L22 29L31.5 19" stroke="#FFFDF8" strokeWidth="4.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const KeyRound: React.FC<ClayIconProps> = ({ className = 'h-4 w-4', ...rest }) => (
  <svg viewBox="0 0 48 48" fill="none" className={className} style={CLAY_DROP_STYLE} {...rest}>
    <path d="M22 24H41M35 24V31" stroke="#BA8863" strokeWidth="6" strokeLinecap="round" />
    <circle cx="16" cy="24" r="10" fill="#74906B" />
    <circle cx="16" cy="24" r="4" fill="#FFFDF8" />
  </svg>
);

export const LogOut: React.FC<ClayIconProps> = ({ className = 'h-4 w-4', ...rest }) => (
  <svg viewBox="0 0 48 48" fill="none" className={className} style={CLAY_DROP_STYLE} {...rest}>
    <rect x="7" y="8" width="18" height="32" rx="5" fill="#74906B" />
    <path d="M22 24H40M40 24L33 17M40 24L33 31" stroke="#BA8863" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Edit3: React.FC<ClayIconProps> = ({ className = 'h-4 w-4', ...rest }) => (
  <svg viewBox="0 0 48 48" fill="none" className={className} style={CLAY_DROP_STYLE} {...rest}>
    <path d="M11 37L14.5 27L31.5 10C33.5 8 36.8 8 38.8 10C40.8 12 40.8 15.3 38.8 17.3L21.8 34.3L11 37Z" fill="#BA8863" />
    <path d="M29 12.5L36 19.5" stroke="#FFFDF8" strokeWidth="3.5" strokeLinecap="round" />
  </svg>
);

export const Palette: React.FC<ClayIconProps> = ({ className = 'h-4 w-4', ...rest }) => (
  <svg viewBox="0 0 48 48" fill="none" className={className} style={CLAY_DROP_STYLE} {...rest}>
    <path d="M24 6C13.5 6 6 13.8 6 24C6 34.2 13.8 42 24 42C27.2 42 29 40 29 37.5C29 35.8 28 34.6 28 33C28 31.3 29.3 30 31 30H35C39.2 30 42 27 42 22.5C42 13.2 34 6 24 6Z" fill="#EFE6D5" />
    <circle cx="15" cy="21" r="3.2" fill="#74906B" />
    <circle cx="21.5" cy="14.5" r="3.2" fill="#BA8863" />
    <circle cx="30.5" cy="15.5" r="3.2" fill="#382A23" />
    <circle cx="34" cy="22.5" r="3.2" fill="#8C7EC4" />
  </svg>
);

export const Settings: React.FC<ClayIconProps> = ({ className = 'h-4 w-4', ...rest }) => (
  <svg viewBox="0 0 48 48" fill="none" className={className} style={CLAY_DROP_STYLE} {...rest}>
    <circle cx="24" cy="24" r="16" fill="#74906B" />
    <circle cx="24" cy="24" r="7.5" fill="#FFFDF8" />
    <circle cx="24" cy="24" r="3.2" fill="#382A23" />
  </svg>
);

export const ClipboardList: React.FC<ClayIconProps> = ({ className = 'h-4 w-4', ...rest }) => (
  <svg viewBox="0 0 48 48" fill="none" className={className} style={CLAY_DROP_STYLE} {...rest}>
    <rect x="10" y="9" width="28" height="34" rx="6" fill="#EFE6D5" />
    <rect x="17" y="5" width="14" height="7" rx="3.5" fill="#BA8863" />
    <rect x="16" y="18" width="16" height="3.5" rx="1.7" fill="#74906B" />
    <rect x="16" y="25" width="16" height="3.5" rx="1.7" fill="#382A23" />
    <rect x="16" y="32" width="11" height="3.5" rx="1.7" fill="#BA8863" />
  </svg>
);

export const TrendingUp: React.FC<ClayIconProps> = ({ className = 'h-4 w-4', ...rest }) => (
  <svg viewBox="0 0 48 48" fill="none" className={className} style={CLAY_DROP_STYLE} {...rest}>
    <rect x="4" y="4" width="40" height="40" rx="12" fill="#74906B" />
    <path d="M12 31L20 22L26 27L36 16" stroke="#FFFDF8" strokeWidth="4.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Users: React.FC<ClayIconProps> = ({ className = 'h-4 w-4', ...rest }) => (
  <svg viewBox="0 0 48 48" fill="none" className={className} style={CLAY_DROP_STYLE} {...rest}>
    <circle cx="19" cy="17" r="7" fill="#74906B" />
    <path d="M8 38C8 31.5 12.8 27 19 27C25.2 27 30 31.5 30 38" fill="#74906B" />
    <circle cx="32" cy="19" r="5.5" fill="#BA8863" />
    <path d="M27 38C27 33 30 29.5 34.5 29.5C38.5 29.5 41 33 41 38" fill="#BA8863" />
  </svg>
);

export const Type: React.FC<ClayIconProps> = ({ className = 'h-4 w-4', ...rest }) => (
  <svg viewBox="0 0 48 48" fill="none" className={className} style={CLAY_DROP_STYLE} {...rest}>
    <rect x="5" y="5" width="38" height="38" rx="12" fill="#74906B" />
    <path d="M15 15H33M24 15V34" stroke="#FFFDF8" strokeWidth="5.5" strokeLinecap="round" />
  </svg>
);

export const ImageIcon: React.FC<ClayIconProps> = ({ className = 'h-4 w-4', ...rest }) => (
  <svg viewBox="0 0 48 48" fill="none" className={className} style={CLAY_DROP_STYLE} {...rest}>
    <rect x="5" y="8" width="38" height="32" rx="8" fill="#EFE6D5" />
    <path d="M9 34L19 22L27 30L32 25L39 34H9Z" fill="#74906B" />
    <circle cx="32" cy="17" r="4" fill="#BA8863" />
  </svg>
);

export const ImagePlus: React.FC<ClayIconProps> = ({ className = 'h-4 w-4', ...rest }) => (
  <svg viewBox="0 0 48 48" fill="none" className={className} style={CLAY_DROP_STYLE} {...rest}>
    <rect x="5" y="8" width="38" height="32" rx="8" fill="#EFE6D5" />
    <path d="M9 34L19 22L27 30L32 25L39 34H9Z" fill="#74906B" />
    <circle cx="34" cy="16" r="6" fill="#BA8863" />
    <path d="M34 13V19M31 16H37" stroke="#FFFDF8" strokeWidth="2.4" strokeLinecap="round" />
  </svg>
);

export const FolderPlus: React.FC<ClayIconProps> = ({ className = 'h-4 w-4', ...rest }) => (
  <svg viewBox="0 0 48 48" fill="none" className={className} style={CLAY_DROP_STYLE} {...rest}>
    <path d="M6 14C6 11.2 8.2 9 11 9H20L24 14H37C39.8 14 42 16.2 42 19V35C42 37.8 39.8 40 37 40H11C8.2 40 6 37.8 6 35V14Z" fill="#BA8863" />
    <path d="M24 22V32M19 27H29" stroke="#FFFDF8" strokeWidth="4.2" strokeLinecap="round" />
  </svg>
);

export const ArrowUp: React.FC<ClayIconProps> = ({ className = 'h-4 w-4', ...rest }) => (
  <svg viewBox="0 0 48 48" fill="none" className={className} style={CLAY_DROP_STYLE} {...rest}>
    <path d="M24 38V11M24 11L13 22M24 11L35 22" stroke="#5A7752" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ArrowDown: React.FC<ClayIconProps> = ({ className = 'h-4 w-4', ...rest }) => (
  <svg viewBox="0 0 48 48" fill="none" className={className} style={CLAY_DROP_STYLE} {...rest}>
    <path d="M24 10V37M24 37L13 26M24 37L35 26" stroke="#BA8863" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ExternalLink: React.FC<ClayIconProps> = ({ className = 'h-4 w-4', ...rest }) => (
  <svg viewBox="0 0 48 48" fill="none" className={className} style={CLAY_DROP_STYLE} {...rest}>
    <rect x="8" y="14" width="26" height="26" rx="6" fill="#EFE6D5" />
    <path d="M22 26L39 9M39 9H28M39 9V20" stroke="#5A7752" strokeWidth="5.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const XCircle: React.FC<ClayIconProps> = ({ className = 'h-4 w-4', ...rest }) => (
  <svg viewBox="0 0 48 48" fill="none" className={className} style={CLAY_DROP_STYLE} {...rest}>
    <circle cx="24" cy="24" r="19" fill="#C9735B" />
    <path d="M17 17L31 31M31 17L17 31" stroke="#FFFDF8" strokeWidth="5" strokeLinecap="round" />
  </svg>
);

export const PauseCircle: React.FC<ClayIconProps> = ({ className = 'h-4 w-4', ...rest }) => (
  <svg viewBox="0 0 48 48" fill="none" className={className} style={CLAY_DROP_STYLE} {...rest}>
    <circle cx="24" cy="24" r="19" fill="#BA8863" />
    <rect x="17" y="15" width="5" height="18" rx="2.5" fill="#FFFDF8" />
    <rect x="26" y="15" width="5" height="18" rx="2.5" fill="#FFFDF8" />
  </svg>
);

export const UserCheck: React.FC<ClayIconProps> = ({ className = 'h-4 w-4', ...rest }) => (
  <svg viewBox="0 0 48 48" fill="none" className={className} style={CLAY_DROP_STYLE} {...rest}>
    <circle cx="20" cy="16" r="7.5" fill="#74906B" />
    <path d="M7 39C7 32 12.5 27 20 27C27.5 27 33 32 33 39" fill="#74906B" />
    <circle cx="36" cy="31" r="7" fill="#BA8863" />
    <path d="M33 31L35.2 33.2L39.5 28.8" stroke="#FFFDF8" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Volume2: React.FC<ClayIconProps> = ({ className = 'h-4 w-4', ...rest }) => (
  <svg viewBox="0 0 48 48" fill="none" className={className} style={CLAY_DROP_STYLE} {...rest}>
    <path d="M9 19C9 16.8 10.8 15 13 15H18L28 8.5C29.4 7.6 31.2 8.6 31.2 10.2V37.8C31.2 39.4 29.4 40.4 28 39.5L18 33H13C10.8 33 9 31.2 9 29V19Z" fill="#74906B" />
    <path d="M35.5 18.5C37.5 21.5 37.5 26.5 35.5 29.5" stroke="#BA8863" strokeWidth="4.2" strokeLinecap="round" />
    <path d="M40.2 14C43.5 19.5 43.5 28.5 40.2 34" stroke="#F4EDE0" strokeWidth="4" strokeLinecap="round" />
  </svg>
);

export const VolumeX: React.FC<ClayIconProps> = ({ className = 'h-4 w-4', ...rest }) => (
  <svg viewBox="0 0 48 48" fill="none" className={className} style={CLAY_DROP_STYLE} {...rest}>
    <path d="M9 19C9 16.8 10.8 15 13 15H18L28 8.5C29.4 7.6 31.2 8.6 31.2 10.2V37.8C31.2 39.4 29.4 40.4 28 39.5L18 33H13C10.8 33 9 31.2 9 29V19Z" fill="#74906B" opacity="0.7" />
    <path d="M34 19L42 29M42 19L34 29" stroke="#C9735B" strokeWidth="4.5" strokeLinecap="round" />
  </svg>
);

export const GripVertical: React.FC<ClayIconProps> = ({ className = 'h-4 w-4', ...rest }) => (
  <svg viewBox="0 0 48 48" fill="none" className={className} style={CLAY_DROP_STYLE} {...rest}>
    <circle cx="17" cy="12" r="3.6" fill="#74906B" />
    <circle cx="31" cy="12" r="3.6" fill="#BA8863" />
    <circle cx="17" cy="24" r="3.6" fill="#BA8863" />
    <circle cx="31" cy="24" r="3.6" fill="#74906B" />
    <circle cx="17" cy="36" r="3.6" fill="#74906B" />
    <circle cx="31" cy="36" r="3.6" fill="#BA8863" />
  </svg>
);

/* Direct Reference Icon Aliases matching mm_e08a9ae6.jpg */
export const Leaf = ClayCoffeeBeans;
export const Coffee = ClaySageMug;
export const Flame = ClayCaramelMug;
export const Award = ClaySageEspressoSquircle;
export const ShoppingBag = ClayTakeawayCup;
export const Sparkles = ClayEspressoTile;
export const UtensilsCrossed = ClayLatteSaucer;
export const MapPin = ClayCafeStorefront;
export const Store = ClayCafeStorefront;

export const Globe: React.FC<ClayIconProps> = ({ className = 'h-4 w-4', ...rest }) => (
  <svg viewBox="0 0 48 48" fill="none" className={className} style={CLAY_DROP_STYLE} {...rest}>
    <circle cx="24" cy="24" r="18" fill="#74906B" />
    <ellipse cx="24" cy="24" rx="9" ry="18" stroke="#FFFDF8" strokeWidth="3.2" />
    <path d="M7 18.5H41M7 29.5H41" stroke="#FFFDF8" strokeWidth="3.2" strokeLinecap="round" />
  </svg>
);

