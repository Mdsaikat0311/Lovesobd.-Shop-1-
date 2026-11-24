<?php
/**
 * AuraGift — Automatic WooCommerce Order Bridge (wc-bridge.php)
 *
 * Included automatically inside `dist/` when you run `npm run build`.
 * Upload the `dist/` folder contents anywhere inside your WordPress `public_html/`
 * (e.g., `public_html/jewellery-combo/` or `public_html/wp-content/landing/jewellery/`).
 * This bridge automatically locates `wp-load.php` and creates real WooCommerce orders.
 */

@ini_set('display_errors', '0');
error_reporting(0);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(200);
  echo json_encode(array('success' => true));
  exit;
}

function zxgift_send_json($data, $status = 200) {
  while (ob_get_level() > 0) {
    @ob_end_clean();
  }
  http_response_code($status);
  echo json_encode($data, JSON_UNESCAPED_UNICODE);
  exit;
}

function zxgift_find_wp_load() {
  $dir = __DIR__;
  for ($i = 0; $i < 8; $i++) {
    $candidate = $dir . DIRECTORY_SEPARATOR . 'wp-load.php';
    if (file_exists($candidate)) {
      return $candidate;
    }
    $parent = dirname($dir);
    if ($parent === $dir) {
      break;
    }
    $dir = $parent;
  }

  if (!empty($_SERVER['DOCUMENT_ROOT'])) {
    $docRootCandidate = rtrim($_SERVER['DOCUMENT_ROOT'], '/\\') . DIRECTORY_SEPARATOR . 'wp-load.php';
    if (file_exists($docRootCandidate)) {
      return $docRootCandidate;
    }
  }

  return null;
}

$wp_load = zxgift_find_wp_load();
if (!$wp_load) {
  zxgift_send_json(array(
    'success' => false,
    'message' => 'WordPress wp-load.php পাওয়া যায়নি। দয়া করে ফোল্ডারটি আপনার WordPress public_html ডিরেক্টরির ভেতরে আপলোড করুন।',
  ), 500);
}

define('WP_USE_THEMES', false);
define('DONOTCACHEPAGE', true);

ob_start();
require_once $wp_load;
ob_end_clean();

if (!function_exists('wc_create_order') || !function_exists('wc_get_orders')) {
  zxgift_send_json(array(
    'success' => false,
    'message' => 'এই WordPress সাইটে WooCommerce প্লাগইন অ্যাক্টিভ নেই।',
  ), 500);
}

$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? sanitize_key($_GET['action']) : '';

// 1. Health Check Endpoint: GET wc-bridge.php?action=health
if ($method === 'GET' && $action === 'health') {
  $prodId  = isset($_GET['product_id']) ? intval($_GET['product_id']) : 0;
  $prodSku = isset($_GET['sku']) ? sanitize_text_field($_GET['sku']) : '';
  $product = $prodId > 0 ? wc_get_product($prodId) : false;
  if (!$product && !empty($prodSku)) {
    $foundId = wc_get_product_id_by_sku($prodSku);
    if ($foundId) {
      $product = wc_get_product($foundId);
    }
  }

  zxgift_send_json(array(
    'success'            => true,
    'woocommerce_active' => true,
    'site_name'          => get_bloginfo('name'),
    'product_found'      => (bool) $product,
    'matched_product'    => $product ? $product->get_name() : null,
  ), 200);
}

// 2. Recent Orders Feed for Live Popup: GET wc-bridge.php?action=recent-orders
if ($method === 'GET' && $action === 'recent-orders') {
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
    if (empty($name)) {
      continue;
    }

    $product_name = 'Butterfly Luxury Jewelry Set';
    foreach ($order->get_items() as $item) {
      $product_name = $item->get_name();
      break;
    }

    $result[] = array(
      'id'            => (string) $order->get_order_number(),
      'customer_name' => sanitize_text_field($name),
      'product_name'  => sanitize_text_field($product_name),
    );
  }

  zxgift_send_json(array(
    'success' => true,
    'orders'  => $result,
  ), 200);
}

// 3. Create WooCommerce Order: POST wc-bridge.php
if ($method === 'POST') {
  $rawBody = file_get_contents('php://input');
  $params  = json_decode($rawBody, true);
  if (!is_array($params)) {
    $params = $_POST;
  }

  $name     = sanitize_text_field($params['customer_name'] ?? '');
  $phone    = sanitize_text_field($params['customer_phone'] ?? '');
  $address  = sanitize_textarea_field($params['customer_address'] ?? '');
  $zone     = sanitize_text_field($params['zone'] ?? 'dhaka');
  $giftNote = sanitize_textarea_field($params['gift_note'] ?? '');
  $qty      = max(1, intval($params['quantity'] ?? 1));
  $prodId   = intval($params['product_id'] ?? 36962);
  $prodSku  = sanitize_text_field($params['product_sku'] ?? 'Butterfly-2');
  $prodName = sanitize_text_field($params['product_name'] ?? 'Butterfly Luxury Jewelry Set');
  $subtotal = max(0, floatval($params['subtotal'] ?? 790));
  $shipping = max(0, floatval($params['shipping_cost'] ?? 0));

  if (empty($name) || empty($phone) || empty($address)) {
    zxgift_send_json(array(
      'success' => false,
      'message' => 'অর্ডার করতে নাম, মোবাইল নম্বর এবং সম্পূর্ণ ঠিকানা আবশ্যক।',
    ), 400);
  }

  try {
    $order = wc_create_order(array('status' => 'processing'));
    if (is_wp_error($order)) {
      throw new Exception($order->get_error_message());
    }

    // Match existing WooCommerce product by ID first, then SKU, or create safe custom item
    $product = $prodId > 0 ? wc_get_product($prodId) : false;
    if (!$product && !empty($prodSku)) {
      $found_id = wc_get_product_id_by_sku($prodSku);
      if ($found_id) {
        $product = wc_get_product($found_id);
      }
    }

    if ($product) {
      $order->add_product($product, $qty, array(
        'subtotal' => $subtotal,
        'total'    => $subtotal,
      ));
    } else {
      $item = new WC_Order_Item_Product();
      $item->set_name($prodName);
      $item->set_quantity($qty);
      $item->set_subtotal($subtotal);
      $item->set_total($subtotal);
      $order->add_item($item);
    }

    $parts = preg_split('/\s+/', $name, 2);
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
        $cleanKey = sanitize_key($k);
        if (!empty($cleanKey) && !empty($v)) {
          $order->update_meta_data('_zxgift_' . $cleanKey, sanitize_text_field((string) $v));
        }
      }
    }

    $order->update_meta_data('_zxgift_source', 'wc-bridge.php');
    $order->calculate_totals();
    $order->save();

    zxgift_send_json(array(
      'success'      => true,
      'order_id'     => (string) $order->get_id(),
      'order_number' => (string) $order->get_order_number(),
      'total'        => (float) $order->get_total(),
    ), 200);
  } catch (Exception $e) {
    zxgift_send_json(array(
      'success' => false,
      'message' => $e->getMessage(),
    ), 500);
  }
}

zxgift_send_json(array(
  'success' => false,
  'message' => 'Invalid bridge request.',
), 400);
