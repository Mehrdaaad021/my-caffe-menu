import type { CustomerOrder } from '@/src/types/menu';
import { toPersianDigits } from '@/src/lib/formatters';

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedAudioCtx) {
    sharedAudioCtx = new Ctor();
  }
  return sharedAudioCtx;
}

export async function unlockVoiceAudio(): Promise<boolean> {
  try {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      await ctx.resume();
    }
    return Boolean(ctx && ctx.state === 'running');
  } catch {
    return false;
  }
}

export function playOrderBellChime(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    void ctx.resume().catch(() => {});
  }

  const now = ctx.currentTime;
  const notes = [
    { freq: 587.33, start: 0, duration: 0.28, gain: 0.16 }, // D5
    { freq: 739.99, start: 0.13, duration: 0.32, gain: 0.15 }, // F#5
    { freq: 880.0, start: 0.27, duration: 0.55, gain: 0.18 }, // A5 warm chime
  ];

  for (const n of notes) {
    const osc = ctx.createOscillator();
    const harm = ctx.createOscillator();
    const amp = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(n.freq, now + n.start);

    harm.type = 'triangle';
    harm.frequency.setValueAtTime(n.freq * 2, now + n.start);

    const harmGain = ctx.createGain();
    harmGain.gain.setValueAtTime(0.18, now + n.start);

    amp.gain.setValueAtTime(0.0001, now + n.start);
    amp.gain.linearRampToValueAtTime(n.gain, now + n.start + 0.025);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + n.start + n.duration);

    osc.connect(amp);
    harm.connect(harmGain);
    harmGain.connect(amp);
    amp.connect(ctx.destination);

    osc.start(now + n.start);
    harm.start(now + n.start);
    osc.stop(now + n.start + n.duration + 0.03);
    harm.stop(now + n.start + n.duration + 0.03);
  }
}

function speakPersian(text: string): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    const synth = window.speechSynthesis;
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fa-IR';
    utterance.rate = 0.98;
    utterance.pitch = 1.02;
    utterance.volume = 0.95;

    const voices = synth.getVoices();
    const faVoice =
      voices.find((v) => v.lang.toLowerCase().startsWith('fa')) ||
      voices.find((v) => v.lang.toLowerCase().includes('ir'));
    if (faVoice) {
      utterance.voice = faVoice;
    }

    synth.speak(utterance);
  } catch {
    // Graceful silent fallback when SpeechSynthesis is unavailable
  }
}

export function announceNewOrder(order: CustomerOrder): void {
  playOrderBellChime();

  const itemCount = order.items.reduce((sum, entry) => sum + entry.quantity, 0);
  const locationPhrase = order.tableNumber
    ? `میز شماره ${toPersianDigits(order.tableNumber)}`
    : 'سفارش بیرون‌بر';
  const countPhrase = itemCount > 0 ? `، شامل ${toPersianDigits(itemCount)} قلم` : '';
  const message = `توجه، سفارش جدید برای ${locationPhrase}${countPhrase} ثبت شد.`;

  setTimeout(() => {
    speakPersian(message);
  }, 420);
}

export async function playTestVoiceAlert(): Promise<void> {
  await unlockVoiceAudio();
  playOrderBellChime();
  setTimeout(() => {
    speakPersian('اعلان صوتی سفارش‌های جدید کافه من فعال است.');
  }, 420);
}
