# WordPress + WooCommerce Bridge ও Meta Pixel সেটআপ গাইড

আপনি `npm run build` করে পাওয়া `dist/` ফোল্ডারটি সরাসরি আপনার WordPress সাইটের `public_html/`-এর ভেতরে যেকোনো ফোল্ডারে (যেমন `public_html/wp-content/landing-pages/butterfly/` অথবা `public_html/jewellery-combo/`) আপলোড করলেই অর্ডার সরাসরি **WooCommerce → Orders**-এ চলে যাবে।

## কীভাবে স্বয়ংক্রিয় WooCommerce Bridge (`wc-bridge.php`) কাজ করে?
- `npm run build` চালালে `dist/` ফোল্ডারের ভেতরে `index.html` ও `assets/`-এর সাথে **`wc-bridge.php`** ফাইলটিও স্বয়ংক্রিয়ভাবে তৈরি হয়ে যায়।
- কোনো API Key বা `functions.php` এডিট করার প্রয়োজন নেই।
- কাস্টমার অর্ডার কনফার্ম করলেই `wc-bridge.php` নিজে থেকে WordPress-এর `wp-load.php` খুঁজে বের করে এবং সরাসরি `wc_create_order()` দিয়ে **WooCommerce → Orders**-এ Cash on Delivery অর্ডার তৈরি করে দেয়।
- একই সাথে `wc-bridge.php?action=recent-orders` থেকে লাইভ WooCommerce অর্ডারগুলো নিয়ে পেজের নিচের ৫-সেকেন্ড পপআপে প্রদর্শন করে।

## ধাপ ১: প্রোডাক্ট ও পিক্সেল কনফিগার করুন (ঐচ্ছিক)
`src/config/storeConfig.ts` ফাইলে আপনার তথ্য বসান:
- `product.id`: আপনার WooCommerce প্রোডাক্ট ID (যেমন `36962`)
- `product.sku`: প্রোডাক্ট SKU (যেমন `Butterfly-2`)
- `pixel.pixelId`: আপনার Meta (Facebook) Pixel ID

*(নোট: WooCommerce প্রোডাক্ট ID না মিললেও Bridge অটোমেটিক প্রোডাক্টের নাম ও দাম দিয়ে অর্ডার তৈরি করে ফেলবে, তাই কোনো অর্ডার মিস হবে না।)*

## ধাপ ২: বিল্ড ও WordPress-এ আপলোড
1. টার্মিনালে চালান:
   ```bash
   npm run build
   ```
2. `dist/` ফোল্ডারের ভেতরের সব ফাইল (`index.html`, `wc-bridge.php`, `assets/`) আপনার cPanel File Manager দিয়ে `public_html/`-এর ভেতরে পছন্দের ফোল্ডারে আপলোড করুন:
   উদাহরণ: `public_html/wp-content/landing/jewellery-combo/` অথবা `public_html/jewellery-combo/`
3. এখন ব্রাউজারে ওই ফোল্ডারের লিংকে গিয়ে অর্ডার করলেই অর্ডার সরাসরি আপনার **WooCommerce → Orders** প্যানেলে চলে আসবে।
