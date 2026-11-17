import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ArrowUp,
  PauseCircle,
  UtensilsCrossed,
  Volume2,
  VolumeX,
} from '@/src/components/ClayCafeIcons';
import cinema01HarvestImg from '@/src/assets/images/cinema_01_harvest_1794913835099.jpg';
import cinema02DryingImg from '@/src/assets/images/cinema_02_drying_1794913835856.jpg';
import cinema03RoastingImg from '@/src/assets/images/cinema_03_roasting_1794913836624.jpg';
import cinema04GrindingImg from '@/src/assets/images/cinema_04_grinding_1794913837490.jpg';
import cinema05BrewingImg from '@/src/assets/images/cinema_05_shower_brew_1794929301778.jpg';
import type { MenuLanguage } from '@/src/lib/menuI18n';

interface CinemaScene {
  id: 'harvest' | 'drying' | 'roasting' | 'grinding' | 'brewing';
  image: string;
  altFa: string;
  altEn: string;
  lightLeakGradient: string;
  ambientGlow: string;
}

const CINEMA_SCENES: CinemaScene[] = [
  {
    id: 'harvest',
    image: cinema01HarvestImg,
    altFa: 'برداشت گیلاس‌های یاقوتی قهوه در سپیده‌دم کوهستان',
    altEn: 'Golden sunrise over misty highland coffee cherries',
    lightLeakGradient:
      'radial-gradient(circle at 18% 22%, rgba(236, 198, 120, 0.28) 0%, transparent 55%)',
    ambientGlow: 'rgba(116, 152, 104, 0.28)',
  },
  {
    id: 'drying',
    image: cinema02DryingImg,
    altFa: 'خشک‌کردن دانه‌های قهوه زیر نور طلایی آفتاب روی تخت‌های چوبی',
    altEn: 'Honey-gold coffee beans drying in warm late-afternoon sunbeams',
    lightLeakGradient:
      'radial-gradient(circle at 78% 18%, rgba(244, 184, 96, 0.3) 0%, transparent 55%)',
    ambientGlow: 'rgba(218, 168, 92, 0.28)',
  },
  {
    id: 'roasting',
    image: cinema03RoastingImg,
    altFa: 'برشته‌کاری دانه‌های قهوه درون درام مسی داغ و دود معطر',
    altEn: 'Dark mahogany coffee beans cascading from a glowing copper drum roaster',
    lightLeakGradient:
      'radial-gradient(circle at 35% 32%, rgba(224, 120, 56, 0.32) 0%, transparent 58%)',
    ambientGlow: 'rgba(204, 114, 58, 0.32)',
  },
  {
    id: 'grinding',
    image: cinema04GrindingImg,
    altFa: 'آسیاب تازه قهوه و آماده‌سازی پرتافیلتر برنجی و تمپر چوب گردو',
    altEn: 'Freshly ground velvety espresso falling into a solid brass portafilter',
    lightLeakGradient:
      'radial-gradient(circle at 64% 25%, rgba(212, 148, 86, 0.28) 0%, transparent 55%)',
    ambientGlow: 'rgba(176, 120, 72, 0.28)',
  },
  {
    id: 'brewing',
    image: cinema05BrewingImg,
    altFa: 'عصاره‌گیری اسپرسوی طلایی از شاور هد گروپ دستگاه درون فنجان سرامیکی',
    altEn: 'Golden tiger-striped espresso pouring directly from the espresso machine group head shower into a handcrafted ceramic cup',
    lightLeakGradient:
      'radial-gradient(circle at 52% 20%, rgba(246, 206, 142, 0.3) 0%, transparent 58%)',
    ambientGlow: 'rgba(202, 152, 98, 0.3)',
  },
];

const AUTO_ADVANCE_MS = 6800;

interface CoffeeComicCarouselProps {
  tone: 'sage' | 'espresso' | 'slate';
  lang?: MenuLanguage;
}

export const CoffeeComicCarousel: React.FC<CoffeeComicCarouselProps> = ({
  tone,
  lang = 'fa',
}) => {
  const prefersReducedMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [isNarrating, setIsNarrating] = useState(false);
  const [isBufferingAudio, setIsBufferingAudio] = useState(false);
  const [narrationError, setNarrationError] = useState<string | null>(null);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  const swipeStartXRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCacheRef = useRef<Map<string, string>>(new Map());
  const narrationRequestIdRef = useRef(0);
  const isNarratingRef = useRef(isNarrating);
  isNarratingRef.current = isNarrating;

  const totalScenes = CINEMA_SCENES.length;
  const currentScene = CINEMA_SCENES[activeIndex];

  const stopAudioPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  const fetchNarrationObjectUrl = useCallback(
    async (sceneId: CinemaScene['id'], targetLang: MenuLanguage): Promise<string> => {
      const key = `${sceneId}-${targetLang}`;
      const cachedUrl = audioCacheRef.current.get(key);
      if (cachedUrl) return cachedUrl;

      const res = await fetch(
        `/api/story/narration?chapter=${encodeURIComponent(sceneId)}&lang=${encodeURIComponent(targetLang)}`,
      );
      if (!res.ok) {
        let message =
          targetLang === 'en'
            ? 'Voice narrator is currently unavailable.'
            : 'صدای راوی در حال حاضر در دسترس نیست.';
        try {
          const data = (await res.json()) as { error?: string };
          if (data?.error) message = data.error;
        } catch {
          // Keep default error
        }
        throw new Error(message);
      }

      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      audioCacheRef.current.set(key, objUrl);
      return objUrl;
    },
    [],
  );

  const playSceneNarration = useCallback(
    async (sceneIdx: number, targetLang: MenuLanguage) => {
      const requestId = ++narrationRequestIdRef.current;
      const scene = CINEMA_SCENES[sceneIdx];
      stopAudioPlayback();
      setNarrationError(null);
      setIsBufferingAudio(true);

      try {
        const audioUrl = await fetchNarrationObjectUrl(scene.id, targetLang);
        if (requestId !== narrationRequestIdRef.current || !isNarratingRef.current) {
          return;
        }

        const audio = audioRef.current ?? new Audio();
        audioRef.current = audio;
        audio.src = audioUrl;
        audio.onended = () => {
          if (!isNarratingRef.current) return;
          setActiveIndex((prev) => (prev + 1) % totalScenes);
        };
        audio.onerror = () => {
          setIsBufferingAudio(false);
          setIsNarrating(false);
        };

        await audio.play();
        if (requestId === narrationRequestIdRef.current) {
          setIsBufferingAudio(false);
        }

        // Pre-warm the next scene's narration audio cleanly in the background
        const nextScene = CINEMA_SCENES[(sceneIdx + 1) % totalScenes];
        void fetchNarrationObjectUrl(nextScene.id, targetLang).catch(() => {});
      } catch (err) {
        if (requestId !== narrationRequestIdRef.current) return;
        setIsBufferingAudio(false);
        setIsNarrating(false);
        setNarrationError(
          err instanceof Error
            ? err.message
            : targetLang === 'en'
              ? 'Unable to start voice narration.'
              : 'پخش صدای راوی انجام نشد.',
        );
      }
    },
    [fetchNarrationObjectUrl, stopAudioPlayback, totalScenes],
  );

  const goToScene = useCallback(
    (nextIdx: number) => {
      const normalized = (nextIdx + totalScenes) % totalScenes;
      setActiveIndex(normalized);
    },
    [totalScenes],
  );

  const handleNext = useCallback(() => {
    goToScene(activeIndex + 1);
  }, [activeIndex, goToScene]);

  const handlePrev = useCallback(() => {
    goToScene(activeIndex - 1);
  }, [activeIndex, goToScene]);

  const toggleNarration = useCallback(() => {
    if (isNarrating) {
      narrationRequestIdRef.current += 1;
      stopAudioPlayback();
      setIsBufferingAudio(false);
      setIsNarrating(false);
      setNarrationError(null);
    } else {
      setIsNarrating(true);
      setIsAutoPlaying(true);
    }
  }, [isNarrating, stopAudioPlayback]);

  // Synchronize narration playback whenever activeIndex, language, or isNarrating changes
  useEffect(() => {
    if (!isNarrating) return;
    void playSceneNarration(activeIndex, lang);
  }, [activeIndex, lang, isNarrating, playSceneNarration]);

  // Auto-advance timer when silent (when narrating, audio.onended drives the scene pacing naturally)
  useEffect(() => {
    if (!isAutoPlaying || isHovered || isNarrating) return;
    const id = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % totalScenes);
    }, AUTO_ADVANCE_MS);
    return () => window.clearInterval(id);
  }, [isAutoPlaying, isHovered, isNarrating, totalScenes]);

  // Cleanup audio & ObjectURLs on unmount
  useEffect(() => {
    const cache = audioCacheRef.current;
    return () => {
      stopAudioPlayback();
      for (const url of cache.values()) {
        URL.revokeObjectURL(url);
      }
      cache.clear();
    };
  }, [stopAudioPlayback]);

  const frameBorderCls =
    tone === 'espresso'
      ? 'border-[#E09862]/28 shadow-[0_34px_80px_-16px_rgba(0,0,0,0.88)]'
      : tone === 'slate'
        ? 'border-[#243F47]/15 shadow-[0_30px_70px_-18px_rgba(24,40,45,0.24)]'
        : 'border-[#2B1B12]/16 shadow-[0_32px_72px_-18px_rgba(36,26,19,0.28)]';

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          if (lang === 'en') handlePrev();
          else handleNext();
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          if (lang === 'en') handleNext();
          else handlePrev();
        }
      }}
      tabIndex={0}
      aria-roledescription="carousel"
      aria-label={
        lang === 'en'
          ? 'Cinematic Coffee Bean to Cup Story Carousel'
          : 'کاروسل سینمایی داستان قهوه از دانه تا فنجان'
      }
      className={`group relative w-full overflow-hidden rounded-[26px] border bg-[#140D09] select-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C87A45] sm:rounded-[32px] ${frameBorderCls}`}
    >
      {/* Dynamic Per-Scene Ambient Backlight */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-6 -z-10 blur-3xl transition-colors duration-1000"
        style={{ background: currentScene.ambientGlow }}
      />

      {/* Full-Bleed 16:9 Widescreen Cinema Stage */}
      <div
        onPointerDown={(e) => {
          swipeStartXRef.current = e.clientX;
        }}
        onPointerUp={(e) => {
          if (swipeStartXRef.current === null) return;
          const deltaX = e.clientX - swipeStartXRef.current;
          swipeStartXRef.current = null;
          if (Math.abs(deltaX) > 40) {
            if (lang === 'en') {
              if (deltaX < 0) handleNext();
              else handlePrev();
            } else {
              if (deltaX > 0) handleNext();
              else handlePrev();
            }
          }
        }}
        className="relative aspect-[16/10] min-h-[210px] w-full max-h-[680px] overflow-hidden sm:aspect-[16/9] sm:min-h-[440px]"
      >
        <AnimatePresence mode="sync">
          <motion.div
            key={currentScene.id}
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 1.06 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 1.03 }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            {imgErrors[currentScene.id] ? (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#2B1B12] to-[#150D09] text-[#E6D5BE]">
                <UtensilsCrossed className="h-12 w-12 opacity-60" />
              </div>
            ) : (
              <img
                src={currentScene.image}
                alt={lang === 'en' ? currentScene.altEn : currentScene.altFa}
                referrerPolicy="no-referrer"
                draggable={false}
                onError={() =>
                  setImgErrors((prev) => ({ ...prev, [currentScene.id]: true }))
                }
                className={`h-full w-full object-cover object-center ${
                  prefersReducedMotion
                    ? ''
                    : activeIndex % 2 === 0
                      ? 'comic-ken-burns'
                      : 'cinema-ken-burns-alt'
                }`}
              />
            )}

            {/* Subtle Atmospheric Cinema Light Leak */}
            {!prefersReducedMotion && (
              <div
                aria-hidden="true"
                className="cinema-light-leak pointer-events-none absolute inset-0"
                style={{ background: currentScene.lightLeakGradient }}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Subtle Cinema Vignette & Bottom Dock Scrim Only */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_58%,rgba(12,7,4,0.42)_100%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/68 via-black/22 to-transparent"
        />

        {/* Subtle Edge Cinema Navigation Arrows */}
        <button
          type="button"
          onClick={handlePrev}
          aria-label={lang === 'en' ? 'Previous scene' : 'صحنه قبلی'}
          className={`absolute top-[42%] z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/42 text-white opacity-85 backdrop-blur-md transition-all hover:scale-105 hover:bg-black/65 hover:opacity-100 sm:top-1/2 sm:h-11 sm:w-11 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 ${
            lang === 'en' ? 'left-2.5 sm:left-5' : 'right-2.5 sm:right-5'
          }`}
        >
          <ArrowUp className={`h-4 w-4 ${lang === 'en' ? '-rotate-90' : 'rotate-90'}`} />
        </button>

        <button
          type="button"
          onClick={handleNext}
          aria-label={lang === 'en' ? 'Next scene' : 'صحنه بعدی'}
          className={`absolute top-[42%] z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/42 text-white opacity-85 backdrop-blur-md transition-all hover:scale-105 hover:bg-black/65 hover:opacity-100 sm:top-1/2 sm:h-11 sm:w-11 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 ${
            lang === 'en' ? 'right-2.5 sm:right-5' : 'left-2.5 sm:left-5'
          }`}
        >
          <ArrowUp className={`h-4 w-4 ${lang === 'en' ? 'rotate-90' : '-rotate-90'}`} />
        </button>

        {/* Minimalist Floating Bottom Cinema Transport & Voice Narrator Dock */}
        <div className="absolute inset-x-2.5 bottom-2.5 z-20 flex flex-col items-center gap-2 sm:inset-x-6 sm:bottom-5">
          {narrationError && (
            <div className="rounded-xl border border-rose-300/30 bg-black/75 px-3 py-1 text-[11px] font-medium text-rose-100 backdrop-blur-md">
              {narrationError}
            </div>
          )}

          <div className="flex w-full max-w-2xl items-center justify-between gap-2 rounded-2xl border border-white/18 bg-black/48 px-2.5 py-1.5 text-white shadow-[0_14px_36px_-10px_rgba(0,0,0,0.65)] backdrop-blur-md sm:gap-3 sm:px-4 sm:py-2.5">
            {/* Voice Narrator Toggle Button */}
            <button
              type="button"
              onClick={toggleNarration}
              aria-pressed={isNarrating}
              aria-label={
                isNarrating
                  ? lang === 'en'
                    ? 'Mute story narrator'
                    : 'توقف صدای راوی'
                  : lang === 'en'
                    ? 'Listen to story narrator'
                    : 'پخش روایت صوتی'
              }
              className={`inline-flex min-h-[36px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border px-2.5 py-1.5 text-[11px] font-bold transition-all sm:gap-2 sm:px-3 sm:text-xs ${
                isNarrating
                  ? 'border-[#E09862]/70 bg-[#C87A45]/90 text-white shadow-[0_6px_18px_-4px_rgba(200,122,69,0.65)]'
                  : 'border-white/20 bg-white/10 text-white/95 hover:bg-white/20'
              }`}
            >
              {isNarrating ? (
                <Volume2 className="h-4 w-4 shrink-0" />
              ) : (
                <VolumeX className="h-4 w-4 shrink-0 opacity-85" />
              )}

              <span>
                {isBufferingAudio
                  ? lang === 'en'
                    ? 'Loading...'
                    : 'بارگذاری...'
                  : isNarrating
                    ? lang === 'en'
                      ? 'Narrating'
                      : 'در حال روایت'
                    : lang === 'en'
                      ? 'Narrator'
                      : 'صدای راوی'}
              </span>

              {/* Animated Equalizer Bars While Narrating */}
              {isNarrating && !isBufferingAudio && !prefersReducedMotion && (
                <span aria-hidden="true" className="flex h-3.5 items-end gap-[2.5px]">
                  <span
                    className="cinema-eq-bar h-full w-[2.5px] rounded-full bg-white"
                    style={{ animationDelay: '0ms' }}
                  />
                  <span
                    className="cinema-eq-bar h-full w-[2.5px] rounded-full bg-white"
                    style={{ animationDelay: '180ms' }}
                  />
                  <span
                    className="cinema-eq-bar h-full w-[2.5px] rounded-full bg-white"
                    style={{ animationDelay: '340ms' }}
                  />
                  <span
                    className="cinema-eq-bar h-full w-[2.5px] rounded-full bg-white"
                    style={{ animationDelay: '120ms' }}
                  />
                </span>
              )}
            </button>

            {/* Minimalist 5-Bar Cinema Timeline */}
            <div
              className="flex flex-1 items-center justify-center gap-1 sm:gap-2.5"
              role="tablist"
              aria-label={lang === 'en' ? 'Story scenes' : 'سکانس‌های داستان'}
            >
              {CINEMA_SCENES.map((scene, idx) => {
                const isActive = idx === activeIndex;
                const isDone = idx < activeIndex;
                return (
                  <button
                    key={scene.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-label={`${lang === 'en' ? 'Scene' : 'سکانس'} ${idx + 1}`}
                    onClick={() => goToScene(idx)}
                    className="group/bar flex h-6 max-w-[34px] flex-1 items-center px-0.5 focus-visible:outline-none sm:max-w-[54px]"
                  >
                    <span className="relative h-[3.5px] w-full overflow-hidden rounded-full bg-white/25 transition-all group-hover/bar:h-[5px]">
                      {isDone && (
                        <span className="absolute inset-0 rounded-full bg-white/80" />
                      )}
                      {isActive && (
                        <motion.span
                          key={`prog-${activeIndex}-${isNarrating ? 'v' : 's'}`}
                          initial={{ scaleX: isNarrating ? 1 : 0 }}
                          animate={{ scaleX: 1 }}
                          transition={
                            isNarrating || !isAutoPlaying || isHovered || prefersReducedMotion
                              ? { duration: 0.25 }
                              : { duration: AUTO_ADVANCE_MS / 1000, ease: 'linear' }
                          }
                          style={{ transformOrigin: lang === 'en' ? 'left' : 'right' }}
                          className="absolute inset-0 rounded-full bg-[#F3C594]"
                        />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Compact Autoplay Pause/Resume Control */}
            <button
              type="button"
              onClick={() => setIsAutoPlaying((prev) => !prev)}
              aria-label={
                isAutoPlaying
                  ? lang === 'en'
                    ? 'Pause slideshow'
                    : 'توقف پخش خودکار'
                  : lang === 'en'
                    ? 'Resume slideshow'
                    : 'ادامه پخش خودکار'
              }
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/18 bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              {isAutoPlaying ? (
                <PauseCircle className="h-4 w-4" />
              ) : (
                <span
                  aria-hidden="true"
                  className="ml-0.5 h-0 w-0 border-y-[5px] border-y-transparent border-l-[9px] border-l-white"
                />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
