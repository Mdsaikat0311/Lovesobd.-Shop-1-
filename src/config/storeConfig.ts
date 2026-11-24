export type WooConnectionMode = 'wc_bridge' | 'custom_endpoint' | 'wc_rest_api';

export interface StoreConfig {
  brandName: string;
  contactPhone: string;
  whatsappNumber: string;
  product: {
    id: number;
    sku: string;
    name: string;
    bengaliTitle: string;
    regularPrice: number;
    offerPrice: number;
    twoSetOfferPrice: number;
    currency: string;
  };
  shipping: {
    insideDhaka: number;
    outsideDhaka: number;
  };
  woocommerce: {
    /**
     * Leave empty ('') when uploading `dist/` directly onto your WordPress domain
     * (it automatically calls `./wc-bridge.php` inside the uploaded folder).
     * Or set your WordPress URL, e.g. 'https://zxbazar.com'
     */
    wpSiteUrl: string;
    mode: WooConnectionMode;
    /** Automatic PHP bridge included in `dist/wc-bridge.php` */
    bridgePath: string;
    /** Custom WP REST route path (if using functions.php snippet instead of wc-bridge.php) */
    customEndpointPath: string;
    /** Only needed if mode === 'wc_rest_api' */
    consumerKey: string;
    consumerSecret: string;
  };
  pixel: {
    /** Your Meta (Facebook) Pixel ID, e.g. '123456789012345' */
    pixelId: string;
  };
}

export const DEFAULT_STORE_CONFIG: StoreConfig = {
  brandName: 'LovesoBD',
  contactPhone: '01954-605031',
  whatsappNumber: '8801954605031',
  product: {
    id: 36962,
    sku: 'Butterfly-2',
    name: 'Butterfly Luxury Jewelry Set',
    bengaliTitle: 'Butterfly Luxury Jewellery Combo (৩-পিস গিফট সেট)',
    regularPrice: 1190,
    offerPrice: 790,
    twoSetOfferPrice: 1480,
    currency: 'BDT',
  },
  shipping: {
    insideDhaka: 70,
    outsideDhaka: 110,
  },
  woocommerce: {
    wpSiteUrl: '',
    mode: 'wc_bridge',
    bridgePath: './wc-bridge.php',
    customEndpointPath: '/wp-json/zxgift/v1/order',
    consumerKey: '',
    consumerSecret: '',
  },
  pixel: {
    pixelId: '',
  },
};

const STORAGE_KEY = 'auragift_store_settings_v2';

export interface EditableIntegrationSettings {
  wpSiteUrl: string;
  mode: WooConnectionMode;
  productId: number;
  sku: string;
  consumerKey: string;
  consumerSecret: string;
  pixelId: string;
  insideDhakaShipping: number;
  outsideDhakaShipping: number;
}

export function getActiveStoreConfig(): StoreConfig {
  const base = structuredClone(DEFAULT_STORE_CONFIG);

  if (typeof window === 'undefined') {
    return base;
  }

  try {
    const params = new URLSearchParams(window.location.search);
    const urlPixel = params.get('pixel_id');

    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Partial<EditableIntegrationSettings>;
      if (typeof saved.wpSiteUrl === 'string') base.woocommerce.wpSiteUrl = saved.wpSiteUrl.trim();
      if (
        saved.mode === 'wc_bridge' ||
        saved.mode === 'custom_endpoint' ||
        saved.mode === 'wc_rest_api'
      ) {
        base.woocommerce.mode = saved.mode;
      }
      if (typeof saved.productId === 'number' && saved.productId > 0) {
        base.product.id = saved.productId;
      }
      if (typeof saved.sku === 'string' && saved.sku.trim()) {
        base.product.sku = saved.sku.trim();
      }
      if (typeof saved.consumerKey === 'string') {
        base.woocommerce.consumerKey = saved.consumerKey.trim();
      }
      if (typeof saved.consumerSecret === 'string') {
        base.woocommerce.consumerSecret = saved.consumerSecret.trim();
      }
      if (typeof saved.pixelId === 'string') {
        base.pixel.pixelId = saved.pixelId.trim();
      }
      if (typeof saved.insideDhakaShipping === 'number' && saved.insideDhakaShipping >= 0) {
        base.shipping.insideDhaka = saved.insideDhakaShipping;
      }
      if (typeof saved.outsideDhakaShipping === 'number' && saved.outsideDhakaShipping >= 0) {
        base.shipping.outsideDhaka = saved.outsideDhakaShipping;
      }
    }

    if (urlPixel && /^\d{8,20}$/.test(urlPixel.trim())) {
      base.pixel.pixelId = urlPixel.trim();
    }
  } catch {
    // Ignore malformed localStorage entries
  }

  return base;
}

export function saveIntegrationSettings(settings: EditableIntegrationSettings): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function resetIntegrationSettings(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}
