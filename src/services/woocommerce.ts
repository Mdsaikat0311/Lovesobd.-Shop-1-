import { getActiveStoreConfig } from '../config/storeConfig';

export type DeliveryZone = 'dhaka' | 'outside';

export interface OrderInput {
  fullName: string;
  phone: string;
  address: string;
  zone: DeliveryZone;
  quantity: number;
  giftNote?: string;
}

export interface OrderResult {
  success: boolean;
  mode: 'woocommerce_live' | 'preview_only';
  orderNumber: string;
  orderId: string;
  total: number;
  subtotal: number;
  shippingCost: number;
  message: string;
  errorMessage?: string;
}

export interface RecentWooOrder {
  id: string;
  customerName: string;
  productName: string;
}

export interface AttributionData {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  fbclid?: string;
  landing_url?: string;
}

export function captureAttribution(): AttributionData {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  const data: AttributionData = {
    landing_url: window.location.href,
  };
  const keys: Array<keyof AttributionData> = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_content',
    'utm_term',
    'fbclid',
  ];
  for (const key of keys) {
    const val = params.get(key);
    if (val) data[key] = val;
  }
  return data;
}

export function calculateTotals(quantity: number, zone: DeliveryZone) {
  const cfg = getActiveStoreConfig();
  const unitSubtotal =
    quantity === 2
      ? cfg.product.twoSetOfferPrice
      : quantity * cfg.product.offerPrice;
  const shippingCost =
    zone === 'dhaka' ? cfg.shipping.insideDhaka : cfg.shipping.outsideDhaka;
  return {
    subtotal: unitSubtotal,
    shippingCost,
    total: unitSubtotal + shippingCost,
  };
}

function resolveWordPressBaseUrl(configuredUrl: string): string {
  const clean = configuredUrl.trim().replace(/\/+$/, '');
  if (clean) return clean;
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
}

function isLocalOrPreviewOrigin(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.endsWith('.run.app') ||
    host.endsWith('.web.app')
  );
}

export async function submitWooCommerceOrder(
  input: OrderInput
): Promise<OrderResult> {
  const cfg = getActiveStoreConfig();
  const { subtotal, shippingCost, total } = calculateTotals(
    input.quantity,
    input.zone
  );
  const attribution = captureAttribution();
  const baseUrl = resolveWordPressBaseUrl(cfg.woocommerce.wpSiteUrl);
  const hasExplicitWpUrl = Boolean(cfg.woocommerce.wpSiteUrl.trim());

  // 1. Direct WooCommerce REST API v3 mode (when Consumer Key & Secret are configured)
  if (cfg.woocommerce.mode === 'wc_rest_api') {
    if (!cfg.woocommerce.consumerKey || !cfg.woocommerce.consumerSecret) {
      return {
        success: false,
        mode: 'preview_only',
        orderId: '',
        orderNumber: '',
        subtotal,
        shippingCost,
        total,
        message: '',
        errorMessage:
          'WooCommerce Consumer Key ও Consumer Secret সেট করা নেই। Setup থেকে কী যোগ করুন অথবা Custom Endpoint মোড ব্যবহার করুন।',
      };
    }

    const nameParts = input.fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || input.fullName.trim();
    const lastName = nameParts.slice(1).join(' ') || '.';
    const city = input.zone === 'dhaka' ? 'Dhaka' : 'Outside Dhaka';

    const payload = {
      payment_method: 'cod',
      payment_method_title: 'Cash on delivery',
      set_paid: false,
      status: 'processing',
      billing: {
        first_name: firstName,
        last_name: lastName,
        address_1: input.address.trim(),
        city,
        country: 'BD',
        phone: input.phone.trim(),
      },
      shipping: {
        first_name: firstName,
        last_name: lastName,
        address_1: input.address.trim(),
        city,
        country: 'BD',
      },
      line_items: [
        {
          product_id: cfg.product.id,
          quantity: input.quantity,
          total: String(subtotal),
          subtotal: String(subtotal),
        },
      ],
      shipping_lines:
        shippingCost > 0
          ? [
              {
                method_id: 'flat_rate',
                method_title:
                  input.zone === 'dhaka' ? 'Inside Dhaka' : 'Outside Dhaka',
                total: String(shippingCost),
              },
            ]
          : [
              {
                method_id: 'free_shipping',
                method_title: 'Free Shipping',
                total: '0',
              },
            ],
      customer_note: input.giftNote?.trim()
        ? `Gift Note: ${input.giftNote.trim()}`
        : '',
      meta_data: Object.entries(attribution)
        .filter(([, v]) => Boolean(v))
        .map(([key, value]) => ({ key: `_zxgift_${key}`, value: String(value) })),
    };

    try {
      const auth = btoa(
        `${cfg.woocommerce.consumerKey}:${cfg.woocommerce.consumerSecret}`
      );
      const res = await fetch(`${baseUrl}/wp-json/wc/v3/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify(payload),
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('WordPress WooCommerce API JSON রেসপন্স দেয়নি।');
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data?.message || `WooCommerce Error (${res.status})`
        );
      }

      return {
        success: true,
        mode: 'woocommerce_live',
        orderId: String(data.id),
        orderNumber: String(data.number || data.id),
        subtotal,
        shippingCost,
        total,
        message: 'আপনার অর্ডারটি সফলভাবে WooCommerce-এ সম্পন্ন হয়েছে।',
      };
    } catch (err) {
      return {
        success: false,
        mode: 'woocommerce_live',
        orderId: '',
        orderNumber: '',
        subtotal,
        shippingCost,
        total,
        message: '',
        errorMessage:
          err instanceof Error
            ? err.message
            : 'অর্ডার সাবমিট করতে সমস্যা হয়েছে। অনুগ্রহ করে কল বা হোয়াটসঅ্যাপে যোগাযোগ করুন।',
      };
    }
  }

  // 2. Automatic PHP Bridge mode (`./wc-bridge.php` inside uploaded dist folder)
  //    or Custom WordPress REST Endpoint (`/wp-json/zxgift/v1/order`)
  const bridgeUrl = hasExplicitWpUrl
    ? `${baseUrl}/wc-bridge.php`
    : cfg.woocommerce.bridgePath;
  const restEndpointUrl = `${baseUrl}${cfg.woocommerce.customEndpointPath}`;

  if (!hasExplicitWpUrl && isLocalOrPreviewOrigin()) {
    const previewNum = `PREVIEW-${Math.floor(1000 + Math.random() * 9000)}`;
    return {
      success: true,
      mode: 'preview_only',
      orderId: previewNum,
      orderNumber: previewNum,
      subtotal,
      shippingCost,
      total,
      message:
        'প্রিভিউ মোডে অর্ডার ফর্ম যাচাই সফল হয়েছে। npm run build দিয়ে তৈরি dist ফোল্ডারটি WordPress-এ আপলোড করলেই অর্ডার সরাসরি WooCommerce-এ চলে যাবে।',
    };
  }

  const orderBody = JSON.stringify({
    product_id: cfg.product.id,
    product_sku: cfg.product.sku,
    product_name: cfg.product.name,
    quantity: input.quantity,
    subtotal,
    shipping_cost: shippingCost,
    total,
    zone: input.zone,
    customer_name: input.fullName.trim(),
    customer_phone: input.phone.trim(),
    customer_address: input.address.trim(),
    gift_note: input.giftNote?.trim() || '',
    attribution,
  });

  const targetUrls =
    cfg.woocommerce.mode === 'wc_bridge'
      ? [bridgeUrl, restEndpointUrl]
      : [restEndpointUrl, bridgeUrl];

  let lastError =
    'WordPress WooCommerce Bridge-এর সাথে সংযোগ পাওয়া যায়নি। ফোল্ডারটি WordPress public_html-এর ভেতরে আছে কিনা যাচাই করুন।';

  for (const targetUrl of targetUrls) {
    try {
      const res = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: orderBody,
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        continue;
      }

      const data = await res.json();
      if (!res.ok || !data?.success) {
        lastError = data?.message || `WordPress অর্ডার ত্রুটি (${res.status})`;
        continue;
      }

      return {
        success: true,
        mode: 'woocommerce_live',
        orderId: String(data.order_id),
        orderNumber: String(data.order_number || data.order_id),
        subtotal,
        shippingCost,
        total: Number(data.total || total),
        message: 'আপনার অর্ডারটি সফলভাবে WooCommerce-এ কনফার্ম হয়েছে!',
      };
    } catch (err) {
      if (err instanceof Error && err.message) {
        lastError = err.message;
      }
    }
  }

  return {
    success: false,
    mode: 'woocommerce_live',
    orderId: '',
    orderNumber: '',
    subtotal,
    shippingCost,
    total,
    message: '',
    errorMessage: lastError,
  };
}

export async function fetchRecentWooOrders(): Promise<RecentWooOrder[]> {
  const cfg = getActiveStoreConfig();
  const baseUrl = resolveWordPressBaseUrl(cfg.woocommerce.wpSiteUrl);
  const hasExplicitWpUrl = Boolean(cfg.woocommerce.wpSiteUrl.trim());

  if (cfg.woocommerce.mode === 'wc_rest_api') {
    if (!cfg.woocommerce.consumerKey || !cfg.woocommerce.consumerSecret) {
      return [];
    }
    try {
      const auth = btoa(
        `${cfg.woocommerce.consumerKey}:${cfg.woocommerce.consumerSecret}`
      );
      const res = await fetch(
        `${baseUrl}/wp-json/wc/v3/orders?per_page=10&orderby=date&order=desc`,
        {
          headers: {
            Authorization: `Basic ${auth}`,
          },
        }
      );
      const contentType = res.headers.get('content-type') || '';
      if (!res.ok || !contentType.includes('application/json')) return [];
      const data = await res.json();
      if (!Array.isArray(data)) return [];
      return data
        .map((order: { id?: number | string; billing?: { first_name?: string; last_name?: string }; line_items?: Array<{ name?: string }> }) => {
          const fullName = [
            order.billing?.first_name,
            order.billing?.last_name,
          ]
            .filter(Boolean)
            .join(' ')
            .replace(/\s*\.\s*$/, '')
            .trim();
          const productName =
            order.line_items?.[0]?.name?.trim() || cfg.product.name;
          return {
            id: String(order.id ?? ''),
            customerName: fullName,
            productName,
          };
        })
        .filter((item) => item.customerName.length > 0);
    } catch {
      return [];
    }
  }

  if (!hasExplicitWpUrl && isLocalOrPreviewOrigin()) {
    return [];
  }

  const bridgeRecentUrl = `${
    hasExplicitWpUrl ? `${baseUrl}/wc-bridge.php` : cfg.woocommerce.bridgePath
  }?action=recent-orders`;
  const restRecentUrl = `${baseUrl}/wp-json/zxgift/v1/recent-orders`;
  const urls =
    cfg.woocommerce.mode === 'wc_bridge'
      ? [bridgeRecentUrl, restRecentUrl]
      : [restRecentUrl, bridgeRecentUrl];

  for (const url of urls) {
    try {
      const res = await fetch(url);
      const contentType = res.headers.get('content-type') || '';
      if (!res.ok || !contentType.includes('application/json')) continue;
      const data = await res.json();
      if (!data?.success || !Array.isArray(data.orders)) continue;
      return data.orders
        .map((item: { id?: string | number; customer_name?: string; product_name?: string }) => ({
          id: String(item.id ?? ''),
          customerName: String(item.customer_name ?? '').trim(),
          productName: String(item.product_name ?? cfg.product.name).trim(),
        }))
        .filter((item: RecentWooOrder) => item.customerName.length > 0);
    } catch {
      // Try fallback endpoint
    }
  }

  return [];
}

export async function testWooCommerceBridge(): Promise<{
  ok: boolean;
  detail: string;
}> {
  const cfg = getActiveStoreConfig();
  const baseUrl = resolveWordPressBaseUrl(cfg.woocommerce.wpSiteUrl);
  const hasExplicitWpUrl = Boolean(cfg.woocommerce.wpSiteUrl.trim());

  if (!hasExplicitWpUrl && isLocalOrPreviewOrigin()) {
    return {
      ok: false,
      detail:
        'এটি প্রিভিউ এনভায়রনমেন্ট। লাইভ ব্রিজ টেস্ট করতে আপনার WordPress URL দিন অথবা dist ফোল্ডার WordPress-এ আপলোড করে খুলুন।',
    };
  }

  const bridgeUrl = `${
    hasExplicitWpUrl ? `${baseUrl}/wc-bridge.php` : cfg.woocommerce.bridgePath
  }?action=health&product_id=${cfg.product.id}&sku=${encodeURIComponent(cfg.product.sku)}`;

  try {
    const res = await fetch(bridgeUrl);
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return {
        ok: false,
        detail:
          'wc-bridge.php পাওয়া যায়নি বা PHP রান হচ্ছে না। নিশ্চিত করুন ফোল্ডারটি WordPress-এর public_html-এর ভেতরে আপলোড হয়েছে।',
      };
    }
    const data = await res.json();
    if (!res.ok || !data?.success) {
      return {
        ok: false,
        detail: data?.message || 'Bridge সংযোগ ব্যর্থ হয়েছে।',
      };
    }
    return {
      ok: true,
      detail: data.product_found
        ? `সংযুক্ত: ${data.site_name || 'WordPress'} · প্রোডাক্ট পাওয়া গেছে (${data.matched_product})`
        : `সংযুক্ত: ${data.site_name || 'WordPress'} · WooCommerce সচল আছে (নতুন অর্ডার অটোমেটিক তৈরি হবে)`,
    };
  } catch (err) {
    return {
      ok: false,
      detail:
        err instanceof Error
          ? err.message
          : 'Bridge পরীক্ষা করতে সমস্যা হয়েছে।',
    };
  }
}

export const WORDPRESS_PHP_SNIPPET = `<?php
/**
 * AuraGift — Direct WooCommerce Order Receiver & Live Order Feed for Static Dist Landing Pages
 * Paste this snippet into your WordPress Theme's functions.php (or Code Snippets plugin).
 */
add_action('rest_api_init', function () {
  register_rest_route('zxgift/v1', '/order', array(
    'methods'             => array('POST', 'OPTIONS'),
    'callback'            => 'zxgift_create_woocommerce_order',
    'permission_callback' => '__return_true',
  ));

  register_rest_route('zxgift/v1', '/recent-orders', array(
    'methods'             => array('GET', 'OPTIONS'),
    'callback'            => 'zxgift_get_recent_woocommerce_orders',
    'permission_callback' => '__return_true',
  ));
});

// Enable CORS if dist is hosted on a separate domain/subdomain
add_action('rest_api_init', function () {
  remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');
  add_filter('rest_pre_serve_request', function ($value) {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    return $value;
  });
}, 15);

function zxgift_create_woocommerce_order(WP_REST_Request $request) {
  if (!function_exists('wc_create_order')) {
    return new WP_REST_Response(array(
      'success' => false,
      'message' => 'WooCommerce is not active on this WordPress site.'
    ), 500);
  }

  $params   = $request->get_json_params();
  $name     = sanitize_text_field($params['customer_name'] ?? '');
  $phone    = sanitize_text_field($params['customer_phone'] ?? '');
  $address  = sanitize_textarea_field($params['customer_address'] ?? '');
  $zone     = sanitize_text_field($params['zone'] ?? 'dhaka');
  $giftNote = sanitize_textarea_field($params['gift_note'] ?? '');
  $qty      = max(1, intval($params['quantity'] ?? 1));
  $prodId   = intval($params['product_id'] ?? 36962);
  $prodSku  = sanitize_text_field($params['product_sku'] ?? 'Butterfly-2');
  $subtotal = floatval($params['subtotal'] ?? 790);
  $shipping = floatval($params['shipping_cost'] ?? 0);

  if (empty($name) || empty($phone) || empty($address)) {
    return new WP_REST_Response(array(
      'success' => false,
      'message' => 'Name, phone, and address are required.'
    ), 400);
  }

  try {
    $order = wc_create_order(array('status' => 'processing'));

    // Find product by ID first, then fallback to SKU
    $product = wc_get_product($prodId);
    if (!$product && !empty($prodSku)) {
      $found_id = wc_get_product_id_by_sku($prodSku);
      if ($found_id) $product = wc_get_product($found_id);
    }

    if ($product) {
      $order->add_product($product, $qty, array(
        'subtotal' => $subtotal,
        'total'    => $subtotal,
      ));
    } else {
      $item = new WC_Order_Item_Product();
      $item->set_name(sanitize_text_field($params['product_name'] ?? 'Butterfly Luxury Jewelry Set'));
      $item->set_quantity($qty);
      $item->set_subtotal($subtotal);
      $item->set_total($subtotal);
      $order->add_item($item);
    }

    $parts = preg_split('/\\s+/', $name, 2);
    $billing = array(
      'first_name' => $parts[0] ?? $name,
      'last_name'  => $parts[1] ?? '',
      'address_1'  => $address,
      'city'       => ($zone === 'dhaka') ? 'Dhaka' : 'Outside Dhaka',
      'country'    => 'BD',
      'phone'      => $phone,
    );

    $order->set_address($billing, 'billing');
    $order->set_address($billing, 'shipping');
    $order->set_payment_method('cod');
    $order->set_payment_method_title('Cash on delivery');

    $ship_item = new WC_Order_Item_Shipping();
    $ship_item->set_method_title($shipping > 0 ? 'Delivery Charge' : 'Free Shipping');
    $ship_item->set_total($shipping);
    $order->add_item($ship_item);

    if (!empty($giftNote)) {
      $order->set_customer_note('Gift Card Note: ' . $giftNote);
      $order->update_meta_data('_gift_note', $giftNote);
    }

    if (!empty($params['attribution']) && is_array($params['attribution'])) {
      foreach ($params['attribution'] as $k => $v) {
        $order->update_meta_data('_zxgift_' . sanitize_key($k), sanitize_text_field($v));
      }
    }

    $order->calculate_totals();
    $order->save();

    return new WP_REST_Response(array(
      'success'      => true,
      'order_id'     => $order->get_id(),
      'order_number' => $order->get_order_number(),
      'total'        => $order->get_total(),
    ), 200);
  } catch (Exception $e) {
    return new WP_REST_Response(array(
      'success' => false,
      'message' => $e->getMessage(),
    ), 500);
  }
}

function zxgift_get_recent_woocommerce_orders() {
  if (!function_exists('wc_get_orders')) {
    return new WP_REST_Response(array('success' => false, 'orders' => array()), 200);
  }

  $orders = wc_get_orders(array(
    'limit'   => 10,
    'orderby' => 'date',
    'order'   => 'DESC',
    'status'  => array('processing', 'completed', 'on-hold', 'pending'),
  ));

  $result = array();
  foreach ($orders as $order) {
    $first = trim($order->get_billing_first_name());
    $last  = trim($order->get_billing_last_name());
    $name  = trim($first . ($last && $last !== '.' ? ' ' . $last : ''));
    if (empty($name)) continue;

    $product_name = 'Butterfly Luxury Jewelry Set';
    foreach ($order->get_items() as $item) {
      $product_name = $item->get_name();
      break;
    }

    $result[] = array(
      'id'            => $order->get_order_number(),
      'customer_name' => sanitize_text_field($name),
      'product_name'  => sanitize_text_field($product_name),
    );
  }

  return new WP_REST_Response(array(
    'success' => true,
    'orders'  => $result,
  ), 200);
}`;
