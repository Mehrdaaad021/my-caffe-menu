import React from 'react';
import { CheckCircle2, Palette } from '@/src/components/ClayCafeIcons';
import { LANDING_TEMPLATES, type LandingTemplatePreset } from '@/src/lib/landingTemplates';
import type { LandingTemplateId } from '@/src/types/menu';

interface LandingTemplateCardsProps {
  selectedId: LandingTemplateId;
  onSelect: (templateId: LandingTemplateId) => void;
  disabled?: boolean;
  compact?: boolean;
}

const TemplateWireframePreview: React.FC<{ preset: LandingTemplatePreset }> = ({ preset }) => {
  if (preset.id === 'classic-sage') {
    return (
      <div
        className="relative h-28 w-full overflow-hidden rounded-2xl border border-[#2B1B12]/12"
        style={{ backgroundColor: '#F8F2E7' }}
      >
        {/* Diagonal sage left panel */}
        <div
          className="absolute inset-y-0 left-0 w-[52%]"
          style={{
            background: 'linear-gradient(155deg, #DDE6DA 0%, #B8C7B4 100%)',
            clipPath: 'polygon(0 0, 100% 0, 80% 100%, 0 100%)',
          }}
        />
        <div className="relative z-10 flex h-full items-center justify-between gap-3 px-3.5 py-3">
          {/* Right RTL text mockup */}
          <div className="flex w-[48%] flex-col items-start gap-1.5 text-right">
            <span className="h-1.5 w-10 rounded-full bg-[#536F60]/45" />
            <span className="h-2.5 w-20 rounded-md bg-[#2B1B12]/80" />
            <span className="h-1.5 w-16 rounded-full bg-[#6A574A]/45" />
            <div className="mt-1 flex gap-1.5">
              <span className="h-4 w-11 rounded-md bg-[#E07943]" />
              <span className="h-4 w-9 rounded-md border border-[#2B1B12]/20 bg-[#FCF9F2]" />
            </div>
          </div>
          {/* Left wavy frame mockup */}
          <div className="flex w-[44%] items-center justify-center">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-[22px] border-2 border-[#FCF9F2] bg-[#536F60] shadow-md">
              <div className="h-8 w-8 rounded-full bg-[#FCF9F2]/85" />
              <span className="absolute -bottom-1.5 -right-1.5 h-3.5 w-8 rounded-md bg-[#E07943]" />
            </div>
          </div>
        </div>
        {/* Subtle bottom wave edge */}
        <div
          className="absolute inset-x-0 bottom-0 h-2.5 rounded-t-[100%]"
          style={{ backgroundColor: preset.waveBackFill }}
        />
      </div>
    );
  }

  if (preset.id === 'editorial-roastery') {
    return (
      <div
        className="relative h-28 w-full overflow-hidden rounded-2xl border border-[#C87A45]/35"
        style={{
          background: 'linear-gradient(145deg, #241711 0%, #3A251B 60%, #1B110C 100%)',
        }}
      >
        <div className="relative z-10 flex h-full items-center justify-between gap-3 px-3.5 py-3">
          {/* Right RTL dark-roast copy */}
          <div className="flex w-[50%] flex-col items-start gap-1.5">
            <span className="h-1.5 w-11 rounded-full bg-[#C87A45]/80" />
            <span className="h-2.5 w-22 rounded-md bg-[#FAF2E8]/90" />
            <span className="h-1.5 w-16 rounded-full bg-[#E8D9C5]/55" />
            <div className="mt-1 flex gap-1.5">
              <span className="h-4 w-11 rounded-md bg-[#C87A45]" />
              <span className="h-4 w-9 rounded-md border border-[#E8D9C5]/35 bg-[#3A251B]" />
            </div>
          </div>
          {/* Left copper arch showcase */}
          <div className="flex w-[42%] items-center justify-center">
            <div className="flex h-18 w-14 flex-col items-center justify-center rounded-t-full rounded-b-xl border-2 border-[#C87A45] bg-[#362218] shadow-md">
              <div className="h-7 w-7 rounded-full bg-[#E8D9C5]/85" />
              <span className="mt-1.5 h-1.5 w-8 rounded-full bg-[#C87A45]/75" />
            </div>
          </div>
        </div>
        {/* Warm parchment bottom wave */}
        <div
          className="absolute inset-x-0 bottom-0 h-2.5 rounded-t-[100%]"
          style={{ backgroundColor: preset.waveFrontFill }}
        />
      </div>
    );
  }

  // botanical-minimal
  return (
    <div
      className="relative h-28 w-full overflow-hidden rounded-2xl border border-[#2C4952]/20"
      style={{ backgroundColor: '#F3F6F4' }}
    >
      <div className="relative z-10 flex h-full flex-col items-center justify-between px-3.5 py-2.5">
        {/* Centered header & actions */}
        <div className="flex flex-col items-center gap-1">
          <span className="h-1.5 w-12 rounded-full bg-[#2C4952]/40" />
          <span className="h-2 w-24 rounded-md bg-[#1B2B30]/85" />
        </div>
        {/* Wide panoramic showcase bar */}
        <div className="flex w-full items-center justify-between gap-2 rounded-xl border border-[#2C4952]/15 bg-[#D5E2DA]/70 px-2.5 py-1.5">
          <div className="flex items-center gap-1.5">
            <span className="h-4 w-10 rounded-md bg-[#2C4952]" />
            <span className="h-4 w-8 rounded-md bg-[#D6784B]" />
          </div>
          <div className="h-6 w-12 rounded-lg bg-[#FAFBFB] shadow-xs" />
        </div>
        {/* Mini bento strip */}
        <div className="grid w-full grid-cols-4 gap-1.5">
          <span className="h-2.5 rounded-md bg-[#FAFBFB] ring-1 ring-[#2C4952]/15" />
          <span className="h-2.5 rounded-md bg-[#D5E2DA]" />
          <span className="h-2.5 rounded-md bg-[#FAFBFB] ring-1 ring-[#2C4952]/15" />
          <span className="h-2.5 rounded-md bg-[#2C4952]/80" />
        </div>
      </div>
    </div>
  );
};

export const LandingTemplateCards: React.FC<LandingTemplateCardsProps> = ({
  selectedId,
  onSelect,
  disabled = false,
  compact = false,
}) => {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {LANDING_TEMPLATES.map((preset) => {
        const isSelected = selectedId === preset.id;
        return (
          <button
            key={preset.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(preset.id)}
            aria-pressed={isSelected}
            className={`group flex flex-col justify-between rounded-3xl p-4 text-right transition-all disabled:cursor-wait disabled:opacity-70 ${
              isSelected
                ? 'paper-sheet border-2 border-[#C27445] ring-2 ring-[#C27445]/25'
                : 'paper-sheet-kraft border border-[#2B1B12]/12 hover:-translate-y-0.5 hover:border-[#2B1B12]/30'
            }`}
          >
            <div className="w-full space-y-3">
              {/* Miniature Architectural Wireframe */}
              <TemplateWireframePreview preset={preset} />

              {/* Title + Active Badge */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="text-sm font-extrabold text-[#2B1B12]">{preset.titleFa}</h4>
                  <p dir="ltr" className="font-mono text-[10px] font-semibold text-[#7A6252]">
                    {preset.subtitleEn}
                  </p>
                </div>

                {isSelected ? (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-[#4E6B47] px-2.5 py-1 text-[10px] font-extrabold text-[#FCF9F2]">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>قالب فعال</span>
                  </span>
                ) : (
                  <span className="btn-paper-cream shrink-0 rounded-xl px-2.5 py-1 text-[10px] font-bold text-[#5A483C]">
                    انتخاب قالب
                  </span>
                )}
              </div>

              {/* Layout Tag */}
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-[#EFE4D3]/80 px-2.5 py-1 text-[11px] font-bold text-[#5A4232]">
                <Palette className="h-3 w-3 text-[#96522B]" />
                <span>{preset.layoutTagFa}</span>
              </div>

              {!compact && (
                <p className="text-xs leading-relaxed text-[#6A574A]">{preset.descriptionFa}</p>
              )}
            </div>

            {/* Swatches Footer */}
            <div className="mt-3 flex w-full items-center justify-between border-t border-dashed border-[#2B1B12]/15 pt-2.5">
              <span className="text-[11px] font-bold text-[#6A574A]">پالت رنگ پایه:</span>
              <div className="flex items-center gap-1.5" dir="ltr">
                {preset.swatches.map((hex) => (
                  <span
                    key={hex}
                    title={hex}
                    className="h-5 w-5 rounded-full border border-[#2B1B12]/20 shadow-xs"
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};
