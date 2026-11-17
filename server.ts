import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import pg from 'pg';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import type {
  AppContentOverrides,
  CafeStatus,
  CafeSummary,
  CustomerOrder,
  CustomerOrderItem,
  LandingTemplateId,
  LiveTableMonitorEntry,
  LiveTableMonitorResponse,
  LiveTableTray,
  LiveTrayItem,
  MenuCategory,
  MenuDatabase,
  MenuItem,
  OrderStatus,
  RestaurantSettings,
  TableInfo,
  TableStatus,
} from './src/types/menu.ts';

const PORT = Number(process.env.PORT) || 3000;
const IS_VERCEL = Boolean(process.env.VERCEL);
const DATABASE_URL = process.env.DATABASE_URL?.trim() || '';
const USE_NEON = DATABASE_URL.length > 0;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const LEGACY_DATA_FILE = path.join(DATA_DIR, 'menu.json');
const PLATFORM_FILE = path.join(DATA_DIR, 'platform.json');
const PLATFORM_BACKUP_FILE = path.join(DATA_DIR, 'platform.backup.json');
const PLATFORM_TMP_FILE = path.join(DATA_DIR, 'platform.json.tmp');
const SECRET_FILE = path.join(DATA_DIR, '.session-secret');
const UPLOAD_DIR = path.resolve(process.cwd(), 'public', 'uploads');

function resolveLocalSessionSecret(): string {
  const envSecret = process.env.ADMIN_SESSION_SECRET?.trim();
  if (envSecret && envSecret.length >= 24) {
    return envSecret;
  }
  if (IS_VERCEL || USE_NEON) {
    return crypto.randomBytes(48).toString('hex');
  }
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(SECRET_FILE)) {
      const existing = fs.readFileSync(SECRET_FILE, 'utf8').trim();
      if (existing.length >= 32) return existing;
    }
    const generated = crypto.randomBytes(48).toString('hex');
    fs.writeFileSync(SECRET_FILE, generated, { encoding: 'utf8', mode: 0o600 });
    return generated;
  } catch {
    return crypto.randomBytes(48).toString('hex');
  }
}

let ADMIN_SECRET = resolveLocalSessionSecret();

let pgPool: pg.Pool | null = null;
function getPgPool(): pg.Pool {
  if (!pgPool) {
    pgPool = new pg.Pool({
      connectionString: DATABASE_URL,
      max: 5,
      ssl:
        DATABASE_URL.includes('localhost') || DATABASE_URL.includes('127.0.0.1')
          ? undefined
          : { rejectUnauthorized: false },
    });
  }
  return pgPool;
}

let neonSchemaPromise: Promise<void> | null = null;
async function ensureNeonSchema(): Promise<void> {
  if (!USE_NEON) return;
  if (!neonSchemaPromise) {
    neonSchemaPromise = (async () => {
      const pool = getPgPool();
      await pool.query(`
        CREATE TABLE IF NOT EXISTS platform_store (
          id TEXT PRIMARY KEY,
          data JSONB NOT NULL,
          revision INTEGER NOT NULL DEFAULT 1,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS platform_meta (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS uploaded_assets (
          filename TEXT PRIMARY KEY,
          mime_type TEXT NOT NULL,
          data_base64 TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS narration_cache (
          cache_key TEXT PRIMARY KEY,
          wav_base64 TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
    })().catch((err) => {
      neonSchemaPromise = null;
      throw err;
    });
  }
  await neonSchemaPromise;
}

const ALLOWED_FONT_FA = new Set(['vazirmatn', 'markazi', 'noto-naskh', 'lalezar', 'gulzar']);
const ALLOWED_FONT_EN = new Set(['cormorant', 'playfair', 'lora', 'plus-jakarta', 'space-grotesk']);
const ALLOWED_LANDING_TEMPLATES = new Set<LandingTemplateId>([
  'classic-sage',
  'editorial-roastery',
  'botanical-minimal',
]);

function sanitizeLandingTemplate(value: unknown): LandingTemplateId {
  if (typeof value === 'string' && ALLOWED_LANDING_TEMPLATES.has(value as LandingTemplateId)) {
    return value as LandingTemplateId;
  }
  return 'classic-sage';
}

interface CachedMenuTranslation {
  signature: string;
  settings: {
    nameEn: string;
    taglineEn: string;
    addressEn: string;
    hoursEn: string;
    currencyLabelEn: string;
  };
  categories: Array<{ id: string; nameEn: string }>;
  items: Array<{ id: string; nameEn: string; descriptionEn: string; ingredientsEn: string[] }>;
  contentOverrides?: Record<string, string>;
}

const menuTranslationCache = new Map<string, CachedMenuTranslation>();

let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClient;
}

interface CafeTenant {
  id: string;
  slug: string;
  status: CafeStatus;
  allowContentCustomization?: boolean;
  tokenVersion?: number;
  ownerName: string;
  ownerPhone: string;
  adminPasscodeHash: string;
  createdAt: string;
  approvedAt?: string;
  settings: RestaurantSettings;
  contentOverrides?: AppContentOverrides;
  categories: MenuCategory[];
  items: MenuItem[];
  tables: TableInfo[];
  generalQrScans?: number;
  orders?: CustomerOrder[];
  liveTrays?: LiveTableTray[];
  takeawayClearedAt?: string;
}

interface PlatformStore {
  ownerPasscodeHash: string;
  ownerTokenVersion?: number;
  cafes: CafeTenant[];
}

interface AuthenticatedRequest extends Request {
  adminCafeId?: string;
  adminCafeSlug?: string;
}

function hashPasscode(passcode: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(passcode, salt, 64).toString('hex');
  return `scrypt:${salt}:${derived}`;
}

function verifyPasscode(passcode: string, storedHash: string): { valid: boolean; needsUpgrade: boolean } {
  if (!passcode || !storedHash) return { valid: false, needsUpgrade: false };
  if (storedHash.startsWith('scrypt:')) {
    const parts = storedHash.split(':');
    if (parts.length !== 3) return { valid: false, needsUpgrade: false };
    const [, salt, hexHash] = parts;
    try {
      const candidate = crypto.scryptSync(passcode, salt, 64);
      const expected = Buffer.from(hexHash, 'hex');
      if (candidate.length !== expected.length) return { valid: false, needsUpgrade: false };
      return { valid: crypto.timingSafeEqual(candidate, expected), needsUpgrade: false };
    } catch {
      return { valid: false, needsUpgrade: false };
    }
  }
  // Legacy SHA-256 verification with automatic scrypt migration upon login
  const legacyHex = crypto.createHash('sha256').update(passcode).digest('hex');
  const candidateBuf = Buffer.from(legacyHex, 'utf8');
  const expectedBuf = Buffer.from(storedHash, 'utf8');
  if (candidateBuf.length !== expectedBuf.length) return { valid: false, needsUpgrade: false };
  const valid = crypto.timingSafeEqual(candidateBuf, expectedBuf);
  return { valid, needsUpgrade: valid };
}

function normalizeSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function sanitizeImageUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim().slice(0, 400);
  if (!trimmed) return undefined;
  if (/[\x00-\x1f\x7f<>'"]/g.test(trimmed)) return undefined;
  if (
    trimmed.startsWith('/uploads/') ||
    trimmed.startsWith('/assets/') ||
    trimmed.startsWith('preset:')
  ) {
    return trimmed;
  }
  if (trimmed.startsWith('https://')) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol === 'https:' && !parsed.username && !parsed.password) {
        return trimmed;
      }
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function sanitizeContentText(value: unknown, maxLen = 240): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '').trim().slice(0, maxLen);
  return trimmed.length > 0 ? trimmed : undefined;
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function sanitizeMenuCustomizationFields(
  incoming: AppContentOverrides,
  existing: AppContentOverrides = {},
): AppContentOverrides {
  return {
    ...existing,
    menuBannerImageUrl: sanitizeImageUrl(incoming.menuBannerImageUrl),
    headerShareLabel: sanitizeContentText(incoming.headerShareLabel, 60),
    headerTrayLabel: sanitizeContentText(incoming.headerTrayLabel, 60),
    searchPlaceholderFa: sanitizeContentText(incoming.searchPlaceholderFa, 120),
    heroFilterSignatureLabelFa: sanitizeContentText(incoming.heroFilterSignatureLabelFa, 60),
    popularEyebrowEn: sanitizeContentText(incoming.popularEyebrowEn, 80),
    popularTitleFa: sanitizeContentText(incoming.popularTitleFa, 100),
    popularActionFa: sanitizeContentText(incoming.popularActionFa, 80),
    catalogEyebrowEn: sanitizeContentText(incoming.catalogEyebrowEn, 80),
    catalogTitleFa: sanitizeContentText(incoming.catalogTitleFa, 100),
    catalogAllChaptersFa: sanitizeContentText(incoming.catalogAllChaptersFa, 60),
    menuGridViewLabelFa: sanitizeContentText(incoming.menuGridViewLabelFa, 60),
    menuListViewLabelFa: sanitizeContentText(incoming.menuListViewLabelFa, 60),
    emptySearchTitleFa: sanitizeContentText(incoming.emptySearchTitleFa, 160),
  };
}

function sanitizeLandingCustomizationFields(
  incoming: AppContentOverrides,
  existing: AppContentOverrides = {},
): AppContentOverrides {
  return {
    ...existing,
    brandLogoUrl: sanitizeImageUrl(incoming.brandLogoUrl),
    heroFeaturedImageUrl: sanitizeImageUrl(incoming.heroFeaturedImageUrl),
    infoSectionImageUrl: sanitizeImageUrl(incoming.infoSectionImageUrl),
    navFeaturedLabel: sanitizeContentText(incoming.navFeaturedLabel, 60),
    navCatalogLabel: sanitizeContentText(incoming.navCatalogLabel, 60),
    navInfoLabel: sanitizeContentText(incoming.navInfoLabel, 60),
    heroBadgeEn: sanitizeContentText(incoming.heroBadgeEn, 80),
    heroTitleFa: sanitizeContentText(incoming.heroTitleFa, 140),
    heroSubtitleFa: sanitizeContentText(incoming.heroSubtitleFa, 260),
    heroPrimaryCtaFa: sanitizeContentText(incoming.heroPrimaryCtaFa, 80),
    heroSecondaryCtaFa: sanitizeContentText(incoming.heroSecondaryCtaFa, 80),
    heroHighlight1Fa: sanitizeContentText(incoming.heroHighlight1Fa, 60),
    heroHighlight2Fa: sanitizeContentText(incoming.heroHighlight2Fa, 60),
    heroHighlight3Fa: sanitizeContentText(incoming.heroHighlight3Fa, 60),
    heroQualityBadgeFa: sanitizeContentText(incoming.heroQualityBadgeFa, 60),
    heroFeaturedTagEn: sanitizeContentText(incoming.heroFeaturedTagEn, 80),
    heroFeaturedLabelFa: sanitizeContentText(incoming.heroFeaturedLabelFa, 80),
    heroFeaturedActionFa: sanitizeContentText(incoming.heroFeaturedActionFa, 80),
    craftPillar1TitleFa: sanitizeContentText(incoming.craftPillar1TitleFa, 80),
    craftPillar1DescFa: sanitizeContentText(incoming.craftPillar1DescFa, 200),
    craftPillar2TitleFa: sanitizeContentText(incoming.craftPillar2TitleFa, 80),
    craftPillar2DescFa: sanitizeContentText(incoming.craftPillar2DescFa, 200),
    craftPillar3TitleFa: sanitizeContentText(incoming.craftPillar3TitleFa, 80),
    craftPillar3DescFa: sanitizeContentText(incoming.craftPillar3DescFa, 200),
    craftPillar4TitleFa: sanitizeContentText(incoming.craftPillar4TitleFa, 80),
    craftPillar4DescFa: sanitizeContentText(incoming.craftPillar4DescFa, 200),
    infoSectionTitleFa: sanitizeContentText(incoming.infoSectionTitleFa, 100),
    infoAddressTitleFa: sanitizeContentText(incoming.infoAddressTitleFa, 80),
    infoHoursTitleFa: sanitizeContentText(incoming.infoHoursTitleFa, 80),
    infoPhoneTitleFa: sanitizeContentText(incoming.infoPhoneTitleFa, 80),
    infoPhoneValueFa: sanitizeContentText(incoming.infoPhoneValueFa, 60),
    infoQrTitleFa: sanitizeContentText(incoming.infoQrTitleFa, 80),
    infoQrDescFa: sanitizeContentText(incoming.infoQrDescFa, 240),
    footerCopyFa: sanitizeContentText(incoming.footerCopyFa, 120),
    footerTaglineEn: sanitizeContentText(incoming.footerTaglineEn, 100),
  };
}

async function saveUploadedDataUrl(dataUrl: unknown): Promise<{ url?: string; error?: string }> {
  if (!dataUrl || typeof dataUrl !== 'string') {
    return { error: 'فایل تصویر ارسال نشده است.' };
  }
  const match = /^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) {
    return { error: 'فرمت تصویر باید PNG، JPG یا WEBP باشد.' };
  }
  const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
  const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.byteLength === 0 || buffer.byteLength > 6 * 1024 * 1024) {
    return { error: 'حجم تصویر نباید بیشتر از ۶ مگابایت باشد.' };
  }
  if (!hasValidImageMagicBytes(buffer, ext)) {
    return { error: 'محتوای فایل تصویر معتبر نیست.' };
  }
  const filename = `menu-${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`;

  if (USE_NEON) {
    await ensureNeonSchema();
    const pool = getPgPool();
    await pool.query(
      `INSERT INTO uploaded_assets (filename, mime_type, data_base64) VALUES ($1, $2, $3)`,
      [filename, mimeType, buffer.toString('base64')],
    );
    return { url: `/uploads/${filename}` };
  }

  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), buffer);
  return { url: `/uploads/${filename}` };
}

function hasValidImageMagicBytes(buffer: Buffer, ext: string): boolean {
  if (buffer.length < 12) return false;
  if (ext === 'png') {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    );
  }
  if (ext === 'jpg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (ext === 'webp') {
    return (
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    );
  }
  return false;
}

function createDefaultCategories(): MenuCategory[] {
  return [
    { id: 'hot-drinks', nameFa: 'نوشیدنی گرم', nameEn: 'Hot Drinks', order: 1 },
    { id: 'cold-drinks', nameFa: 'نوشیدنی سرد', nameEn: 'Cold Drinks', order: 2 },
    { id: 'appetizers', nameFa: 'پیش غذا', nameEn: 'Appetizers', order: 3 },
    { id: 'burgers', nameFa: 'برگر', nameEn: 'Burgers', order: 4 },
    { id: 'pizza', nameFa: 'پیتزا', nameEn: 'Pizza', order: 5 },
  ];
}

function createStarterItems(now: string): MenuItem[] {
  return [
    {
      id: 'saffron-pistachio-latte',
      categoryId: 'hot-drinks',
      nameFa: 'لاته زعفران و پسته رویال',
      nameEn: 'Royal Saffron Pistachio Latte',
      descriptionFa: 'اسپرسو سینگل‌اورجین اتیوپی با شیر ابریشمی، عصاره زعفران قائنات و پسته برشته دامغان.',
      price: 295000,
      prepTimeMinutes: 6,
      calories: 210,
      ingredientsFa: ['اسپرسو اتیوپی', 'زعفران دم‌کرده', 'کرم پسته دست‌ساز', 'شیر پرچرب ارگانیک'],
      imageUrl: 'preset:saffron_latte',
      isSignature: true,
      isAvailable: true,
      depthLevel: 'elevated',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'blood-orange-espresso-tonic',
      categoryId: 'cold-drinks',
      nameFa: 'اسپرسو تونیک پرتقال خونی',
      nameEn: 'Blood Orange Espresso Tonic',
      descriptionFa: 'دبل شات اسپرسو رست مدیوم روی تونیک دست‌ساز، اسلایس پرتقال خونی خشک و رزماری تازه.',
      price: 270000,
      prepTimeMinutes: 5,
      calories: 95,
      ingredientsFa: ['دبل اسپرسو کلمبیا', 'تونیک بوتانیکال', 'پرتقال خونی کاراملی', 'رزماری تازه'],
      imageUrl: 'preset:espresso_tonic',
      isSignature: true,
      isAvailable: true,
      depthLevel: 'elevated',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'smoked-salmon-croissant',
      categoryId: 'appetizers',
      nameFa: 'کروسان برانچ سالمون و آووکادو',
      nameEn: 'Smoked Salmon Croissant Starter',
      descriptionFa: 'کروسان کره‌ای پخت صبحگاهی با سالمون دودی نروژی، تخم‌مرغ عسلی پوچد و روبان‌های آووکادو.',
      price: 620000,
      prepTimeMinutes: 12,
      calories: 460,
      ingredientsFa: ['کروسان کره فرانسوی', 'سالمون دودی نروژی', 'تخم‌مرغ پوچد', 'آووکادو و میکروگرین'],
      imageUrl: 'preset:croissant_brunch',
      isSignature: true,
      isAvailable: true,
      depthLevel: 'elevated',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'wild-mushroom-truffle-tagliatelle',
      categoryId: 'appetizers',
      nameFa: 'تالیاتله ترافل و قارچ وحشی',
      nameEn: 'Wild Mushroom Truffle Tagliatelle',
      descriptionFa: 'پاستای دست‌ساز با سس خامه‌ای قارچ پورچینی، ورقه‌های ترافل سیاه ایتالیایی و پارمزان ۲۴ ماهه.',
      price: 740000,
      prepTimeMinutes: 14,
      calories: 520,
      ingredientsFa: ['پاستا تازه دست‌ساز', 'قارچ پورچینی', 'ترافل سیاه', 'پارمیجانو رجیانو'],
      imageUrl: 'preset:truffle_pasta',
      isSignature: false,
      isAvailable: true,
      depthLevel: 'elevated',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'double-smash-wagyu-burger',
      categoryId: 'burgers',
      nameFa: 'دبل اسمش واگیو برگر',
      nameEn: 'Double Smash Wagyu Burger',
      descriptionFa: 'دو لایه برگر راسته گوساله اسمش‌شده با پنیر چدار کهنه، پیاز کاراملی، روکولا و نان بریوش برشته.',
      price: 790000,
      prepTimeMinutes: 15,
      calories: 720,
      ingredientsFa: ['گوشت راسته تازه', 'چدار کهنه انگلیسی', 'پیاز کاراملی‌شده', 'نان بریوش کره‌ای'],
      imageUrl: 'preset:burger',
      isSignature: true,
      isAvailable: true,
      depthLevel: 'elevated',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'neapolitan-burrata-pepperoni-pizza',
      categoryId: 'pizza',
      nameFa: 'پیتزا ناپولیتن پپرونی و بوراتا',
      nameEn: 'Neapolitan Burrata & Pepperoni',
      descriptionFa: 'خمیر تخمیر ۴۸ ساعته ناپولیتن با سس گوجه سن‌مارزانو، پنیر بوراتای تازه، پپرونی دودی و ریحان.',
      price: 860000,
      prepTimeMinutes: 16,
      calories: 810,
      ingredientsFa: ['خمیر تخمیر ۴۸ ساعته', 'گوجه سن‌مارزانو', 'بوراتای تازه', 'پپرونی دست‌ساز'],
      imageUrl: 'preset:pizza',
      isSignature: true,
      isAvailable: true,
      depthLevel: 'elevated',
      createdAt: now,
      updatedAt: now,
    },
  ];
}

function createInitialTables(count: number, seedOccupancy = false): TableInfo[] {
  const now = new Date().toISOString();
  const list: TableInfo[] = [];
  for (let i = 1; i <= count; i++) {
    const capacity = i % 5 === 0 ? 6 : i % 3 === 0 ? 2 : 4;
    let status: TableStatus = 'available';
    let guestsCount = 0;
    let note = '';

    if (seedOccupancy) {
      if (i === 2) {
        status = 'occupied';
        guestsCount = 3;
        note = 'سفارش لاته و کروسان ثبت شده';
      } else if (i === 5) {
        status = 'occupied';
        guestsCount = 5;
        note = 'میز VIP پنج‌نفره';
      } else if (i === 7) {
        status = 'reserved';
        guestsCount = 4;
        note = 'رزرو ساعت ۲۰:۳۰ - خانم رضایی';
      } else if (i === 9) {
        status = 'cleaning';
        guestsCount = 0;
        note = 'در حال آماده‌سازی سالن';
      }
    }

    list.push({
      number: i,
      label: `میز ${i}`,
      capacity,
      status,
      guestsCount,
      note,
      updatedAt: now,
      qrScans: 0,
    });
  }
  return list;
}

function syncTables(existing: TableInfo[] | undefined, targetCount: number): TableInfo[] {
  const map = new Map<number, TableInfo>();
  for (const t of existing ?? []) {
    map.set(t.number, {
      ...t,
      qrScans: typeof t.qrScans === 'number' && Number.isFinite(t.qrScans) && t.qrScans >= 0 ? Math.floor(t.qrScans) : 0,
    });
  }
  const now = new Date().toISOString();
  const next: TableInfo[] = [];
  for (let i = 1; i <= targetCount; i++) {
    const prev = map.get(i);
    if (prev) {
      next.push(prev);
    } else {
      next.push({
        number: i,
        label: `میز ${i}`,
        capacity: i % 5 === 0 ? 6 : i % 3 === 0 ? 2 : 4,
        status: 'available',
        guestsCount: 0,
        note: '',
        updatedAt: now,
        qrScans: 0,
      });
    }
  }
  return next;
}

function createStarterOrders(now: string): CustomerOrder[] {
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const fortyMinAgo = new Date(Date.now() - 40 * 60 * 1000).toISOString();
  const ninetyMinAgo = new Date(Date.now() - 90 * 60 * 1000).toISOString();

  return [
    {
      id: 'ord-seed-1',
      orderNumber: 'ORD-101',
      tableNumber: 2,
      customerNote: 'بدون شکر اضافه',
      items: [
        {
          itemId: 'saffron-pistachio-latte',
          nameFa: 'لاته زعفران و پسته رویال',
          unitPrice: 295000,
          quantity: 2,
          note: 'شیر جو دو سر',
        },
        {
          itemId: 'smoked-salmon-croissant',
          nameFa: 'کروسان برانچ سالمون و آووکادو',
          unitPrice: 620000,
          quantity: 1,
        },
      ],
      subtotal: 1210000,
      serviceFee: 121000,
      total: 1331000,
      status: 'preparing',
      createdAt: tenMinAgo,
      updatedAt: tenMinAgo,
    },
    {
      id: 'ord-seed-2',
      orderNumber: 'ORD-100',
      tableNumber: 5,
      items: [
        {
          itemId: 'double-smash-wagyu-burger',
          nameFa: 'دبل اسمش واگیو برگر',
          unitPrice: 790000,
          quantity: 1,
        },
        {
          itemId: 'blood-orange-espresso-tonic',
          nameFa: 'اسپرسو تونیک پرتقال خونی',
          unitPrice: 270000,
          quantity: 1,
        },
      ],
      subtotal: 1060000,
      serviceFee: 106000,
      total: 1166000,
      status: 'completed',
      createdAt: fortyMinAgo,
      updatedAt: now,
    },
    {
      id: 'ord-seed-3',
      orderNumber: 'ORD-099',
      tableNumber: 4,
      customerNote: 'تغییر سفارش میز',
      items: [
        {
          itemId: 'wild-mushroom-truffle-tagliatelle',
          nameFa: 'تالیاتله ترافل و قارچ وحشی',
          unitPrice: 740000,
          quantity: 1,
        },
      ],
      subtotal: 740000,
      serviceFee: 74000,
      total: 814000,
      status: 'cancelled',
      createdAt: ninetyMinAgo,
      updatedAt: ninetyMinAgo,
    },
  ];
}

function createInitialPlatform(): PlatformStore {
  const now = new Date().toISOString();
  const isProd = process.env.NODE_ENV === 'production';
  const generatedAdminPass = crypto.randomBytes(6).toString('hex');
  const generatedOwnerPass = crypto.randomBytes(8).toString('hex');
  const defaultPasscode = process.env.ADMIN_PASSCODE?.trim() || (isProd ? generatedAdminPass : '1405');
  const defaultOwnerPasscode = process.env.OWNER_PASSCODE?.trim() || (isProd ? generatedOwnerPass : '9900');

  if (isProd && (!process.env.ADMIN_PASSCODE || !process.env.OWNER_PASSCODE)) {
    console.warn(
      `[SECURITY] Initialized production store with generated one-time passcodes (ADMIN: ${defaultPasscode}, OWNER: ${defaultOwnerPasscode}). Change these immediately or set ADMIN_PASSCODE / OWNER_PASSCODE.`,
    );
  }

  let flagshipSettings: RestaurantSettings = {
    nameFa: 'کافه من',
    nameEn: 'MY CAFE',
    taglineFa: 'تلاقی هنر آشپزی معاصر و قهوه‌سازی تخصصی در فضایی آرام و بی‌زمان',
    addressFa: 'تهران، الهیه، خیابان فرشته، پلاک ۲۸',
    hoursFa: 'همه‌روزه از ۸:۳۰ تا ۲۳:۴۵',
    currencyLabel: 'تومان',
    tableCount: 16,
    serviceChargePercent: 10,
    fontFa: 'vazirmatn',
    fontEn: 'cormorant',
  };
  let flagshipCategories = createDefaultCategories();
  let flagshipItems = createStarterItems(now);
  let flagshipPasscodeHash = hashPasscode(defaultPasscode);

  // Seamless migration from legacy single-cafe data/menu.json if present
  if (fs.existsSync(LEGACY_DATA_FILE)) {
    try {
      const legacy = JSON.parse(fs.readFileSync(LEGACY_DATA_FILE, 'utf8')) as {
        adminPasscodeHash?: string;
        settings?: RestaurantSettings;
        categories?: MenuCategory[];
        items?: MenuItem[];
      };
      if (legacy.settings) flagshipSettings = legacy.settings;
      if (Array.isArray(legacy.categories) && legacy.categories.length > 0) {
        flagshipCategories = legacy.categories;
      }
      if (Array.isArray(legacy.items) && legacy.items.length > 0) {
        flagshipItems = legacy.items;
      }
      if (legacy.adminPasscodeHash) {
        flagshipPasscodeHash = legacy.adminPasscodeHash;
      }
    } catch {
      // Fall back to fresh flagship data
    }
  }

  const flagshipCafe: CafeTenant = {
    id: 'cafe-ors-atelier',
    slug: 'ors-atelier',
    status: 'approved',
    allowContentCustomization: true,
    ownerName: 'مدیریت کافه من',
    ownerPhone: '۰۹۱۲۰۰۰۰۰۰۰',
    adminPasscodeHash: flagshipPasscodeHash,
    createdAt: now,
    approvedAt: now,
    settings: flagshipSettings,
    contentOverrides: {},
    categories: flagshipCategories,
    items: flagshipItems,
    tables: createInitialTables(flagshipSettings.tableCount, true),
    orders: createStarterOrders(now),
  };

  return {
    ownerPasscodeHash: hashPasscode(defaultOwnerPasscode),
    cafes: [flagshipCafe],
  };
}

let cachedStore: PlatformStore | null = null;

function isValidPlatformStore(candidate: unknown): candidate is PlatformStore {
  if (!candidate || typeof candidate !== 'object') return false;
  const obj = candidate as Partial<PlatformStore>;
  return (
    typeof obj.ownerPasscodeHash === 'string' &&
    obj.ownerPasscodeHash.length > 0 &&
    Array.isArray(obj.cafes) &&
    obj.cafes.length > 0
  );
}

function normalizeAndMigrateStore(parsed: PlatformStore): boolean {
  let dirty = false;
  const now = new Date().toISOString();
  if (typeof parsed.ownerTokenVersion !== 'number' || parsed.ownerTokenVersion < 1) {
    parsed.ownerTokenVersion = 1;
    dirty = true;
  }
  for (const cafe of parsed.cafes) {
    const safeTableCount = clampInt(cafe.settings?.tableCount, 1, 200, 12);
    if (cafe.settings.tableCount !== safeTableCount) {
      cafe.settings.tableCount = safeTableCount;
      dirty = true;
    }
    const synced = syncTables(cafe.tables, safeTableCount);
    if (!cafe.tables || synced.length !== cafe.tables.length) {
      cafe.tables = synced;
      dirty = true;
    }
    if (!Array.isArray(cafe.orders)) {
      cafe.orders = cafe.slug === 'ors-atelier' ? createStarterOrders(now) : [];
      dirty = true;
    }
    if (typeof cafe.allowContentCustomization !== 'boolean') {
      cafe.allowContentCustomization = cafe.slug === 'ors-atelier';
      dirty = true;
    }
    if (typeof cafe.tokenVersion !== 'number' || cafe.tokenVersion < 1) {
      cafe.tokenVersion = 1;
      dirty = true;
    }
    if (!cafe.contentOverrides || typeof cafe.contentOverrides !== 'object') {
      cafe.contentOverrides = {};
      dirty = true;
    }
    const safeTemplate = sanitizeLandingTemplate(cafe.settings.landingTemplate);
    if (cafe.settings.landingTemplate !== safeTemplate) {
      cafe.settings.landingTemplate = safeTemplate;
      dirty = true;
    }
    if (cafe.slug === 'ors-atelier') {
      if (cafe.settings.nameFa === 'اُرس آتلیه') {
        cafe.settings.nameFa = 'کافه من';
        dirty = true;
      }
      if (cafe.settings.nameEn === 'ORS ATELIER') {
        cafe.settings.nameEn = 'MY CAFE';
        dirty = true;
      }
      if (cafe.ownerName === 'مدیریت اُرس آتلیه') {
        cafe.ownerName = 'مدیریت کافه من';
        dirty = true;
      }
      if (cafe.contentOverrides.navFeaturedLabel === 'برگزیده آتلیه') {
        cafe.contentOverrides.navFeaturedLabel = 'برگزیده کافه من';
        dirty = true;
      }
    }
  }
  return dirty;
}

let lastSyncedRevision = -1;
let neonSecretSynced = false;
let remoteWriteQueue: Promise<void> = Promise.resolve();
let pendingRemoteSave: Promise<void> | null = null;

async function persistStoreToNeon(store: PlatformStore): Promise<void> {
  await ensureNeonSchema();
  const pool = getPgPool();
  const res = await pool.query<{ revision: number }>(
    `INSERT INTO platform_store (id, data, revision, updated_at)
     VALUES ('main', $1::jsonb, 1, NOW())
     ON CONFLICT (id) DO UPDATE
       SET data = EXCLUDED.data,
           revision = platform_store.revision + 1,
           updated_at = NOW()
     RETURNING revision`,
    [JSON.stringify(store)],
  );
  if (res.rows[0]?.revision !== undefined) {
    lastSyncedRevision = res.rows[0].revision;
  }
}

async function syncRemoteStorage(): Promise<void> {
  if (!USE_NEON) {
    ensureStorage();
    return;
  }

  await ensureNeonSchema();
  const pool = getPgPool();

  if (!neonSecretSynced) {
    const envSecret = process.env.ADMIN_SESSION_SECRET?.trim();
    if (envSecret && envSecret.length >= 24) {
      ADMIN_SECRET = envSecret;
    } else {
      const secretRow = await pool.query<{ value: string }>(
        `SELECT value FROM platform_meta WHERE key = 'session_secret' LIMIT 1`,
      );
      if (secretRow.rows[0]?.value && secretRow.rows[0].value.length >= 32) {
        ADMIN_SECRET = secretRow.rows[0].value;
      } else {
        const candidate = crypto.randomBytes(48).toString('hex');
        await pool.query(
          `INSERT INTO platform_meta (key, value) VALUES ('session_secret', $1) ON CONFLICT (key) DO NOTHING`,
          [candidate],
        );
        const confirmed = await pool.query<{ value: string }>(
          `SELECT value FROM platform_meta WHERE key = 'session_secret' LIMIT 1`,
        );
        if (confirmed.rows[0]?.value) {
          ADMIN_SECRET = confirmed.rows[0].value;
        }
      }
    }
    neonSecretSynced = true;
  }

  const row = await pool.query<{ data: unknown; revision: number }>(
    `SELECT data, revision FROM platform_store WHERE id = 'main' LIMIT 1`,
  );

  if (row.rows[0]) {
    const { data, revision } = row.rows[0];
    if (!cachedStore || revision !== lastSyncedRevision) {
      if (isValidPlatformStore(data)) {
        const dirty = normalizeAndMigrateStore(data);
        cachedStore = data;
        lastSyncedRevision = revision;
        if (dirty) {
          await persistStoreToNeon(data);
        }
      } else {
        throw new Error('Existing Neon platform_store row could not be validated.');
      }
    }
    return;
  }

  // First-time Neon bootstrap: migrate existing platform.json if present, else create fresh platform
  let initial: PlatformStore | null = null;
  if (fs.existsSync(PLATFORM_FILE)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(PLATFORM_FILE, 'utf8')) as unknown;
      if (isValidPlatformStore(parsed)) {
        normalizeAndMigrateStore(parsed);
        initial = parsed;
      }
    } catch {
      // Fallback to fresh bootstrap
    }
  }
  if (!initial) {
    initial = createInitialPlatform();
    initial.ownerTokenVersion = 1;
    initial.cafes = initial.cafes.map((c) => ({ ...c, tokenVersion: 1 }));
  }

  await pool.query(
    `INSERT INTO platform_store (id, data, revision, updated_at)
     VALUES ('main', $1::jsonb, 1, NOW())
     ON CONFLICT (id) DO NOTHING`,
    [JSON.stringify(initial)],
  );

  const reloaded = await pool.query<{ data: unknown; revision: number }>(
    `SELECT data, revision FROM platform_store WHERE id = 'main' LIMIT 1`,
  );
  if (reloaded.rows[0] && isValidPlatformStore(reloaded.rows[0].data)) {
    cachedStore = reloaded.rows[0].data;
    lastSyncedRevision = reloaded.rows[0].revision;
  } else {
    cachedStore = initial;
    lastSyncedRevision = 1;
  }
}

function ensureStorage(): PlatformStore {
  if (cachedStore) {
    return cachedStore;
  }
  if (USE_NEON) {
    throw new Error('Remote database is still initializing. Please retry.');
  }
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  let loaded: PlatformStore | null = null;
  if (fs.existsSync(PLATFORM_FILE)) {
    try {
      const raw = fs.readFileSync(PLATFORM_FILE, 'utf8');
      const parsed = JSON.parse(raw) as unknown;
      if (isValidPlatformStore(parsed)) {
        loaded = parsed;
      }
    } catch (err) {
      console.error('Warning: platform.json parse error, trying backup recovery:', err);
    }
  }

  if (!loaded && fs.existsSync(PLATFORM_BACKUP_FILE)) {
    try {
      const backupRaw = fs.readFileSync(PLATFORM_BACKUP_FILE, 'utf8');
      const parsedBackup = JSON.parse(backupRaw) as unknown;
      if (isValidPlatformStore(parsedBackup)) {
        loaded = parsedBackup;
        fs.writeFileSync(PLATFORM_FILE, backupRaw, { encoding: 'utf8', mode: 0o600 });
        console.warn('Recovered platform database cleanly from platform.backup.json');
      }
    } catch (err) {
      console.error('Warning: platform.backup.json recovery failed:', err);
    }
  }

  if (!loaded) {
    if (fs.existsSync(PLATFORM_FILE)) {
      throw new Error('Existing platform.json could not be parsed cleanly; refusing to overwrite database.');
    }
    const initial = createInitialPlatform();
    initial.ownerTokenVersion = 1;
    initial.cafes = initial.cafes.map((c) => ({ ...c, tokenVersion: 1 }));
    cachedStore = initial;
    saveStore(initial);
    return initial;
  }

  const dirty = normalizeAndMigrateStore(loaded);
  cachedStore = loaded;
  if (dirty) {
    saveStore(loaded);
  }
  return loaded;
}

function saveStore(store: PlatformStore): void {
  cachedStore = store;
  if (USE_NEON) {
    const task = remoteWriteQueue.then(() => persistStoreToNeon(store));
    remoteWriteQueue = task.catch((err) => {
      console.error('Neon persistStore error:', err);
    });
    pendingRemoteSave = task;
    return;
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const serialized = JSON.stringify(store, null, 2);
  if (fs.existsSync(PLATFORM_FILE)) {
    try {
      const prev = fs.readFileSync(PLATFORM_FILE, 'utf8');
      if (prev.trim().length > 2) {
        fs.writeFileSync(PLATFORM_BACKUP_FILE, prev, { encoding: 'utf8', mode: 0o600 });
      }
    } catch {
      // Non-fatal backup attempt
    }
  }
  fs.writeFileSync(PLATFORM_TMP_FILE, serialized, { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(PLATFORM_TMP_FILE, PLATFORM_FILE);
}

function toPublicMenu(cafe: CafeTenant): MenuDatabase {
  const isApproved = cafe.status === 'approved';
  return {
    cafeId: cafe.id,
    cafeSlug: cafe.slug,
    cafeStatus: cafe.status,
    allowContentCustomization: Boolean(cafe.allowContentCustomization),
    settings: cafe.settings,
    contentOverrides: isApproved ? cafe.contentOverrides ?? {} : {},
    categories: isApproved ? [...cafe.categories].sort((a, b) => a.order - b.order) : [],
    items: isApproved ? cafe.items : [],
    // Never leak private table reservation notes / occupancy to unauthenticated customers
    tables: [],
  };
}

function toAdminMenu(cafe: CafeTenant): MenuDatabase {
  const isApproved = cafe.status === 'approved';
  return {
    ...toPublicMenu(cafe),
    tables: isApproved ? syncTables(cafe.tables, cafe.settings.tableCount) : [],
    generalQrScans: cafe.generalQrScans ?? 0,
  };
}

function toCafeSummary(cafe: CafeTenant): CafeSummary {
  const tables = syncTables(cafe.tables, cafe.settings.tableCount);
  return {
    id: cafe.id,
    slug: cafe.slug,
    status: cafe.status,
    allowContentCustomization: Boolean(cafe.allowContentCustomization),
    landingTemplate: sanitizeLandingTemplate(cafe.settings.landingTemplate),
    nameFa: cafe.settings.nameFa,
    nameEn: cafe.settings.nameEn,
    ownerName: cafe.ownerName,
    ownerPhone: cafe.ownerPhone,
    tableCount: cafe.settings.tableCount,
    itemsCount: cafe.items.length,
    occupiedTablesCount: tables.filter((t) => t.status === 'occupied').length,
    createdAt: cafe.createdAt,
    approvedAt: cafe.approvedAt,
  };
}

const LIVE_TRAY_TTL_MS = 2 * 60 * 60 * 1000;
const ACTIVE_ORDER_STATUS_SET = new Set<OrderStatus>(['pending', 'preparing', 'ready']);

function pruneLiveTrays(cafe: CafeTenant): LiveTableTray[] {
  const cutoff = Date.now() - LIVE_TRAY_TTL_MS;
  const list = Array.isArray(cafe.liveTrays) ? cafe.liveTrays : [];
  return list
    .filter((entry) => {
      if (!entry || !Array.isArray(entry.items) || entry.items.length === 0) return false;
      const ts = new Date(entry.updatedAt).getTime();
      return Number.isFinite(ts) && ts >= cutoff;
    })
    .slice(0, 200);
}

function buildLiveTableMonitor(cafe: CafeTenant): LiveTableMonitorResponse {
  const tables = syncTables(cafe.tables, cafe.settings.tableCount);
  const trays = pruneLiveTrays(cafe);
  const activeOrders = (cafe.orders ?? []).filter((o) => ACTIVE_ORDER_STATUS_SET.has(o.status));

  const buildEntry = (
    tableNumber: number | null,
    label: string,
    capacity: number,
    tableStatus: TableStatus,
    guestsCount: number,
    tableUpdatedAt?: string,
  ): LiveTableMonitorEntry => {
    const matchingTrays = trays
      .filter((t) => (tableNumber === null ? t.tableNumber === null : t.tableNumber === tableNumber))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    const matchingOrders = activeOrders
      .filter((o) => (tableNumber === null ? o.tableNumber === null : o.tableNumber === tableNumber))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const liveItemsCount = matchingTrays.reduce((sum, t) => sum + t.itemCount, 0);
    const liveSubtotal = matchingTrays.reduce((sum, t) => sum + t.subtotal, 0);
    const ordersTotal = matchingOrders.reduce((sum, o) => sum + o.total, 0);
    const hasActiveTray =
      matchingTrays.length > 0 ||
      matchingOrders.length > 0 ||
      (tableNumber !== null && tableStatus === 'occupied');

    const timestamps: number[] = [];
    for (const t of matchingTrays) {
      const ms = new Date(t.updatedAt).getTime();
      if (Number.isFinite(ms)) timestamps.push(ms);
    }
    for (const o of matchingOrders) {
      const ms = new Date(o.updatedAt || o.createdAt).getTime();
      if (Number.isFinite(ms)) timestamps.push(ms);
    }
    if (tableUpdatedAt && tableStatus === 'occupied') {
      const ms = new Date(tableUpdatedAt).getTime();
      if (Number.isFinite(ms)) timestamps.push(ms);
    }
    const lastActivityAt =
      timestamps.length > 0 ? new Date(Math.max(...timestamps)).toISOString() : undefined;

    return {
      tableNumber,
      label,
      capacity,
      tableStatus,
      guestsCount,
      liveTrays: matchingTrays,
      activeOrders: matchingOrders,
      hasActiveTray,
      liveItemsCount,
      activeOrdersCount: matchingOrders.length,
      estimatedTotal: liveSubtotal + ordersTotal,
      lastActivityAt,
    };
  };

  const tableEntries = tables.map((t) =>
    buildEntry(t.number, t.label, t.capacity, t.status, t.guestsCount, t.updatedAt),
  );

  const takeawayEntry = buildEntry(null, 'بیرون‌بر (Takeaway)', 0, 'available', 0);
  const hasTakeawayActivity =
    takeawayEntry.liveTrays.length > 0 || takeawayEntry.activeOrders.length > 0;

  return {
    tables: tableEntries,
    takeaway: hasTakeawayActivity ? takeawayEntry : null,
    stats: {
      totalTables: tableEntries.length,
      activeTablesCount: tableEntries.filter((t) => t.hasActiveTray).length,
      liveBrowsingCount: trays.length,
      pendingOrdersCount: activeOrders.filter(
        (o) => o.status === 'pending' || o.status === 'preparing',
      ).length,
      readyOrdersCount: activeOrders.filter((o) => o.status === 'ready').length,
    },
    updatedAt: new Date().toISOString(),
  };
}

function resolveCafeFromRequest(store: PlatformStore, slugParam?: unknown): CafeTenant | null {
  const requested = typeof slugParam === 'string' ? normalizeSlug(slugParam) : '';
  if (requested) {
    return store.cafes.find((c) => c.slug === requested) ?? null;
  }
  return store.cafes.find((c) => c.status === 'approved') ?? store.cafes[0] ?? null;
}

function signToken(payloadObj: Record<string, unknown>): string {
  const payload = Buffer.from(JSON.stringify(payloadObj)).toString('base64url');
  const sig = crypto.createHmac('sha256', ADMIN_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyTokenPayload(token?: string | null): Record<string, unknown> | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', ADMIN_SECRET).update(payload).digest('base64url');
  if (sig.length !== expectedSig.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Record<
      string,
      unknown
    >;
    if (typeof parsed.exp !== 'number' || parsed.exp <= Date.now()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const payload = verifyTokenPayload(token);

  if (!payload || payload.role !== 'cafe_admin' || typeof payload.cafeId !== 'string') {
    res.status(401).json({ error: 'نشست مدیریت کافی‌شاپ معتبر نیست. لطفاً دوباره وارد شوید.' });
    return;
  }

  const store = ensureStorage();
  const cafe = store.cafes.find((c) => c.id === payload.cafeId);
  if (!cafe) {
    res.status(401).json({ error: 'حساب کافی‌شاپ یافت نشد.' });
    return;
  }
  if (cafe.status !== 'approved') {
    res.status(403).json({
      error:
        cafe.status === 'pending'
          ? 'حساب کافی‌شاپ هنوز توسط مالک پلتفرم تأیید نشده است.'
          : 'دسترسی این کافی‌شاپ توسط مالک پلتفرم موقتاً غیرفعال شده است.',
    });
    return;
  }
  const expectedTv = cafe.tokenVersion ?? 1;
  if (payload.tv !== expectedTv) {
    res.status(401).json({ error: 'نشست شما منقضی شده است. لطفاً دوباره وارد شوید.' });
    return;
  }

  req.adminCafeId = cafe.id;
  req.adminCafeSlug = cafe.slug;
  next();
}

function requireOwner(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const payload = verifyTokenPayload(token);

  if (!payload || payload.role !== 'platform_owner') {
    res.status(401).json({ error: 'نشست مالک پلتفرم معتبر نیست. لطفاً وارد شوید.' });
    return;
  }
  const store = ensureStorage();
  if (payload.tv !== (store.ownerTokenVersion ?? 1)) {
    res.status(401).json({ error: 'نشست مالک پلتفرم تغییر یافته است. لطفاً دوباره وارد شوید.' });
    return;
  }
  next();
}

const authRateBuckets = new Map<string, { count: number; resetAt: number }>();
const orderRateBuckets = new Map<string, { count: number; resetAt: number }>();
const aiRateBuckets = new Map<string, { count: number; resetAt: number }>();
const qrScanRateBuckets = new Map<string, { count: number; resetAt: number }>();
const traySyncRateBuckets = new Map<string, { count: number; resetAt: number }>();

function pruneBucketMap(map: Map<string, { count: number; resetAt: number }>, now: number): void {
  if (map.size <= 500) return;
  for (const [key, value] of map.entries()) {
    if (value.resetAt <= now) map.delete(key);
  }
}

function rateLimitAuth(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const bucketKey = `${req.path}:${ip}`;
  const now = Date.now();
  pruneBucketMap(authRateBuckets, now);
  const windowMs = 15 * 60 * 1000;
  const maxAttempts = req.path.includes('login') ? 12 : 20;

  const entry = authRateBuckets.get(bucketKey);
  if (!entry || entry.resetAt <= now) {
    authRateBuckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    next();
    return;
  }
  if (entry.count >= maxAttempts) {
    res.status(429).json({
      error: 'تعداد تلاش‌های ناموفق بیش از حد مجاز بوده است. لطفاً دقایقی دیگر تلاش کنید.',
    });
    return;
  }
  entry.count += 1;
  next();
}

function rateLimitPublicOrders(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  pruneBucketMap(orderRateBuckets, now);
  const windowMs = 10 * 60 * 1000;
  const maxOrders = 40;

  const entry = orderRateBuckets.get(ip);
  if (!entry || entry.resetAt <= now) {
    orderRateBuckets.set(ip, { count: 1, resetAt: now + windowMs });
    next();
    return;
  }
  if (entry.count >= maxOrders) {
    res.status(429).json({
      error: 'تعداد سفارش‌های ارسالی بیش از حد مجاز است. لطفاً دقایقی دیگر تلاش کنید.',
    });
    return;
  }
  entry.count += 1;
  next();
}

function rateLimitAiEndpoint(maxRequests: number, errMsg: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${req.path}:${ip}`;
    const now = Date.now();
    pruneBucketMap(aiRateBuckets, now);
    const windowMs = 10 * 60 * 1000;

    const entry = aiRateBuckets.get(key);
    if (!entry || entry.resetAt <= now) {
      aiRateBuckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }
    if (entry.count >= maxRequests) {
      res.status(429).json({ error: errMsg });
      return;
    }
    entry.count += 1;
    next();
  };
}

const rateLimitAiTranslation = rateLimitAiEndpoint(
  20,
  'تعداد درخواست‌های ترجمه بیش از حد مجاز است. لطفاً دقایقی دیگر تلاش کنید.',
);

const rateLimitNarration = rateLimitAiEndpoint(
  60,
  'تعداد درخواست‌های پخش صوت بیش از حد مجاز است. لطفاً دقایقی دیگر تلاش کنید.',
);

function rateLimitQrScan(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  pruneBucketMap(qrScanRateBuckets, now);
  const windowMs = 10 * 60 * 1000;
  const maxScans = 80;

  const entry = qrScanRateBuckets.get(ip);
  if (!entry || entry.resetAt <= now) {
    qrScanRateBuckets.set(ip, { count: 1, resetAt: now + windowMs });
    next();
    return;
  }
  if (entry.count >= maxScans) {
    res.status(429).json({ error: 'تعداد ثبت اسکن بیش از حد مجاز است.' });
    return;
  }
  entry.count += 1;
  next();
}

function rateLimitLiveTray(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  pruneBucketMap(traySyncRateBuckets, now);
  const windowMs = 10 * 60 * 1000;
  const maxSyncs = 240;

  const entry = traySyncRateBuckets.get(ip);
  if (!entry || entry.resetAt <= now) {
    traySyncRateBuckets.set(ip, { count: 1, resetAt: now + windowMs });
    next();
    return;
  }
  if (entry.count >= maxSyncs) {
    res.status(429).json({ error: 'تعداد همگام‌سازی سینی بیش از حد مجاز است.' });
    return;
  }
  entry.count += 1;
  next();
}

function applySecurityHeaders(req: Request, res: Response, next: NextFunction): void {
  const isProd = process.env.NODE_ENV === 'production';

  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('Origin-Agent-Cluster', '?1');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Permissions-Policy',
    'camera=(self), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  );
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  const scriptSrc = isProd ? "'self'" : "'self' 'unsafe-inline'";
  const connectSrc = isProd ? "'self'" : "'self' ws: wss:";
  const csp = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    `connect-src ${connectSrc}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self' https://aistudio.google.com https://*.google.com https://*.googleusercontent.com https://*.run.app",
  ].join('; ');

  res.setHeader('Content-Security-Policy', csp);

  if (
    req.path.startsWith('/api/admin') ||
    req.path.startsWith('/api/owner') ||
    req.path.startsWith('/api/orders') ||
    req.path === '/api/upload'
  ) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
  }

  next();
}

export async function createApp(): Promise<Express> {
  if (USE_NEON) {
    await syncRemoteStorage();
  } else {
    ensureStorage();
  }
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(applySecurityHeaders);
  app.use(express.json({ limit: '8mb' }));

  if (USE_NEON) {
    app.use('/api', async (_req, res, next) => {
      try {
        await syncRemoteStorage();
        const origJson = res.json.bind(res);
        res.json = ((body?: unknown) => {
          const pending = pendingRemoteSave;
          if (!pending) {
            return origJson(body);
          }
          pendingRemoteSave = null;
          pending
            .then(() => {
              origJson(body);
            })
            .catch((err) => {
              console.error('Failed to commit transaction to Neon:', err);
              if (!res.headersSent) {
                res.status(500);
                origJson({ error: 'خطا در ذخیره اطلاعات روی دیتابیس. لطفاً دوباره تلاش کنید.' });
              }
            });
          return res;
        }) as Response['json'];
        next();
      } catch (err) {
        next(err);
      }
    });
  }

  app.get(['/uploads/:filename', '/api/uploads/:filename'], async (req, res, next) => {
    const filename = req.params.filename;
    if (!filename || !/^[a-zA-Z0-9._-]+$/.test(filename)) {
      res.status(400).end();
      return;
    }
    if (!USE_NEON) {
      next();
      return;
    }
    try {
      await ensureNeonSchema();
      const pool = getPgPool();
      const row = await pool.query<{ mime_type: string; data_base64: string }>(
        `SELECT mime_type, data_base64 FROM uploaded_assets WHERE filename = $1 LIMIT 1`,
        [filename],
      );
      if (!row.rows[0]) {
        res.status(404).end();
        return;
      }
      const imgBuffer = Buffer.from(row.rows[0].data_base64, 'base64');
      res.setHeader('Content-Type', row.rows[0].mime_type);
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.send(imgBuffer);
    } catch (err) {
      next(err);
    }
  });

  app.use(
    '/uploads',
    express.static(UPLOAD_DIR, {
      dotfiles: 'ignore',
      index: false,
      maxAge: '7d',
      setHeaders: (res) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Content-Disposition', 'inline');
      },
    }),
  );

  // Public list of approved cafes (for navigation/discovery)
  app.get('/api/cafes/public', (_req, res) => {
    const store = ensureStorage();
    const list = store.cafes
      .filter((c) => c.status === 'approved')
      .map((c) => ({
        slug: c.slug,
        nameFa: c.settings.nameFa,
        nameEn: c.settings.nameEn,
      }));
    res.json({ cafes: list });
  });

  // Public registration for a new cafe buying the app (starts in pending status for Owner approval)
  app.post('/api/cafes/register', rateLimitAuth, (req, res) => {
    const store = ensureStorage();
    const pendingCount = store.cafes.filter((c) => c.status === 'pending').length;
    if (pendingCount >= 100 || store.cafes.length >= 500) {
      res.status(429).json({
        error: 'ظرفیت صف ثبت‌نام موقتاً تکمیل است. لطفاً با پشتیبانی تماس بگیرید.',
      });
      return;
    }
    const {
      nameFa,
      nameEn,
      slug,
      ownerName,
      ownerPhone,
      passcode,
      tableCount,
    } = req.body as {
      nameFa?: string;
      nameEn?: string;
      slug?: string;
      ownerName?: string;
      ownerPhone?: string;
      passcode?: string;
      tableCount?: number;
    };

    const safeNameFa = sanitizeContentText(nameFa, 80);
    if (!safeNameFa) {
      res.status(400).json({ error: 'نام فارسی کافی‌شاپ الزامی است.' });
      return;
    }
    const cleanSlug = normalizeSlug(slug || nameEn || `cafe-${Date.now().toString(36)}`);
    if (!cleanSlug || cleanSlug.length < 3) {
      res.status(400).json({ error: 'شناسه انگلیسی لینک (حداقل ۳ کاراکتر) را وارد کنید.' });
      return;
    }
    if (store.cafes.some((c) => c.slug === cleanSlug)) {
      res.status(409).json({ error: 'این شناسه قبلاً ثبت شده است. شناسه دیگری انتخاب کنید.' });
      return;
    }
    const safeOwnerName = sanitizeContentText(ownerName, 80);
    const safeOwnerPhone = sanitizeContentText(ownerPhone, 30);
    if (!safeOwnerName || !safeOwnerPhone) {
      res.status(400).json({ error: 'نام مدیر و شماره تماس الزامی است.' });
      return;
    }
    if (!passcode || typeof passcode !== 'string' || passcode.trim().length < 4 || passcode.trim().length > 128) {
      res.status(400).json({ error: 'رمز عبور پنل مدیریت باید بین ۴ تا ۱۲۸ کاراکتر باشد.' });
      return;
    }

    const now = new Date().toISOString();
    const tablesCount = clampInt(tableCount, 1, 200, 12);
    const newCafe: CafeTenant = {
      id: `cafe-${Date.now().toString(36)}-${crypto.randomBytes(2).toString('hex')}`,
      slug: cleanSlug,
      status: 'pending',
      allowContentCustomization: false,
      tokenVersion: 1,
      ownerName: safeOwnerName,
      ownerPhone: safeOwnerPhone,
      adminPasscodeHash: hashPasscode(passcode.trim()),
      createdAt: now,
      settings: {
        nameFa: safeNameFa,
        nameEn: sanitizeContentText(nameEn, 80) || cleanSlug.toUpperCase(),
        taglineFa: 'تجربه سفارش سه‌بعدی و سریع بر سر میز با منوی دیجیتال اختصاصی',
        addressFa: 'نشانی کافه در تنظیمات مدیریت قابل ویرایش است',
        hoursFa: 'همه‌روزه ۹:۰۰ تا ۲۳:۳۰',
        currencyLabel: 'تومان',
        tableCount: tablesCount,
        serviceChargePercent: 10,
      },
      contentOverrides: {},
      categories: createDefaultCategories(),
      items: createStarterItems(now),
      tables: createInitialTables(tablesCount, false),
      orders: [],
    };

    store.cafes.push(newCafe);
    saveStore(store);
    res.status(201).json({
      cafe: toCafeSummary(newCafe),
      message: 'درخواست کافی‌شاپ شما ثبت شد و پس از تأیید مالک پلتفرم فعال خواهد شد.',
    });
  });

  // Public Menu by ?cafe=slug
  app.get('/api/menu', (req, res) => {
    const store = ensureStorage();
    const cafe = resolveCafeFromRequest(store, req.query.cafe);
    if (!cafe) {
      res.status(404).json({ error: 'کافی‌شاپ مورد نظر یافت نشد.' });
      return;
    }
    res.json(toPublicMenu(cafe));
  });

  // Public Server-Side Gemini AI Translation of Cafe Menu (Persian -> English with content-hash caching)
  app.post('/api/menu/translate', rateLimitAiTranslation, async (req, res) => {
    const store = ensureStorage();
    const { cafeSlug } = req.body as { cafeSlug?: string };
    const cafe = resolveCafeFromRequest(store, cafeSlug);
    if (!cafe || cafe.status !== 'approved') {
      res.status(404).json({ error: 'کافی‌شاپ مورد نظر یافت نشد.' });
      return;
    }

    const overridesPayload = Object.fromEntries(
      Object.entries(cafe.contentOverrides ?? {}).filter(
        ([k, v]) => typeof v === 'string' && v.trim().length > 0 && !k.endsWith('ImageUrl') && k !== 'brandLogoUrl',
      ),
    );

    const sourcePayload = {
      settings: {
        nameFa: cafe.settings.nameFa,
        nameEn: cafe.settings.nameEn,
        taglineFa: cafe.settings.taglineFa,
        addressFa: cafe.settings.addressFa,
        hoursFa: cafe.settings.hoursFa,
        currencyLabel: cafe.settings.currencyLabel,
      },
      categories: cafe.categories.map((c) => ({
        id: c.id,
        nameFa: c.nameFa,
        nameEn: c.nameEn,
      })),
      items: cafe.items.map((i) => ({
        id: i.id,
        nameFa: i.nameFa,
        nameEn: i.nameEn,
        descriptionFa: i.descriptionFa,
        ingredientsFa: i.ingredientsFa,
      })),
      contentOverrides: overridesPayload,
    };

    const signature = crypto
      .createHash('sha256')
      .update(JSON.stringify(sourcePayload))
      .digest('hex')
      .slice(0, 16);

    const cached = menuTranslationCache.get(cafe.id);
    if (cached && cached.signature === signature) {
      res.json({ translation: cached, cached: true });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: 'سرویس ترجمه در حال حاضر فعال نیست. لطفاً کلید GEMINI_API_KEY را بررسی کنید.',
      });
      return;
    }

    try {
      const overrideKeys = Object.keys(overridesPayload);
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: JSON.stringify(sourcePayload),
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction:
            'You are a bilingual culinary menu translator specializing in Persian specialty cafes and fine dining. Translate all Persian menu strings into natural, concise, appetizing English. Preserve exact item IDs and category IDs. Keep existing English names if already provided and accurate, otherwise translate them naturally. For currencyLabel (e.g. تومان), translate to "Toman" or "IRR". Translate every key present in contentOverrides and return matching key/value pairs in translatedOverrides.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              settings: {
                type: Type.OBJECT,
                properties: {
                  nameEn: { type: Type.STRING },
                  taglineEn: { type: Type.STRING },
                  addressEn: { type: Type.STRING },
                  hoursEn: { type: Type.STRING },
                  currencyLabelEn: { type: Type.STRING },
                },
                required: ['nameEn', 'taglineEn', 'addressEn', 'hoursEn', 'currencyLabelEn'],
              },
              categories: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    nameEn: { type: Type.STRING },
                  },
                  required: ['id', 'nameEn'],
                },
              },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    nameEn: { type: Type.STRING },
                    descriptionEn: { type: Type.STRING },
                    ingredientsEn: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                  },
                  required: ['id', 'nameEn', 'descriptionEn', 'ingredientsEn'],
                },
              },
              translatedOverrides: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    key: { type: Type.STRING },
                    value: { type: Type.STRING },
                  },
                  required: ['key', 'value'],
                },
              },
            },
            required: ['settings', 'categories', 'items'],
          },
        },
      });

      const rawText = (response.text ?? '').trim();
      const parsed = JSON.parse(rawText) as {
        settings: CachedMenuTranslation['settings'];
        categories: CachedMenuTranslation['categories'];
        items: CachedMenuTranslation['items'];
        translatedOverrides?: Array<{ key: string; value: string }>;
      };

      const contentOverridesMap: Record<string, string> = {};
      if (Array.isArray(parsed.translatedOverrides)) {
        for (const entry of parsed.translatedOverrides) {
          if (overrideKeys.includes(entry.key) && typeof entry.value === 'string' && entry.value.trim()) {
            contentOverridesMap[entry.key] = entry.value.trim();
          }
        }
      }

      const finalTranslation: CachedMenuTranslation = {
        signature,
        settings: parsed.settings,
        categories: parsed.categories,
        items: parsed.items,
        contentOverrides: contentOverridesMap,
      };

      menuTranslationCache.set(cafe.id, finalTranslation);
      res.json({ translation: finalTranslation, cached: false });
    } catch (err) {
      console.error('Gemini translation error:', err);
      res.status(502).json({
        error: 'خطا در ترجمه هوشمند منو. لطفاً چند لحظه بعد دوباره تلاش کنید.',
      });
    }
  });

  // Public Server-Side Gemini TTS Coffee Story Narrator (WAV cached cleanly per chapter & language)
  const NARRATION_CACHE_DIR = path.join(DATA_DIR, 'narration-cache');
  const narrationAudioCache = new Map<string, Buffer>();
  const narrationInFlight = new Map<string, Promise<Buffer>>();

  const STORY_NARRATION_SCRIPTS: Record<
    string,
    { fa: string; en: string }
  > = {
    harvest: {
      fa: 'سفر هر فنجان قهوه، پیش از بیدار شدن شهر آغاز می‌شود. در ارتفاعات مه‌آلود کوهستان، با نخستین پرتوهای طلایی سپیده‌دم، گیلاس‌های یاقوتی قهوه در اوج شیرینی و طراوت با دستانی آرام و دقیق چیده می‌شوند.',
      en: 'Every great cup begins long before the city wakes. High upon mist-veiled mountain terraces, golden sunrise touches gleaming ruby coffee cherries—hand-picked at the exact crest of ripeness.',
    },
    drying: {
      fa: 'پس از شست‌وشو با آب زلال چشمه‌ها، دانه‌های سبز روی تخت‌های چوب سدر در برابر نور ملایم خورشید آرام می‌گیرند. باد گرم کوهستان، طعم عسل و میوه‌های تابستانی را در قلب هر دانه ماندگار می‌کند.',
      en: 'Washed in cold mountain springs, the green seeds rest beneath warm afternoon sunbeams on raised cedar beds. As gentle wind moves across them, wild honey and stone-fruit sweetness lock deep inside.',
    },
    roasting: {
      fa: 'اینجا کارگاه کیمیاگری آتش است. درون درام مسی داغ، حرارت دقیق، دانه‌های خام را دگرگون می‌کند؛ صدای نخستین ترک برشته‌کاری که برمی‌خیزد، رایحه کارامل، فندق برشته و شکلات تلخ فضا را پر می‌کند.',
      en: 'Inside the roastery, copper meets flame. Within the glowing drum, tumbling beans awaken—and as first crack echoes through wisps of warm smoke, notes of dark cocoa, toasted hazelnut, and amber caramel come alive.',
    },
    grinding: {
      fa: 'چند ثانیه پیش از دم‌آوری، تیغه‌های دقیق، دانه‌های برشته را به مخملی معطر تبدیل می‌کنند. سبد برنجی پرتافیلتر لبریز می‌شود و فشار متوازن تمپر، بستر را برای عصاره‌گیری بی‌نقص آماده می‌سازد.',
      en: 'Moments before extraction, precision burrs mill roasted beans into fragrant velvet. Fresh grounds cascade into warm brass, leveled calmly by dark walnut for an effortless, balanced pour.',
    },
    brewing: {
      fa: 'سرانجام، تمام این سفر هزار کیلومتری در آرامش یک لحظه جمع می‌شود. قطره‌های غلیظ و ببری‌رنگ اسپرسو در فنجان سفالی می‌نشینند؛ بخاری گرم و عطرآگین برمی‌خیزد و فنجانی که منتظر شماست کامل می‌شود.',
      en: 'At last, a thousand-mile journey settles into stillness. Tiger-striped golden crema streams into warm handcrafted ceramic, rising mist catches the morning sun, and your cup awaits.',
    },
  };

  app.get('/api/story/narration', rateLimitNarration, async (req, res) => {
    const chapter = typeof req.query.chapter === 'string' ? req.query.chapter.trim() : '';
    const lang = req.query.lang === 'en' ? 'en' : 'fa';

    const scriptEntry = STORY_NARRATION_SCRIPTS[chapter];
    if (!scriptEntry) {
      res.status(400).json({ error: 'فصل داستان معتبر نیست.' });
      return;
    }

    const cacheKey = `${chapter}-${lang}`;
    const memoryHit = narrationAudioCache.get(cacheKey);
    if (memoryHit) {
      res.setHeader('Content-Type', 'audio/wav');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(memoryHit);
      return;
    }

    const diskPath = path.join(NARRATION_CACHE_DIR, `${cacheKey}.wav`);
    if (USE_NEON) {
      try {
        await ensureNeonSchema();
        const pool = getPgPool();
        const dbRow = await pool.query<{ wav_base64: string }>(
          `SELECT wav_base64 FROM narration_cache WHERE cache_key = $1 LIMIT 1`,
          [cacheKey],
        );
        if (dbRow.rows[0]?.wav_base64) {
          const dbBuf = Buffer.from(dbRow.rows[0].wav_base64, 'base64');
          if (dbBuf.length > 44) {
            narrationAudioCache.set(cacheKey, dbBuf);
            res.setHeader('Content-Type', 'audio/wav');
            res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
            res.send(dbBuf);
            return;
          }
        }
      } catch {
        // Proceed to regenerate if DB cache read fails
      }
    } else if (fs.existsSync(diskPath)) {
      try {
        const diskBuf = fs.readFileSync(diskPath);
        if (diskBuf.length > 44) {
          narrationAudioCache.set(cacheKey, diskBuf);
          res.setHeader('Content-Type', 'audio/wav');
          res.setHeader('Cache-Control', 'public, max-age=86400');
          res.send(diskBuf);
          return;
        }
      } catch {
        // Proceed to regenerate if unreadable
      }
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: 'سرویس صوتی راوی داستان در حال حاضر فعال نیست.',
      });
      return;
    }

    try {
      let pending = narrationInFlight.get(cacheKey);
      if (!pending) {
        pending = (async () => {
          const textToSpeak = scriptEntry[lang];
          const styleHint =
            lang === 'fa'
              ? 'Warm, rich Persian cinematic documentary narrator; calm, unhurried, poetic luxury storytelling voice.'
              : 'Warm, rich English cinematic documentary narrator; calm, unhurried, poetic luxury storytelling voice.';

          const ttsResponse = await ai.models.generateContent({
            model: 'gemini-3.8-flash-lite-tts',
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: textToSpeak,
                    speechMetadata: {
                      style: styleHint,
                    },
                  },
                ],
              },
            ],
            config: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: 'Charon' },
                },
              },
            },
          });

          const base64Audio =
            ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
          if (!base64Audio) {
            throw new Error('Empty audio payload from Gemini TTS');
          }

          const wavBuffer = Buffer.from(base64Audio, 'base64');
          if (USE_NEON) {
            try {
              await ensureNeonSchema();
              const pool = getPgPool();
              await pool.query(
                `INSERT INTO narration_cache (cache_key, wav_base64)
                 VALUES ($1, $2)
                 ON CONFLICT (cache_key) DO UPDATE SET wav_base64 = EXCLUDED.wav_base64`,
                [cacheKey, base64Audio],
              );
            } catch {
              // Non-fatal DB cache failure
            }
          } else {
            try {
              if (!fs.existsSync(NARRATION_CACHE_DIR)) {
                fs.mkdirSync(NARRATION_CACHE_DIR, { recursive: true });
              }
              fs.writeFileSync(diskPath, wavBuffer);
            } catch {
              // Non-fatal disk cache failure
            }
          }
          narrationAudioCache.set(cacheKey, wavBuffer);
          return wavBuffer;
        })().finally(() => {
          narrationInFlight.delete(cacheKey);
        });

        narrationInFlight.set(cacheKey, pending);
      }

      const wavBuffer = await pending;
      res.setHeader('Content-Type', 'audio/wav');
      res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
      res.send(wavBuffer);
    } catch (err) {
      console.error('Gemini TTS narrator error:', err);
      res.status(502).json({
        error: 'خطا در تولید صدای راوی داستان. لطفاً دوباره امتحان کنید.',
      });
    }
  });

  // Public Customer Order Submission (Authoritative server-side price & total calculation)
  app.post('/api/orders', rateLimitPublicOrders, (req, res) => {
    const store = ensureStorage();
    const { cafeSlug, tableNumber, customerNote, items, sessionId } = req.body as {
      cafeSlug?: string;
      tableNumber?: number | null;
      customerNote?: string;
      sessionId?: string;
      items?: Array<{ itemId?: string; quantity?: number; note?: string }>;
    };

    const cafe = resolveCafeFromRequest(store, cafeSlug);
    if (!cafe || cafe.status !== 'approved') {
      res.status(404).json({ error: 'کافی‌شاپ فعال یافت نشد.' });
      return;
    }

    if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
      res.status(400).json({ error: 'سبد سفارش معتبر نیست.' });
      return;
    }

    const verifiedItems: CustomerOrderItem[] = [];
    for (const entry of items) {
      if (!entry?.itemId || typeof entry.itemId !== 'string') continue;
      const menuItem = cafe.items.find((i) => i.id === entry.itemId);
      if (!menuItem || !menuItem.isAvailable) {
        res.status(400).json({
          error: `آیتم «${menuItem?.nameFa || 'انتخابی'}» در حال حاضر قابل سفارش نیست.`,
        });
        return;
      }
      const qty = Math.max(1, Math.min(50, Math.floor(Number(entry.quantity) || 1)));
      verifiedItems.push({
        itemId: menuItem.id,
        nameFa: menuItem.nameFa,
        unitPrice: menuItem.price,
        quantity: qty,
        note: typeof entry.note === 'string' && entry.note.trim() ? entry.note.trim().slice(0, 160) : undefined,
      });
    }

    if (verifiedItems.length === 0) {
      res.status(400).json({ error: 'آیتم معتبری در سفارش یافت نشد.' });
      return;
    }

    const parsedTable =
      tableNumber !== null && tableNumber !== undefined && Number.isInteger(Number(tableNumber))
        ? Math.max(1, Math.min(cafe.settings.tableCount, Number(tableNumber)))
        : null;

    const subtotal = verifiedItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    const serviceFee = Math.round((subtotal * cafe.settings.serviceChargePercent) / 100);
    const total = subtotal + serviceFee;
    const now = new Date().toISOString();
    const orders = cafe.orders ?? [];
    const maxOrderNum = orders.reduce((max, o) => {
      const parsed = Number.parseInt(String(o.orderNumber).replace(/\D/g, ''), 10);
      return Number.isFinite(parsed) && parsed > max ? parsed : max;
    }, 100);
    const nextNum = maxOrderNum + 1;

    const newOrder: CustomerOrder = {
      id: `ord-${Date.now().toString(36)}-${crypto.randomBytes(8).toString('hex')}`,
      orderNumber: `ORD-${nextNum}`,
      tableNumber: parsedTable,
      customerNote:
        typeof customerNote === 'string' && customerNote.trim()
          ? customerNote.trim().slice(0, 200)
          : undefined,
      items: verifiedItems,
      subtotal,
      serviceFee,
      total,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    cafe.orders = [newOrder, ...orders].slice(0, 2000);
    if (typeof sessionId === 'string' && sessionId.trim()) {
      const cleanSid = sessionId.trim().slice(0, 64);
      cafe.liveTrays = pruneLiveTrays(cafe).filter((t) => t.sessionId !== cleanSid);
    }
    saveStore(store);
    res.status(201).json({ order: newOrder });
  });

  // Public Customer Live Order Status Lookup
  app.get('/api/orders/:id', rateLimitPublicOrders, (req, res) => {
    const store = ensureStorage();
    const cafe = resolveCafeFromRequest(store, req.query.cafe);
    if (!cafe || cafe.status !== 'approved') {
      res.status(404).json({ error: 'کافی‌شاپ یافت نشد.' });
      return;
    }
    const order = (cafe.orders ?? []).find((o) => o.id === req.params.id);
    if (!order) {
      res.status(404).json({ error: 'سفارش یافت نشد.' });
      return;
    }
    res.json({
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        tableNumber: order.tableNumber,
        total: order.total,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      },
    });
  });

  // Cafe Admin Auth Verification (strictly scoped to cafeId + tokenVersion)
  app.get('/api/admin/verify', (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const payload = verifyTokenPayload(token);
    if (!payload || payload.role !== 'cafe_admin' || typeof payload.cafeId !== 'string') {
      res.json({ authenticated: false });
      return;
    }
    const store = ensureStorage();
    const cafe = store.cafes.find((c) => c.id === payload.cafeId);
    if (!cafe || cafe.status !== 'approved' || payload.tv !== (cafe.tokenVersion ?? 1)) {
      res.json({ authenticated: false });
      return;
    }
    res.json({
      authenticated: true,
      cafeId: cafe.id,
      cafeSlug: cafe.slug,
      cafeStatus: cafe.status,
      menu: toAdminMenu(cafe),
    });
  });

  // Cafe Admin Login (isolated per cafeSlug)
  app.post('/api/admin/login', rateLimitAuth, (req, res) => {
    const { passcode, cafeSlug } = req.body as { passcode?: string; cafeSlug?: string };
    if (!passcode || typeof passcode !== 'string' || passcode.trim().length < 1 || passcode.trim().length > 128) {
      res.status(400).json({ error: 'لطفاً رمز عبور معتبر مدیریت را وارد کنید.' });
      return;
    }
    const store = ensureStorage();
    const cafe = resolveCafeFromRequest(store, cafeSlug);
    if (!cafe) {
      res.status(404).json({ error: 'کافی‌شاپ مورد نظر یافت نشد.' });
      return;
    }
    if (cafe.status === 'pending') {
      res.status(403).json({
        error: 'ثبت‌نام این کافی‌شاپ هنوز در انتظار تأیید مالک پلتفرم است.',
      });
      return;
    }
    if (cafe.status === 'suspended') {
      res.status(403).json({
        error: 'پنل این کافی‌شاپ توسط مالک پلتفرم غیرفعال شده است.',
      });
      return;
    }
    const check = verifyPasscode(passcode.trim(), cafe.adminPasscodeHash);
    if (!check.valid) {
      res.status(401).json({ error: 'رمز عبور مدیریت این کافی‌شاپ نادرست است.' });
      return;
    }
    if (check.needsUpgrade) {
      cafe.adminPasscodeHash = hashPasscode(passcode.trim());
      saveStore(store);
    }

    const token = signToken({
      role: 'cafe_admin',
      cafeId: cafe.id,
      cafeSlug: cafe.slug,
      tv: cafe.tokenVersion ?? 1,
      exp: Date.now() + 1000 * 60 * 60 * 24,
    });
    res.json({ token, cafeId: cafe.id, cafeSlug: cafe.slug, menu: toAdminMenu(cafe) });
  });

  // Cafe Admin: Update Own Settings (strictly uses req.adminCafeId)
  app.put('/api/menu/settings', requireAdmin, (req: AuthenticatedRequest, res) => {
    const store = ensureStorage();
    const cafe = store.cafes.find((c) => c.id === req.adminCafeId);
    if (!cafe) {
      res.status(404).json({ error: 'کافی‌شاپ یافت نشد.' });
      return;
    }

    const { settings, newPasscode } = req.body as {
      settings?: Partial<RestaurantSettings>;
      newPasscode?: string;
    };

    if (settings) {
      const nextTableCount = clampInt(settings.tableCount, 1, 200, cafe.settings.tableCount);
      const nextServiceCharge = clampInt(
        settings.serviceChargePercent,
        0,
        30,
        cafe.settings.serviceChargePercent,
      );
      cafe.settings = {
        ...cafe.settings,
        nameFa: sanitizeContentText(settings.nameFa, 80) || cafe.settings.nameFa,
        nameEn: sanitizeContentText(settings.nameEn, 80) || cafe.settings.nameEn,
        taglineFa:
          settings.taglineFa !== undefined
            ? sanitizeContentText(settings.taglineFa, 220) ?? ''
            : cafe.settings.taglineFa,
        addressFa:
          settings.addressFa !== undefined
            ? sanitizeContentText(settings.addressFa, 220) ?? ''
            : cafe.settings.addressFa,
        hoursFa:
          settings.hoursFa !== undefined
            ? sanitizeContentText(settings.hoursFa, 120) ?? ''
            : cafe.settings.hoursFa,
        currencyLabel: sanitizeContentText(settings.currencyLabel, 24) || cafe.settings.currencyLabel || 'تومان',
        tableCount: nextTableCount,
        serviceChargePercent: nextServiceCharge,
        fontFa:
          typeof settings.fontFa === 'string' && ALLOWED_FONT_FA.has(settings.fontFa.trim())
            ? settings.fontFa.trim()
            : cafe.settings.fontFa ?? 'vazirmatn',
        fontEn:
          typeof settings.fontEn === 'string' && ALLOWED_FONT_EN.has(settings.fontEn.trim())
            ? settings.fontEn.trim()
            : cafe.settings.fontEn ?? 'cormorant',
        metaTitle:
          settings.metaTitle !== undefined
            ? sanitizeContentText(settings.metaTitle, 110)
            : cafe.settings.metaTitle,
        metaDescription:
          settings.metaDescription !== undefined
            ? sanitizeContentText(settings.metaDescription, 260)
            : cafe.settings.metaDescription,
        defaultMenuLayout:
          settings.defaultMenuLayout === 'list' || settings.defaultMenuLayout === 'grid'
            ? settings.defaultMenuLayout
            : cafe.settings.defaultMenuLayout ?? 'grid',
        showPrepTime:
          typeof settings.showPrepTime === 'boolean'
            ? settings.showPrepTime
            : cafe.settings.showPrepTime ?? true,
        showCalories:
          typeof settings.showCalories === 'boolean'
            ? settings.showCalories
            : cafe.settings.showCalories ?? true,
      };
      cafe.tables = syncTables(cafe.tables, nextTableCount);
    }

    let refreshedToken: string | undefined;
    if (newPasscode && newPasscode.trim().length >= 4 && newPasscode.trim().length <= 128) {
      cafe.adminPasscodeHash = hashPasscode(newPasscode.trim());
      cafe.tokenVersion = (cafe.tokenVersion ?? 1) + 1;
      refreshedToken = signToken({
        role: 'cafe_admin',
        cafeId: cafe.id,
        cafeSlug: cafe.slug,
        tv: cafe.tokenVersion,
        exp: Date.now() + 1000 * 60 * 60 * 24,
      });
    }

    menuTranslationCache.delete(cafe.id);
    saveStore(store);
    res.json({ ...toAdminMenu(cafe), ...(refreshedToken ? { refreshedToken } : {}) });
  });

  // Cafe Admin: Customize ALL Parts of Menu (always available to shop owners; landing fields gated by owner permission)
  app.put('/api/menu/customization', requireAdmin, (req: AuthenticatedRequest, res) => {
    const store = ensureStorage();
    const cafe = store.cafes.find((c) => c.id === req.adminCafeId);
    if (!cafe) {
      res.status(404).json({ error: 'کافی‌شاپ یافت نشد.' });
      return;
    }

    const body = req.body as {
      contentOverrides?: AppContentOverrides;
      menuDisplaySettings?: {
        defaultMenuLayout?: 'grid' | 'list';
        showPrepTime?: boolean;
        showCalories?: boolean;
      };
      reset?: boolean;
      resetScope?: 'menu' | 'all';
    };

    if (body.reset) {
      if (body.resetScope === 'all' && cafe.allowContentCustomization) {
        cafe.contentOverrides = {};
      } else {
        const curr = cafe.contentOverrides ?? {};
        cafe.contentOverrides = {
          ...curr,
          menuBannerImageUrl: undefined,
          headerShareLabel: undefined,
          headerTrayLabel: undefined,
          searchPlaceholderFa: undefined,
          heroFilterSignatureLabelFa: undefined,
          popularEyebrowEn: undefined,
          popularTitleFa: undefined,
          popularActionFa: undefined,
          catalogEyebrowEn: undefined,
          catalogTitleFa: undefined,
          catalogAllChaptersFa: undefined,
          menuGridViewLabelFa: undefined,
          menuListViewLabelFa: undefined,
          emptySearchTitleFa: undefined,
        };
      }
      menuTranslationCache.delete(cafe.id);
      saveStore(store);
      res.json(toAdminMenu(cafe));
      return;
    }

    const incoming = body.contentOverrides ?? {};
    let nextOverrides = sanitizeMenuCustomizationFields(incoming, cafe.contentOverrides ?? {});
    if (cafe.allowContentCustomization) {
      nextOverrides = sanitizeLandingCustomizationFields(incoming, nextOverrides);
    }

    if (body.menuDisplaySettings) {
      const disp = body.menuDisplaySettings;
      cafe.settings = {
        ...cafe.settings,
        defaultMenuLayout:
          disp.defaultMenuLayout === 'list' || disp.defaultMenuLayout === 'grid'
            ? disp.defaultMenuLayout
            : cafe.settings.defaultMenuLayout ?? 'grid',
        showPrepTime:
          typeof disp.showPrepTime === 'boolean'
            ? disp.showPrepTime
            : cafe.settings.showPrepTime ?? true,
        showCalories:
          typeof disp.showCalories === 'boolean'
            ? disp.showCalories
            : cafe.settings.showCalories ?? true,
      };
    }

    cafe.contentOverrides = nextOverrides;
    menuTranslationCache.delete(cafe.id);
    saveStore(store);
    res.json(toAdminMenu(cafe));
  });

  // Cafe Admin: Visual Table Occupancy Dashboard Update
  app.put('/api/tables/:number', requireAdmin, (req: AuthenticatedRequest, res) => {
    const store = ensureStorage();
    const cafe = store.cafes.find((c) => c.id === req.adminCafeId);
    if (!cafe) {
      res.status(404).json({ error: 'کافی‌شاپ یافت نشد.' });
      return;
    }

    const tableNum = clampInt(req.params.number, 1, 200, -1);
    cafe.tables = syncTables(cafe.tables, cafe.settings.tableCount);
    const idx = cafe.tables.findIndex((t) => t.number === tableNum);
    if (idx === -1) {
      res.status(404).json({ error: 'میز مورد نظر یافت نشد.' });
      return;
    }

    const body = req.body as Partial<TableInfo>;
    const allowedStatuses: TableStatus[] = ['available', 'occupied', 'reserved', 'cleaning'];
    const nextStatus =
      body.status && allowedStatuses.includes(body.status) ? body.status : cafe.tables[idx].status;

    const nextCapacity =
      body.capacity !== undefined
        ? clampInt(body.capacity, 1, 24, cafe.tables[idx].capacity)
        : cafe.tables[idx].capacity;

    let nextGuests =
      body.guestsCount !== undefined
        ? clampInt(body.guestsCount, 0, 24, cafe.tables[idx].guestsCount)
        : cafe.tables[idx].guestsCount;

    if (nextStatus === 'available' || nextStatus === 'cleaning') {
      nextGuests = body.guestsCount !== undefined ? nextGuests : 0;
    }

    cafe.tables[idx] = {
      ...cafe.tables[idx],
      label:
        body.label !== undefined
          ? sanitizeContentText(body.label, 40) || `میز ${tableNum}`
          : cafe.tables[idx].label,
      capacity: nextCapacity,
      status: nextStatus,
      guestsCount: nextGuests,
      note:
        body.note !== undefined
          ? sanitizeContentText(body.note, 200) ?? ''
          : nextStatus === 'available'
            ? ''
            : cafe.tables[idx].note,
      updatedAt: new Date().toISOString(),
    };

    saveStore(store);
    res.json(toAdminMenu(cafe));
  });

  app.post('/api/tables/reset', requireAdmin, (req: AuthenticatedRequest, res) => {
    const store = ensureStorage();
    const cafe = store.cafes.find((c) => c.id === req.adminCafeId);
    if (!cafe) {
      res.status(404).json({ error: 'کافی‌شاپ یافت نشد.' });
      return;
    }
    const now = new Date().toISOString();
    cafe.tables = syncTables(cafe.tables, cafe.settings.tableCount).map((t) => ({
      ...t,
      status: 'available',
      guestsCount: 0,
      note: '',
      updatedAt: now,
    }));
    saveStore(store);
    res.json(toAdminMenu(cafe));
  });

  // Public QR Table Scan Tracker (Persistent per table in Neon / JSON store)
  app.post('/api/qr/scan', rateLimitQrScan, (req, res) => {
    const store = ensureStorage();
    const { cafeSlug, tableNumber } = req.body as {
      cafeSlug?: string;
      tableNumber?: number | null;
    };
    const cafe = resolveCafeFromRequest(store, cafeSlug);
    if (!cafe || cafe.status !== 'approved') {
      res.status(404).json({ error: 'کافی‌شاپ فعال یافت نشد.' });
      return;
    }

    const parsedTable = Number(tableNumber);
    const now = new Date().toISOString();

    if (!Number.isInteger(parsedTable) || parsedTable <= 0) {
      cafe.generalQrScans = (cafe.generalQrScans ?? 0) + 1;
      saveStore(store);
      res.json({ ok: true, tableNumber: 0, qrScans: cafe.generalQrScans });
      return;
    }

    if (parsedTable > cafe.settings.tableCount) {
      res.status(400).json({ error: 'شماره میز معتبر نیست.' });
      return;
    }

    cafe.tables = syncTables(cafe.tables, cafe.settings.tableCount);
    const table = cafe.tables.find((t) => t.number === parsedTable);
    if (!table) {
      res.status(404).json({ error: 'میز یافت نشد.' });
      return;
    }

    table.qrScans = (table.qrScans ?? 0) + 1;
    table.lastScannedAt = now;
    saveStore(store);
    res.json({ ok: true, tableNumber: parsedTable, qrScans: table.qrScans });
  });

  // Cafe Admin: Refresh QR Scan Analytics
  app.get('/api/admin/qr-stats', requireAdmin, (req: AuthenticatedRequest, res) => {
    const store = ensureStorage();
    const cafe = store.cafes.find((c) => c.id === req.adminCafeId);
    if (!cafe) {
      res.status(404).json({ error: 'کافی‌شاپ یافت نشد.' });
      return;
    }
    res.json({
      menu: toAdminMenu(cafe),
    });
  });

  // Cafe Admin: Reset QR Scan Counters
  app.post('/api/admin/qr-stats/reset', requireAdmin, (req: AuthenticatedRequest, res) => {
    const store = ensureStorage();
    const cafe = store.cafes.find((c) => c.id === req.adminCafeId);
    if (!cafe) {
      res.status(404).json({ error: 'کافی‌شاپ یافت نشد.' });
      return;
    }
    const { tableNumber } = (req.body ?? {}) as { tableNumber?: number | null };
    cafe.tables = syncTables(cafe.tables, cafe.settings.tableCount);

    if (typeof tableNumber === 'number' && Number.isInteger(tableNumber)) {
      if (tableNumber === 0) {
        cafe.generalQrScans = 0;
      } else {
        const target = cafe.tables.find((t) => t.number === tableNumber);
        if (target) {
          target.qrScans = 0;
          target.lastScannedAt = undefined;
        }
      }
    } else {
      cafe.generalQrScans = 0;
      cafe.tables = cafe.tables.map((t) => ({
        ...t,
        qrScans: 0,
        lastScannedAt: undefined,
      }));
    }

    saveStore(store);
    res.json({ menu: toAdminMenu(cafe) });
  });

  // Public Customer Live Tray Sync (Powers Admin Live Table Monitor)
  app.post('/api/trays/sync', rateLimitLiveTray, (req, res) => {
    const store = ensureStorage();
    const { cafeSlug, sessionId, tableNumber, items, customerNote, startedAt } = req.body as {
      cafeSlug?: string;
      sessionId?: string;
      tableNumber?: number | null;
      customerNote?: string;
      startedAt?: string;
      items?: Array<{ itemId?: string; quantity?: number; note?: string }>;
    };

    const cafe = resolveCafeFromRequest(store, cafeSlug);
    if (!cafe || cafe.status !== 'approved') {
      res.status(404).json({ error: 'کافی‌شاپ فعال یافت نشد.' });
      return;
    }

    const cleanSessionId = typeof sessionId === 'string' ? sessionId.trim() : '';
    if (!/^[a-zA-Z0-9_-]{8,64}$/.test(cleanSessionId)) {
      res.status(400).json({ error: 'شناسه نشست سینی معتبر نیست.' });
      return;
    }

    const parsedTable =
      tableNumber !== null && tableNumber !== undefined && Number.isInteger(Number(tableNumber))
        ? Math.max(1, Math.min(cafe.settings.tableCount, Number(tableNumber)))
        : null;

    cafe.tables = syncTables(cafe.tables, cafe.settings.tableCount);
    const existingTrays = pruneLiveTrays(cafe);

    // Check if an admin cleared this table AFTER the customer started their current tray
    const startedMs = startedAt ? new Date(startedAt).getTime() : 0;
    const clearIso =
      parsedTable !== null
        ? cafe.tables.find((t) => t.number === parsedTable)?.lastClearedAt
        : cafe.takeawayClearedAt;
    const clearMs = clearIso ? new Date(clearIso).getTime() : 0;

    if (
      Array.isArray(items) &&
      items.length > 0 &&
      Number.isFinite(startedMs) &&
      startedMs > 0 &&
      Number.isFinite(clearMs) &&
      clearMs > startedMs
    ) {
      const nextTrays = existingTrays.filter((t) => t.sessionId !== cleanSessionId);
      if (nextTrays.length !== (cafe.liveTrays?.length ?? 0)) {
        cafe.liveTrays = nextTrays;
        saveStore(store);
      }
      res.json({ ok: true, clearedByAdmin: true, active: false });
      return;
    }

    if (!Array.isArray(items) || items.length === 0) {
      const nextTrays = existingTrays.filter((t) => t.sessionId !== cleanSessionId);
      if (nextTrays.length !== (cafe.liveTrays?.length ?? 0)) {
        cafe.liveTrays = nextTrays;
        saveStore(store);
      }
      res.json({ ok: true, active: false });
      return;
    }

    const verifiedItems: LiveTrayItem[] = [];
    for (const entry of items.slice(0, 50)) {
      if (!entry?.itemId || typeof entry.itemId !== 'string') continue;
      const menuItem = cafe.items.find((i) => i.id === entry.itemId && i.isAvailable);
      if (!menuItem) continue;
      const qty = Math.max(1, Math.min(50, Math.floor(Number(entry.quantity) || 1)));
      verifiedItems.push({
        itemId: menuItem.id,
        nameFa: menuItem.nameFa,
        unitPrice: menuItem.price,
        quantity: qty,
        note:
          typeof entry.note === 'string' && entry.note.trim()
            ? entry.note.trim().slice(0, 160)
            : undefined,
      });
    }

    if (verifiedItems.length === 0) {
      cafe.liveTrays = existingTrays.filter((t) => t.sessionId !== cleanSessionId);
      saveStore(store);
      res.json({ ok: true, active: false });
      return;
    }

    const now = new Date().toISOString();
    const itemCount = verifiedItems.reduce((sum, i) => sum + i.quantity, 0);
    const subtotal = verifiedItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    const nextEntry: LiveTableTray = {
      sessionId: cleanSessionId,
      tableNumber: parsedTable,
      items: verifiedItems,
      itemCount,
      subtotal,
      customerNote:
        typeof customerNote === 'string' && customerNote.trim()
          ? customerNote.trim().slice(0, 200)
          : undefined,
      startedAt:
        Number.isFinite(startedMs) && startedMs > 0 ? new Date(startedMs).toISOString() : now,
      updatedAt: now,
    };

    cafe.liveTrays = [
      nextEntry,
      ...existingTrays.filter((t) => t.sessionId !== cleanSessionId),
    ].slice(0, 200);

    saveStore(store);
    res.json({ ok: true, active: true, itemCount, subtotal });
  });

  // Cafe Admin: Live Table Monitor (Live Trays + Active Table Orders)
  app.get('/api/admin/live-tables', requireAdmin, (req: AuthenticatedRequest, res) => {
    const store = ensureStorage();
    const cafe = store.cafes.find((c) => c.id === req.adminCafeId);
    if (!cafe) {
      res.status(404).json({ error: 'کافی‌شاپ یافت نشد.' });
      return;
    }
    res.json(buildLiveTableMonitor(cafe));
  });

  // Cafe Admin: Clear Table Once Order Is Served (Clears live trays, completes active orders, sets table available)
  app.post('/api/admin/tables/:number/clear', requireAdmin, (req: AuthenticatedRequest, res) => {
    const store = ensureStorage();
    const cafe = store.cafes.find((c) => c.id === req.adminCafeId);
    if (!cafe) {
      res.status(404).json({ error: 'کافی‌شاپ یافت نشد.' });
      return;
    }

    const rawParam = String(req.params.number ?? '').trim();
    const isTakeaway = rawParam === '0' || rawParam === 'takeaway';
    const now = new Date().toISOString();
    cafe.tables = syncTables(cafe.tables, cafe.settings.tableCount);

    if (isTakeaway) {
      cafe.liveTrays = pruneLiveTrays(cafe).filter((t) => t.tableNumber !== null);
      cafe.orders = (cafe.orders ?? []).map((o) =>
        o.tableNumber === null && ACTIVE_ORDER_STATUS_SET.has(o.status)
          ? { ...o, status: 'completed', updatedAt: now }
          : o,
      );
      cafe.takeawayClearedAt = now;
      saveStore(store);
      res.json({
        menu: toAdminMenu(cafe),
        monitor: buildLiveTableMonitor(cafe),
      });
      return;
    }

    const tableNum = clampInt(rawParam, 1, 200, -1);
    const tableIdx = cafe.tables.findIndex((t) => t.number === tableNum);
    if (tableIdx === -1) {
      res.status(404).json({ error: 'میز مورد نظر یافت نشد.' });
      return;
    }

    cafe.liveTrays = pruneLiveTrays(cafe).filter((t) => t.tableNumber !== tableNum);
    cafe.orders = (cafe.orders ?? []).map((o) =>
      o.tableNumber === tableNum && ACTIVE_ORDER_STATUS_SET.has(o.status)
        ? { ...o, status: 'completed', updatedAt: now }
        : o,
    );
    cafe.tables[tableIdx] = {
      ...cafe.tables[tableIdx],
      status: 'available',
      guestsCount: 0,
      note: '',
      updatedAt: now,
      lastClearedAt: now,
    };

    saveStore(store);
    res.json({
      menu: toAdminMenu(cafe),
      monitor: buildLiveTableMonitor(cafe),
    });
  });

  // Cafe Admin: Add Category
  app.post('/api/menu/categories', requireAdmin, (req: AuthenticatedRequest, res) => {
    const store = ensureStorage();
    const cafe = store.cafes.find((c) => c.id === req.adminCafeId);
    if (!cafe) {
      res.status(404).json({ error: 'کافی‌شاپ یافت نشد.' });
      return;
    }
    const { nameFa, nameEn } = req.body as { nameFa?: string; nameEn?: string };
    const safeFa = sanitizeContentText(nameFa, 80);
    if (!safeFa) {
      res.status(400).json({ error: 'عنوان فارسی دسته‌بندی الزامی است.' });
      return;
    }
    const id = `cat-${Date.now().toString(36)}-${crypto.randomBytes(2).toString('hex')}`;
    const maxOrder = cafe.categories.reduce((max, c) => Math.max(max, c.order), 0);
    const category: MenuCategory = {
      id,
      nameFa: safeFa,
      nameEn: sanitizeContentText(nameEn, 80) || 'Menu Category',
      order: maxOrder + 1,
    };
    cafe.categories.push(category);
    menuTranslationCache.delete(cafe.id);
    saveStore(store);
    res.status(201).json({ category, menu: toAdminMenu(cafe) });
  });

  // Cafe Admin: Reorder Categories via Drag-and-Drop
  app.put('/api/menu/categories/reorder', requireAdmin, (req: AuthenticatedRequest, res) => {
    const store = ensureStorage();
    const cafe = store.cafes.find((c) => c.id === req.adminCafeId);
    if (!cafe) {
      res.status(404).json({ error: 'کافی‌شاپ یافت نشد.' });
      return;
    }

    const { categoryIds } = req.body as { categoryIds?: unknown };
    if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
      res.status(400).json({ error: 'ترتیب دسته‌بندی‌ها معتبر نیست.' });
      return;
    }

    const byId = new Map(cafe.categories.map((c) => [c.id, c]));
    const reordered: MenuCategory[] = [];
    const seen = new Set<string>();

    for (const rawId of categoryIds) {
      if (typeof rawId !== 'string' || seen.has(rawId)) continue;
      const found = byId.get(rawId);
      if (found) {
        reordered.push(found);
        seen.add(rawId);
      }
    }

    // Preserve any categories not explicitly included at the end
    const remaining = [...cafe.categories]
      .sort((a, b) => a.order - b.order)
      .filter((c) => !seen.has(c.id));

    cafe.categories = [...reordered, ...remaining].map((c, index) => ({
      ...c,
      order: index + 1,
    }));

    menuTranslationCache.delete(cafe.id);
    saveStore(store);
    res.json(toAdminMenu(cafe));
  });

  // Cafe Admin: Rename or Reorder Category
  app.put('/api/menu/categories/:id', requireAdmin, (req: AuthenticatedRequest, res) => {
    const store = ensureStorage();
    const cafe = store.cafes.find((c) => c.id === req.adminCafeId);
    if (!cafe) {
      res.status(404).json({ error: 'کافی‌شاپ یافت نشد.' });
      return;
    }
    const { id } = req.params;
    const sorted = [...cafe.categories].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((c) => c.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'دسته‌بندی مورد نظر یافت نشد.' });
      return;
    }

    const { nameFa, nameEn, direction } = req.body as {
      nameFa?: string;
      nameEn?: string;
      direction?: 'up' | 'down';
    };

    if (nameFa !== undefined) {
      const safeFa = sanitizeContentText(nameFa, 80);
      if (!safeFa) {
        res.status(400).json({ error: 'نام دسته‌بندی نمی‌تواند خالی باشد.' });
        return;
      }
      sorted[idx] = {
        ...sorted[idx],
        nameFa: safeFa,
        nameEn:
          nameEn !== undefined
            ? sanitizeContentText(nameEn, 80) ?? sorted[idx].nameEn
            : sorted[idx].nameEn,
      };
    }

    if (direction === 'up' && idx > 0) {
      const temp = sorted[idx - 1];
      sorted[idx - 1] = sorted[idx];
      sorted[idx] = temp;
    } else if (direction === 'down' && idx < sorted.length - 1) {
      const temp = sorted[idx + 1];
      sorted[idx + 1] = sorted[idx];
      sorted[idx] = temp;
    }

    cafe.categories = sorted.map((c, index) => ({ ...c, order: index + 1 }));
    menuTranslationCache.delete(cafe.id);
    saveStore(store);
    res.json(toAdminMenu(cafe));
  });

  // Cafe Admin: Delete Category
  app.delete('/api/menu/categories/:id', requireAdmin, (req: AuthenticatedRequest, res) => {
    const store = ensureStorage();
    const cafe = store.cafes.find((c) => c.id === req.adminCafeId);
    if (!cafe) {
      res.status(404).json({ error: 'کافی‌شاپ یافت نشد.' });
      return;
    }
    const { id } = req.params;
    if (cafe.categories.length <= 1) {
      res.status(400).json({ error: 'حداقل یک دسته‌بندی باید در منو باقی بماند.' });
      return;
    }
    const remaining = cafe.categories.filter((c) => c.id !== id);
    if (remaining.length === cafe.categories.length) {
      res.status(404).json({ error: 'دسته‌بندی مورد نظر یافت نشد.' });
      return;
    }
    const fallbackCategoryId = remaining[0].id;
    cafe.items = cafe.items.map((item) =>
      item.categoryId === id ? { ...item, categoryId: fallbackCategoryId } : item,
    );
    cafe.categories = remaining.map((c, index) => ({ ...c, order: index + 1 }));
    menuTranslationCache.delete(cafe.id);
    saveStore(store);
    res.json(toAdminMenu(cafe));
  });

  // Cafe Admin: Add Menu Item
  app.post('/api/menu/items', requireAdmin, (req: AuthenticatedRequest, res) => {
    const store = ensureStorage();
    const cafe = store.cafes.find((c) => c.id === req.adminCafeId);
    if (!cafe) {
      res.status(404).json({ error: 'کافی‌شاپ یافت نشد.' });
      return;
    }
    const body = req.body as Partial<MenuItem>;

    if (!body.nameFa || !body.nameFa.trim()) {
      res.status(400).json({ error: 'نام آیتم الزامی است.' });
      return;
    }
    const price = Number(body.price);
    if (!Number.isFinite(price) || price < 0 || price > 1_000_000_000) {
      res.status(400).json({ error: 'قیمت وارد شده معتبر نیست.' });
      return;
    }

    const categoryExists = cafe.categories.some((c) => c.id === body.categoryId);
    const categoryId = categoryExists && body.categoryId ? body.categoryId : cafe.categories[0].id;
    const now = new Date().toISOString();

    const parsedCalories =
      body.calories !== undefined && body.calories !== null && Number.isFinite(Number(body.calories))
        ? clampInt(body.calories, 0, 10000, 0)
        : undefined;

    const newItem: MenuItem = {
      id: `item-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`,
      categoryId,
      nameFa: sanitizeContentText(body.nameFa, 120) || 'آیتم جدید',
      nameEn: sanitizeContentText(body.nameEn, 120) || 'Chef Special',
      descriptionFa: sanitizeContentText(body.descriptionFa, 320) || '',
      price: Math.round(price),
      prepTimeMinutes: clampInt(body.prepTimeMinutes, 1, 120, 10),
      calories: parsedCalories && parsedCalories > 0 ? parsedCalories : undefined,
      ingredientsFa: Array.isArray(body.ingredientsFa)
        ? body.ingredientsFa
            .slice(0, 20)
            .map((s) => sanitizeContentText(String(s), 60) || '')
            .filter(Boolean)
        : [],
      imageUrl: sanitizeImageUrl(body.imageUrl) || 'preset:saffron_latte',
      isSignature: Boolean(body.isSignature),
      isAvailable: body.isAvailable !== false,
      depthLevel: 'elevated',
      createdAt: now,
      updatedAt: now,
    };

    cafe.items.unshift(newItem);
    menuTranslationCache.delete(cafe.id);
    saveStore(store);
    res.status(201).json({ item: newItem, menu: toAdminMenu(cafe) });
  });

  // Cafe Admin: Edit Menu Item
  app.put('/api/menu/items/:id', requireAdmin, (req: AuthenticatedRequest, res) => {
    const store = ensureStorage();
    const cafe = store.cafes.find((c) => c.id === req.adminCafeId);
    if (!cafe) {
      res.status(404).json({ error: 'کافی‌شاپ یافت نشد.' });
      return;
    }
    const { id } = req.params;
    const idx = cafe.items.findIndex((item) => item.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'آیتم مورد نظر یافت نشد.' });
      return;
    }

    const current = cafe.items[idx];
    const body = req.body as Partial<MenuItem>;

    const nextPrice = body.price !== undefined ? Number(body.price) : current.price;
    if (!Number.isFinite(nextPrice) || nextPrice < 0 || nextPrice > 1_000_000_000) {
      res.status(400).json({ error: 'قیمت وارد شده معتبر نیست.' });
      return;
    }

    const updated: MenuItem = {
      ...current,
      categoryId:
        body.categoryId && cafe.categories.some((c) => c.id === body.categoryId)
          ? body.categoryId
          : current.categoryId,
      nameFa:
        body.nameFa !== undefined
          ? sanitizeContentText(body.nameFa, 120) || current.nameFa
          : current.nameFa,
      nameEn:
        body.nameEn !== undefined
          ? sanitizeContentText(body.nameEn, 120) ?? ''
          : current.nameEn,
      descriptionFa:
        body.descriptionFa !== undefined
          ? sanitizeContentText(body.descriptionFa, 320) ?? ''
          : current.descriptionFa,
      price: Math.round(nextPrice),
      prepTimeMinutes:
        body.prepTimeMinutes !== undefined
          ? clampInt(body.prepTimeMinutes, 1, 120, current.prepTimeMinutes)
          : current.prepTimeMinutes,
      calories:
        body.calories !== undefined
          ? clampInt(body.calories, 0, 10000, 0) || undefined
          : current.calories,
      ingredientsFa: Array.isArray(body.ingredientsFa)
        ? body.ingredientsFa
            .slice(0, 20)
            .map((s) => sanitizeContentText(String(s), 60) || '')
            .filter(Boolean)
        : current.ingredientsFa,
      imageUrl:
        body.imageUrl !== undefined
          ? sanitizeImageUrl(body.imageUrl) || current.imageUrl
          : current.imageUrl,
      isSignature: body.isSignature !== undefined ? Boolean(body.isSignature) : current.isSignature,
      isAvailable: body.isAvailable !== undefined ? Boolean(body.isAvailable) : current.isAvailable,
      updatedAt: new Date().toISOString(),
    };

    cafe.items[idx] = updated;
    menuTranslationCache.delete(cafe.id);
    saveStore(store);
    res.json({ item: updated, menu: toAdminMenu(cafe) });
  });

  // Cafe Admin: Delete Menu Item
  app.delete('/api/menu/items/:id', requireAdmin, (req: AuthenticatedRequest, res) => {
    const store = ensureStorage();
    const cafe = store.cafes.find((c) => c.id === req.adminCafeId);
    if (!cafe) {
      res.status(404).json({ error: 'کافی‌شاپ یافت نشد.' });
      return;
    }
    const { id } = req.params;
    const nextItems = cafe.items.filter((item) => item.id !== id);
    if (nextItems.length === cafe.items.length) {
      res.status(404).json({ error: 'آیتم مورد نظر یافت نشد.' });
      return;
    }
    cafe.items = nextItems;
    menuTranslationCache.delete(cafe.id);
    saveStore(store);
    res.json(toAdminMenu(cafe));
  });

  // Cafe Admin: Image Upload (strict base64 + magic-byte validation)
  app.post('/api/upload', requireAdmin, async (req, res, next) => {
    try {
      const result = await saveUploadedDataUrl((req.body as { dataUrl?: unknown }).dataUrl);
      if (!result.url) {
        res.status(400).json({ error: result.error || 'آپلود تصویر ناموفق بود.' });
        return;
      }
      res.status(201).json({ url: result.url });
    } catch (err) {
      next(err);
    }
  });

  // Cafe Admin: List & Manage Customer Orders (strictly isolated to req.adminCafeId)
  app.get('/api/admin/orders', requireAdmin, (req: AuthenticatedRequest, res) => {
    const store = ensureStorage();
    const cafe = store.cafes.find((c) => c.id === req.adminCafeId);
    if (!cafe) {
      res.status(404).json({ error: 'کافی‌شاپ یافت نشد.' });
      return;
    }
    const orders = [...(cafe.orders ?? [])].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    res.json({ orders });
  });

  app.put('/api/admin/orders/:id/status', requireAdmin, (req: AuthenticatedRequest, res) => {
    const store = ensureStorage();
    const cafe = store.cafes.find((c) => c.id === req.adminCafeId);
    if (!cafe) {
      res.status(404).json({ error: 'کافی‌شاپ یافت نشد.' });
      return;
    }
    const { status } = req.body as { status?: OrderStatus };
    const allowed: OrderStatus[] = ['pending', 'preparing', 'ready', 'completed', 'cancelled'];
    if (!status || !allowed.includes(status)) {
      res.status(400).json({ error: 'وضعیت سفارش معتبر نیست.' });
      return;
    }
    const orders = cafe.orders ?? [];
    const idx = orders.findIndex((o) => o.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'سفارش مورد نظر یافت نشد.' });
      return;
    }
    orders[idx] = {
      ...orders[idx],
      status,
      updatedAt: new Date().toISOString(),
    };
    cafe.orders = orders;
    saveStore(store);
    res.json({
      order: orders[idx],
      orders: [...orders].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    });
  });

  // Cafe Admin: Key Analytics & Sales Metrics (for Recharts Dashboard)
  app.get('/api/admin/analytics', requireAdmin, (req: AuthenticatedRequest, res) => {
    const store = ensureStorage();
    const cafe = store.cafes.find((c) => c.id === req.adminCafeId);
    if (!cafe) {
      res.status(404).json({ error: 'کافی‌شاپ یافت نشد.' });
      return;
    }

    const orders = cafe.orders ?? [];
    const validOrders = orders.filter((o) => o.status !== 'cancelled');
    const cancelledOrders = orders.filter((o) => o.status === 'cancelled');

    const totalRevenue = validOrders.reduce((sum, o) => sum + o.total, 0);
    const completedRevenue = validOrders
      .filter((o) => o.status === 'completed')
      .reduce((sum, o) => sum + o.total, 0);
    const activeRevenue = totalRevenue - completedRevenue;
    const avgOrderValue = validOrders.length > 0 ? Math.round(totalRevenue / validOrders.length) : 0;

    // 1. Top selling items
    const itemById = new Map(cafe.items.map((item) => [item.id, item]));
    const catNameById = new Map(cafe.categories.map((cat) => [cat.id, cat.nameFa]));
    const itemStatsMap = new Map<
      string,
      { itemId: string; nameFa: string; shortName: string; quantity: number; revenue: number; categoryFa: string }
    >();

    // Category breakdown
    const catStatsMap = new Map<string, { categoryId: string; nameFa: string; quantity: number; revenue: number }>();

    for (const ord of validOrders) {
      for (const entry of ord.items) {
        const menuItem = itemById.get(entry.itemId);
        const categoryId = menuItem?.categoryId ?? 'other';
        const categoryFa = catNameById.get(categoryId) ?? 'سایر';
        const lineRevenue = entry.unitPrice * entry.quantity;

        const prevItem = itemStatsMap.get(entry.itemId);
        if (prevItem) {
          prevItem.quantity += entry.quantity;
          prevItem.revenue += lineRevenue;
        } else {
          const shortName =
            entry.nameFa.length > 18 ? `${entry.nameFa.slice(0, 17)}…` : entry.nameFa;
          itemStatsMap.set(entry.itemId, {
            itemId: entry.itemId,
            nameFa: entry.nameFa,
            shortName,
            quantity: entry.quantity,
            revenue: lineRevenue,
            categoryFa,
          });
        }

        const prevCat = catStatsMap.get(categoryId);
        if (prevCat) {
          prevCat.quantity += entry.quantity;
          prevCat.revenue += lineRevenue;
        } else {
          catStatsMap.set(categoryId, {
            categoryId,
            nameFa: categoryFa,
            quantity: entry.quantity,
            revenue: lineRevenue,
          });
        }
      }
    }

    const topItems = Array.from(itemStatsMap.values())
      .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue)
      .slice(0, 7);

    const categoryBreakdown = Array.from(catStatsMap.values()).sort(
      (a, b) => b.revenue - a.revenue,
    );

    // 2. Daily Revenue across the last 7 days
    const faDateFormatter = new Intl.DateTimeFormat('fa-IR', {
      weekday: 'short',
      month: 'numeric',
      day: 'numeric',
    });
    const toLocalDayKey = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const dayBuckets = new Map<string, { revenue: number; ordersCount: number }>();
    for (const ord of validOrders) {
      const d = new Date(ord.createdAt);
      if (Number.isNaN(d.getTime())) continue;
      const key = toLocalDayKey(d);
      const curr = dayBuckets.get(key) ?? { revenue: 0, ordersCount: 0 };
      curr.revenue += ord.total;
      curr.ordersCount += 1;
      dayBuckets.set(key, curr);
    }

    const dailyRevenue: Array<{
      dateKey: string;
      label: string;
      revenue: number;
      ordersCount: number;
    }> = [];
    const today = new Date();
    for (let offset = 6; offset >= 0; offset--) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset);
      const key = toLocalDayKey(d);
      const stats = dayBuckets.get(key) ?? { revenue: 0, ordersCount: 0 };
      dailyRevenue.push({
        dateKey: key,
        label: offset === 0 ? 'امروز' : faDateFormatter.format(d),
        revenue: stats.revenue,
        ordersCount: stats.ordersCount,
      });
    }

    // 3. Peak Hours (08:00 to 23:00)
    const hourCounts = new Map<number, { ordersCount: number; revenue: number }>();
    for (const ord of validOrders) {
      const d = new Date(ord.createdAt);
      if (Number.isNaN(d.getTime())) continue;
      const hr = d.getHours();
      const curr = hourCounts.get(hr) ?? { ordersCount: 0, revenue: 0 };
      curr.ordersCount += 1;
      curr.revenue += ord.total;
      hourCounts.set(hr, curr);
    }

    let maxHourCount = 0;
    let peakHourNum: number | null = null;
    const peakHours: Array<{
      hour: number;
      label: string;
      ordersCount: number;
      revenue: number;
      isPeak: boolean;
    }> = [];

    for (let h = 8; h <= 23; h++) {
      const entry = hourCounts.get(h) ?? { ordersCount: 0, revenue: 0 };
      if (entry.ordersCount > maxHourCount) {
        maxHourCount = entry.ordersCount;
        peakHourNum = h;
      }
      peakHours.push({
        hour: h,
        label: `${String(h).padStart(2, '0')}:۰۰`,
        ordersCount: entry.ordersCount,
        revenue: entry.revenue,
        isPeak: false,
      });
    }

    for (const slot of peakHours) {
      if (maxHourCount > 0 && slot.ordersCount >= maxHourCount) {
        slot.isPeak = true;
      }
    }

    const peakHourLabel =
      peakHourNum !== null && maxHourCount > 0
        ? `ساعت ${String(peakHourNum).padStart(2, '0')}:۰۰ تا ${String((peakHourNum + 1) % 24).padStart(2, '0')}:۰۰`
        : 'ثبت نشده';

    res.json({
      summary: {
        totalRevenue,
        completedRevenue,
        activeRevenue,
        totalOrders: orders.length,
        validOrders: validOrders.length,
        cancelledOrders: cancelledOrders.length,
        avgOrderValue,
        peakHourLabel,
        topItemName: topItems[0]?.nameFa ?? 'ثبت نشده',
      },
      topItems,
      dailyRevenue,
      peakHours,
      categoryBreakdown,
    });
  });

  // =========================================================
  // PLATFORM SUPER-OWNER ROUTES (Exclusive to Platform Owner)
  // =========================================================

  app.get('/api/owner/verify', (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const payload = verifyTokenPayload(token);
    if (!payload || payload.role !== 'platform_owner') {
      res.json({ authenticated: false });
      return;
    }
    const store = ensureStorage();
    res.json({ authenticated: payload.tv === (store.ownerTokenVersion ?? 1) });
  });

  app.post('/api/owner/login', rateLimitAuth, (req, res) => {
    const { passcode } = req.body as { passcode?: string };
    if (!passcode || typeof passcode !== 'string' || passcode.trim().length < 1 || passcode.trim().length > 128) {
      res.status(400).json({ error: 'لطفاً رمز عبور معتبر اختصاصی مالک را وارد کنید.' });
      return;
    }
    const store = ensureStorage();
    const check = verifyPasscode(passcode.trim(), store.ownerPasscodeHash);
    if (!check.valid) {
      res.status(401).json({ error: 'رمز عبور مالک پلتفرم نادرست است.' });
      return;
    }
    if (check.needsUpgrade) {
      store.ownerPasscodeHash = hashPasscode(passcode.trim());
      saveStore(store);
    }
    const token = signToken({
      role: 'platform_owner',
      tv: store.ownerTokenVersion ?? 1,
      exp: Date.now() + 1000 * 60 * 60 * 24,
    });
    res.json({ token });
  });

  app.put('/api/owner/passcode', requireOwner, (req, res) => {
    const { newPasscode } = req.body as { newPasscode?: string };
    if (!newPasscode || typeof newPasscode !== 'string' || newPasscode.trim().length < 4 || newPasscode.trim().length > 128) {
      res.status(400).json({ error: 'رمز جدید مالک باید بین ۴ تا ۱۲۸ کاراکتر باشد.' });
      return;
    }
    const store = ensureStorage();
    store.ownerPasscodeHash = hashPasscode(newPasscode.trim());
    store.ownerTokenVersion = (store.ownerTokenVersion ?? 1) + 1;
    saveStore(store);
    const refreshedToken = signToken({
      role: 'platform_owner',
      tv: store.ownerTokenVersion,
      exp: Date.now() + 1000 * 60 * 60 * 24,
    });
    res.json({ ok: true, token: refreshedToken });
  });

  app.get('/api/owner/cafes', requireOwner, (_req, res) => {
    const store = ensureStorage();
    res.json({ cafes: store.cafes.map(toCafeSummary) });
  });

  // Owner: Upload image for any cafe's landing page
  app.post('/api/owner/upload', requireOwner, async (req, res, next) => {
    try {
      const result = await saveUploadedDataUrl((req.body as { dataUrl?: unknown }).dataUrl);
      if (!result.url) {
        res.status(400).json({ error: result.error || 'آپلود تصویر ناموفق بود.' });
        return;
      }
      res.status(201).json({ url: result.url });
    } catch (err) {
      next(err);
    }
  });

  // Owner: Get dedicated landing page config for a specific coffee shop
  app.get('/api/owner/cafes/:id/landing', requireOwner, (req, res) => {
    const store = ensureStorage();
    const cafe = store.cafes.find((c) => c.id === req.params.id);
    if (!cafe) {
      res.status(404).json({ error: 'کافی‌شاپ یافت نشد.' });
      return;
    }
    res.json({
      cafe: toCafeSummary(cafe),
      settings: cafe.settings,
      contentOverrides: cafe.contentOverrides ?? {},
    });
  });

  // Owner: Customize dedicated landing page per coffee shop (hero, logo, craft pillars, info, footer, SEO)
  app.put('/api/owner/cafes/:id/landing', requireOwner, (req, res) => {
    const store = ensureStorage();
    const cafe = store.cafes.find((c) => c.id === req.params.id);
    if (!cafe) {
      res.status(404).json({ error: 'کافی‌شاپ یافت نشد.' });
      return;
    }

    const body = req.body as {
      contentOverrides?: AppContentOverrides;
      settings?: {
        taglineFa?: string;
        addressFa?: string;
        hoursFa?: string;
        metaTitle?: string;
        metaDescription?: string;
        landingTemplate?: LandingTemplateId;
      };
      reset?: boolean;
    };

    if (body.reset) {
      const curr = cafe.contentOverrides ?? {};
      // Preserve shop owner's menu-level overrides while resetting landing fields to defaults
      cafe.contentOverrides = sanitizeMenuCustomizationFields(curr, {});
      menuTranslationCache.delete(cafe.id);
      saveStore(store);
      res.json({
        cafe: toCafeSummary(cafe),
        settings: cafe.settings,
        contentOverrides: cafe.contentOverrides ?? {},
      });
      return;
    }

    if (body.contentOverrides) {
      cafe.contentOverrides = sanitizeLandingCustomizationFields(
        body.contentOverrides,
        cafe.contentOverrides ?? {},
      );
    }

    if (body.settings) {
      cafe.settings = {
        ...cafe.settings,
        taglineFa:
          body.settings.taglineFa !== undefined
            ? sanitizeContentText(body.settings.taglineFa, 220) ?? ''
            : cafe.settings.taglineFa,
        addressFa:
          body.settings.addressFa !== undefined
            ? sanitizeContentText(body.settings.addressFa, 220) ?? ''
            : cafe.settings.addressFa,
        hoursFa:
          body.settings.hoursFa !== undefined
            ? sanitizeContentText(body.settings.hoursFa, 120) ?? ''
            : cafe.settings.hoursFa,
        metaTitle:
          body.settings.metaTitle !== undefined
            ? sanitizeContentText(body.settings.metaTitle, 110)
            : cafe.settings.metaTitle,
        metaDescription:
          body.settings.metaDescription !== undefined
            ? sanitizeContentText(body.settings.metaDescription, 260)
            : cafe.settings.metaDescription,
        landingTemplate:
          body.settings.landingTemplate !== undefined
            ? sanitizeLandingTemplate(body.settings.landingTemplate)
            : cafe.settings.landingTemplate,
      };
    }

    menuTranslationCache.delete(cafe.id);
    saveStore(store);
    res.json({
      cafe: toCafeSummary(cafe),
      cafes: store.cafes.map(toCafeSummary),
      settings: cafe.settings,
      contentOverrides: cafe.contentOverrides ?? {},
    });
  });

  // Owner: Select one of the 3 preset landing page layouts & color schemes per coffee shop
  app.put('/api/owner/cafes/:id/template', requireOwner, (req, res) => {
    const store = ensureStorage();
    const cafe = store.cafes.find((c) => c.id === req.params.id);
    if (!cafe) {
      res.status(404).json({ error: 'کافی‌شاپ یافت نشد.' });
      return;
    }
    const { landingTemplate } = req.body as { landingTemplate?: unknown };
    if (
      typeof landingTemplate !== 'string' ||
      !ALLOWED_LANDING_TEMPLATES.has(landingTemplate as LandingTemplateId)
    ) {
      res.status(400).json({ error: 'قالب انتخاب‌شده معتبر نیست.' });
      return;
    }
    cafe.settings = {
      ...cafe.settings,
      landingTemplate: landingTemplate as LandingTemplateId,
    };
    saveStore(store);
    res.json({
      cafe: toCafeSummary(cafe),
      cafes: store.cafes.map(toCafeSummary),
    });
  });

  // Owner: Export Database Backup JSON (never loses platform data across deploys)
  app.get('/api/owner/backup', requireOwner, (_req, res) => {
    const store = ensureStorage();
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="mycafe-backup-${new Date().toISOString().slice(0, 10)}.json"`,
    );
    res.json({
      exportedAt: new Date().toISOString(),
      version: 1,
      store,
    });
  });

  // Owner: Safely Restore Database Backup JSON (validates structure and sanitizes all fields before atomic swap)
  app.post('/api/owner/restore', requireOwner, (req, res) => {
    const body = req.body as { store?: unknown } | unknown;
    const candidate =
      body && typeof body === 'object' && 'store' in body
        ? (body as { store: unknown }).store
        : body;

    if (!isValidPlatformStore(candidate)) {
      res.status(400).json({ error: 'فایل پشتیبان معتبر نیست یا ساختار دیتابیس ناقص است.' });
      return;
    }

    const hashOk =
      candidate.ownerPasscodeHash.startsWith('scrypt:') ||
      /^[a-f0-9]{64}$/i.test(candidate.ownerPasscodeHash);
    if (!hashOk) {
      res.status(400).json({ error: 'ساختار هش رمز مالک در فایل پشتیبان معتبر نیست.' });
      return;
    }

    for (const cafe of candidate.cafes) {
      if (
        !cafe ||
        typeof cafe.id !== 'string' ||
        typeof cafe.slug !== 'string' ||
        !cafe.settings ||
        !Array.isArray(cafe.categories) ||
        !Array.isArray(cafe.items)
      ) {
        res.status(400).json({ error: 'اطلاعات یکی از کافی‌شاپ‌ها در فایل پشتیبان ناقص است.' });
        return;
      }
      const cleanSlug = normalizeSlug(cafe.slug);
      if (!cleanSlug || cleanSlug.length < 3) {
        res.status(400).json({ error: 'شناسه یکی از کافی‌شاپ‌ها در فایل پشتیبان نامعتبر است.' });
        return;
      }
      cafe.slug = cleanSlug;
      if (cafe.contentOverrides && typeof cafe.contentOverrides === 'object') {
        cafe.contentOverrides = sanitizeLandingCustomizationFields(
          cafe.contentOverrides,
          sanitizeMenuCustomizationFields(cafe.contentOverrides, {}),
        );
      }
    }

    normalizeAndMigrateStore(candidate);
    menuTranslationCache.clear();
    saveStore(candidate);
    res.json({ ok: true, cafes: candidate.cafes.map(toCafeSummary) });
  });

  app.post('/api/owner/cafes', requireOwner, (req, res) => {
    const store = ensureStorage();
    const {
      nameFa,
      nameEn,
      slug,
      ownerName,
      ownerPhone,
      passcode,
      tableCount,
      status,
    } = req.body as {
      nameFa?: string;
      nameEn?: string;
      slug?: string;
      ownerName?: string;
      ownerPhone?: string;
      passcode?: string;
      tableCount?: number;
      status?: CafeStatus;
    };

    const safeNameFa = sanitizeContentText(nameFa, 80);
    if (!safeNameFa) {
      res.status(400).json({ error: 'نام فارسی کافی‌شاپ الزامی است.' });
      return;
    }
    const cleanSlug = normalizeSlug(slug || nameEn || `cafe-${Date.now().toString(36)}`);
    if (!cleanSlug || cleanSlug.length < 3) {
      res.status(400).json({ error: 'شناسه لینک (Slug) معتبر نیست.' });
      return;
    }
    if (store.cafes.some((c) => c.slug === cleanSlug)) {
      res.status(409).json({ error: 'کافی‌شاپی با این شناسه قبلاً ثبت شده است.' });
      return;
    }
    if (!passcode || typeof passcode !== 'string' || passcode.trim().length < 4 || passcode.trim().length > 128) {
      res.status(400).json({ error: 'رمز ورود ادمین کافی‌شاپ باید بین ۴ تا ۱۲۸ کاراکتر باشد.' });
      return;
    }

    const now = new Date().toISOString();
    const initialStatus: CafeStatus = status === 'pending' ? 'pending' : 'approved';
    const tablesCount = clampInt(tableCount, 1, 200, 12);

    const newCafe: CafeTenant = {
      id: `cafe-${Date.now().toString(36)}-${crypto.randomBytes(2).toString('hex')}`,
      slug: cleanSlug,
      status: initialStatus,
      allowContentCustomization: Boolean((req.body as { allowContentCustomization?: boolean }).allowContentCustomization),
      tokenVersion: 1,
      ownerName: sanitizeContentText(ownerName, 80) || 'مدیر کافی‌شاپ',
      ownerPhone: sanitizeContentText(ownerPhone, 30) || 'ثبت نشده',
      adminPasscodeHash: hashPasscode(passcode.trim()),
      createdAt: now,
      approvedAt: initialStatus === 'approved' ? now : undefined,
      settings: {
        nameFa: safeNameFa,
        nameEn: sanitizeContentText(nameEn, 80) || cleanSlug.toUpperCase(),
        taglineFa: 'تجربه سفارش سه‌بعدی و سریع بر سر میز با منوی دیجیتال اختصاصی',
        addressFa: 'نشانی کافه در تنظیمات مدیریت قابل ویرایش است',
        hoursFa: 'همه‌روزه ۹:۰۰ تا ۲۳:۳۰',
        currencyLabel: 'تومان',
        tableCount: tablesCount,
        serviceChargePercent: 10,
      },
      contentOverrides: {},
      categories: createDefaultCategories(),
      items: createStarterItems(now),
      tables: createInitialTables(tablesCount, false),
      orders: [],
    };

    store.cafes.unshift(newCafe);
    saveStore(store);
    res.status(201).json({ cafes: store.cafes.map(toCafeSummary) });
  });

  app.put('/api/owner/cafes/:id/customization-permission', requireOwner, (req, res) => {
    const store = ensureStorage();
    const { id } = req.params;
    const { allowContentCustomization } = req.body as { allowContentCustomization?: boolean };
    const cafe = store.cafes.find((c) => c.id === id);
    if (!cafe) {
      res.status(404).json({ error: 'کافی‌شاپ یافت نشد.' });
      return;
    }
    cafe.allowContentCustomization = Boolean(allowContentCustomization);
    saveStore(store);
    res.json({ cafes: store.cafes.map(toCafeSummary) });
  });

  app.put('/api/owner/cafes/:id/status', requireOwner, (req, res) => {
    const store = ensureStorage();
    const { id } = req.params;
    const { status } = req.body as { status?: CafeStatus };
    if (!status || !['pending', 'approved', 'suspended'].includes(status)) {
      res.status(400).json({ error: 'وضعیت انتخاب‌شده معتبر نیست.' });
      return;
    }
    const cafe = store.cafes.find((c) => c.id === id);
    if (!cafe) {
      res.status(404).json({ error: 'کافی‌شاپ یافت نشد.' });
      return;
    }
    cafe.status = status;
    if (status === 'approved' && !cafe.approvedAt) {
      cafe.approvedAt = new Date().toISOString();
    } else if (status !== 'approved') {
      cafe.tokenVersion = (cafe.tokenVersion ?? 1) + 1;
    }
    saveStore(store);
    res.json({ cafes: store.cafes.map(toCafeSummary) });
  });

  app.put('/api/owner/cafes/:id/passcode', requireOwner, (req, res) => {
    const store = ensureStorage();
    const { id } = req.params;
    const { newPasscode } = req.body as { newPasscode?: string };
    if (!newPasscode || typeof newPasscode !== 'string' || newPasscode.trim().length < 4 || newPasscode.trim().length > 128) {
      res.status(400).json({ error: 'رمز جدید ادمین کافی‌شاپ باید بین ۴ تا ۱۲۸ کاراکتر باشد.' });
      return;
    }
    const cafe = store.cafes.find((c) => c.id === id);
    if (!cafe) {
      res.status(404).json({ error: 'کافی‌شاپ یافت نشد.' });
      return;
    }
    cafe.adminPasscodeHash = hashPasscode(newPasscode.trim());
    cafe.tokenVersion = (cafe.tokenVersion ?? 1) + 1;
    saveStore(store);
    res.json({ ok: true });
  });

  app.delete('/api/owner/cafes/:id', requireOwner, (req, res) => {
    const store = ensureStorage();
    const { id } = req.params;
    if (store.cafes.length <= 1) {
      res.status(400).json({ error: 'حداقل یک کافی‌شاپ باید در پلتفرم باقی بماند.' });
      return;
    }
    const next = store.cafes.filter((c) => c.id !== id);
    if (next.length === store.cafes.length) {
      res.status(404).json({ error: 'کافی‌شاپ یافت نشد.' });
      return;
    }
    store.cafes = next;
    saveStore(store);
    res.json({ cafes: store.cafes.map(toCafeSummary) });
  });

  if (!IS_VERCEL) {
    if (process.env.NODE_ENV === 'production') {
      const distDir = path.resolve(process.cwd(), 'dist');
      app.use(express.static(distDir));
      app.get('*all', (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    } else {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    }
  }

  // Global sanitized JSON error handler (prevents stack trace / HTML error leaks)
  app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof SyntaxError && 'body' in err) {
      res.status(400).json({ error: 'ساختار JSON ارسالی معتبر نیست.' });
      return;
    }
    console.error(`Unhandled server error on ${req.method} ${req.path}:`, err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'خطای داخلی سرور رخ داد.' });
    }
  });

  return app;
}

if (!IS_VERCEL) {
  createApp()
    .then((app) => {
      app.listen(PORT, '0.0.0.0', () => {
        console.log(
          `My Cafe Menu Server listening on http://localhost:${PORT} (storage: ${USE_NEON ? 'Neon PostgreSQL' : 'Local JSON'})`,
        );
      });
    })
    .catch((err) => {
      console.error('Failed to start server:', err);
      process.exit(1);
    });
}
