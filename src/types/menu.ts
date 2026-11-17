export interface MenuCategory {
  id: string;
  nameFa: string;
  nameEn: string;
  order: number;
}

export interface MenuItem {
  id: string;
  categoryId: string;
  nameFa: string;
  nameEn: string;
  descriptionFa: string;
  price: number;
  prepTimeMinutes: number;
  calories?: number;
  ingredientsFa: string[];
  imageUrl: string;
  isSignature: boolean;
  isAvailable: boolean;
  depthLevel?: 'standard' | 'elevated';
  createdAt: string;
  updatedAt: string;
}

export type TableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning';

export interface TableInfo {
  number: number;
  label: string;
  capacity: number;
  status: TableStatus;
  guestsCount: number;
  note: string;
  updatedAt: string;
  qrScans?: number;
  lastScannedAt?: string;
  lastClearedAt?: string;
}

export interface AppContentOverrides {
  // Visuals & Images
  brandLogoUrl?: string;
  heroFeaturedImageUrl?: string;
  menuBannerImageUrl?: string;
  infoSectionImageUrl?: string;
  // Header & Navigation
  navFeaturedLabel?: string;
  navCatalogLabel?: string;
  navInfoLabel?: string;
  headerShareLabel?: string;
  headerTrayLabel?: string;
  // Hero Section
  heroBadgeEn?: string;
  heroTitleFa?: string;
  heroSubtitleFa?: string;
  searchPlaceholderFa?: string;
  heroFilterSignatureLabelFa?: string;
  heroPrimaryCtaFa?: string;
  heroSecondaryCtaFa?: string;
  heroHighlight1Fa?: string;
  heroHighlight2Fa?: string;
  heroHighlight3Fa?: string;
  heroQualityBadgeFa?: string;
  heroFeaturedTagEn?: string;
  heroFeaturedLabelFa?: string;
  heroFeaturedActionFa?: string;
  // Landing Craft Pillars
  craftPillar1TitleFa?: string;
  craftPillar1DescFa?: string;
  craftPillar2TitleFa?: string;
  craftPillar2DescFa?: string;
  craftPillar3TitleFa?: string;
  craftPillar3DescFa?: string;
  craftPillar4TitleFa?: string;
  craftPillar4DescFa?: string;
  // Catalog & Popular Sections
  popularEyebrowEn?: string;
  popularTitleFa?: string;
  popularActionFa?: string;
  catalogEyebrowEn?: string;
  catalogTitleFa?: string;
  catalogAllChaptersFa?: string;
  menuGridViewLabelFa?: string;
  menuListViewLabelFa?: string;
  emptySearchTitleFa?: string;
  // Info Strip, Contact & Footer
  infoSectionTitleFa?: string;
  infoAddressTitleFa?: string;
  infoHoursTitleFa?: string;
  infoPhoneTitleFa?: string;
  infoPhoneValueFa?: string;
  infoQrTitleFa?: string;
  infoQrDescFa?: string;
  footerCopyFa?: string;
  footerTaglineEn?: string;
}

export type LandingTemplateId =
  | 'classic-sage'
  | 'editorial-roastery'
  | 'botanical-minimal';

export interface RestaurantSettings {
  nameFa: string;
  nameEn: string;
  taglineFa: string;
  addressFa: string;
  hoursFa: string;
  currencyLabel: string;
  tableCount: number;
  serviceChargePercent: number;
  fontFa?: string;
  fontEn?: string;
  metaTitle?: string;
  metaDescription?: string;
  defaultMenuLayout?: 'grid' | 'list';
  showPrepTime?: boolean;
  showCalories?: boolean;
  landingTemplate?: LandingTemplateId;
}

export type CafeStatus = 'pending' | 'approved' | 'suspended';

export interface MenuDatabase {
  cafeId: string;
  cafeSlug: string;
  cafeStatus: CafeStatus;
  allowContentCustomization: boolean;
  settings: RestaurantSettings;
  contentOverrides?: AppContentOverrides;
  categories: MenuCategory[];
  items: MenuItem[];
  tables: TableInfo[];
  generalQrScans?: number;
}

export interface OrderNoteItem {
  item: MenuItem;
  quantity: number;
  note?: string;
}

export interface CafeSummary {
  id: string;
  slug: string;
  status: CafeStatus;
  allowContentCustomization: boolean;
  landingTemplate: LandingTemplateId;
  nameFa: string;
  nameEn: string;
  ownerName: string;
  ownerPhone: string;
  tableCount: number;
  itemsCount: number;
  occupiedTablesCount: number;
  createdAt: string;
  approvedAt?: string;
}

export interface PublicCafeOption {
  slug: string;
  nameFa: string;
  nameEn: string;
}

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';

export interface CustomerOrderItem {
  itemId: string;
  nameFa: string;
  unitPrice: number;
  quantity: number;
  note?: string;
}

export interface CustomerOrder {
  id: string;
  orderNumber: string;
  tableNumber: number | null;
  customerNote?: string;
  items: CustomerOrderItem[];
  subtotal: number;
  serviceFee: number;
  total: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface LiveTrayItem {
  itemId: string;
  nameFa: string;
  unitPrice: number;
  quantity: number;
  note?: string;
}

export interface LiveTableTray {
  sessionId: string;
  tableNumber: number | null;
  items: LiveTrayItem[];
  itemCount: number;
  subtotal: number;
  customerNote?: string;
  startedAt: string;
  updatedAt: string;
}

export interface LiveTableMonitorEntry {
  tableNumber: number | null;
  label: string;
  capacity: number;
  tableStatus: TableStatus;
  guestsCount: number;
  liveTrays: LiveTableTray[];
  activeOrders: CustomerOrder[];
  hasActiveTray: boolean;
  liveItemsCount: number;
  activeOrdersCount: number;
  estimatedTotal: number;
  lastActivityAt?: string;
}

export interface LiveTableMonitorResponse {
  tables: LiveTableMonitorEntry[];
  takeaway: LiveTableMonitorEntry | null;
  stats: {
    totalTables: number;
    activeTablesCount: number;
    liveBrowsingCount: number;
    pendingOrdersCount: number;
    readyOrdersCount: number;
  };
  updatedAt: string;
}


