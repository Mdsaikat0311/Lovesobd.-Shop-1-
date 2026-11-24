declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: (...args: unknown[]) => void;
  }
}

let initializedPixelId: string | null = null;

export function initPixel(pixelId: string): boolean {
  const cleanId = pixelId.trim();
  if (typeof window === 'undefined' || !cleanId || !/^\d{5,22}$/.test(cleanId)) {
    return false;
  }

  if (initializedPixelId === cleanId) {
    return true;
  }

  if (!window.fbq) {
    const fbqFn = function (...args: unknown[]) {
      const self = fbqFn as unknown as {
        callMethod?: (...a: unknown[]) => void;
        queue: unknown[][];
      };
      if (self.callMethod) {
        self.callMethod(...args);
      } else {
        self.queue.push(args);
      }
    } as unknown as ((...args: unknown[]) => void) & {
      callMethod?: (...a: unknown[]) => void;
      queue: unknown[][];
      push: (...args: unknown[]) => void;
      loaded: boolean;
      version: string;
    };

    fbqFn.push = fbqFn;
    fbqFn.loaded = true;
    fbqFn.version = '2.0';
    fbqFn.queue = [];
    window.fbq = fbqFn;
    if (!window._fbq) window._fbq = fbqFn;

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    const firstScript = document.getElementsByTagName('script')[0];
    firstScript?.parentNode?.insertBefore(script, firstScript);
  }

  window.fbq('init', cleanId);
  window.fbq('track', 'PageView');
  initializedPixelId = cleanId;
  return true;
}

export function trackViewContent(params: {
  pixelId: string;
  productId: string;
  productName: string;
  value: number;
  currency: string;
}): void {
  if (!initPixel(params.pixelId) || !window.fbq) return;
  window.fbq('track', 'ViewContent', {
    content_ids: [params.productId],
    content_name: params.productName,
    content_type: 'product',
    value: params.value,
    currency: params.currency,
  });
}

export function trackInitiateCheckout(params: {
  pixelId: string;
  productId: string;
  productName: string;
  value: number;
  numItems: number;
  currency: string;
}): void {
  if (!initPixel(params.pixelId) || !window.fbq) return;
  window.fbq('track', 'InitiateCheckout', {
    content_ids: [params.productId],
    content_name: params.productName,
    content_type: 'product',
    value: params.value,
    num_items: params.numItems,
    currency: params.currency,
  });
}

export function trackPurchase(params: {
  pixelId: string;
  productId: string;
  productName: string;
  value: number;
  numItems: number;
  currency: string;
  orderId: string;
}): void {
  if (!initPixel(params.pixelId) || !window.fbq) return;
  window.fbq(
    'track',
    'Purchase',
    {
      content_ids: [params.productId],
      content_name: params.productName,
      content_type: 'product',
      value: params.value,
      num_items: params.numItems,
      currency: params.currency,
    },
    { eventID: `order_${params.orderId}` }
  );
}
