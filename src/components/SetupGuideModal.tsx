import { useState } from 'react';
import { X, Copy, Check, RotateCcw, Activity } from 'lucide-react';
import {
  EditableIntegrationSettings,
  getActiveStoreConfig,
  resetIntegrationSettings,
  saveIntegrationSettings,
  WooConnectionMode,
} from '../config/storeConfig';
import {
  testWooCommerceBridge,
  WORDPRESS_PHP_SNIPPET,
} from '../services/woocommerce';
import { initPixel } from '../services/pixel';

interface SetupGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved: () => void;
}

export function SetupGuideModal({
  isOpen,
  onClose,
  onConfigSaved,
}: SetupGuideModalProps) {
  const initial = getActiveStoreConfig();
  const [wpSiteUrl, setWpSiteUrl] = useState(initial.woocommerce.wpSiteUrl);
  const [mode, setMode] = useState<WooConnectionMode>(initial.woocommerce.mode);
  const [productId, setProductId] = useState(String(initial.product.id));
  const [sku, setSku] = useState(initial.product.sku);
  const [consumerKey, setConsumerKey] = useState(
    initial.woocommerce.consumerKey
  );
  const [consumerSecret, setConsumerSecret] = useState(
    initial.woocommerce.consumerSecret
  );
  const [pixelId, setPixelId] = useState(initial.pixel.pixelId);
  const [insideDhakaShipping, setInsideDhakaShipping] = useState(
    String(initial.shipping.insideDhaka)
  );
  const [outsideDhakaShipping, setOutsideDhakaShipping] = useState(
    String(initial.shipping.outsideDhaka)
  );
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [bridgeStatus, setBridgeStatus] = useState<{
    ok: boolean;
    detail: string;
  } | null>(null);
  const [testingBridge, setTestingBridge] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: EditableIntegrationSettings = {
      wpSiteUrl: wpSiteUrl.trim(),
      mode,
      productId: Math.max(1, Number(productId) || 36962),
      sku: sku.trim() || 'Butterfly-2',
      consumerKey: consumerKey.trim(),
      consumerSecret: consumerSecret.trim(),
      pixelId: pixelId.trim(),
      insideDhakaShipping: Math.max(0, Number(insideDhakaShipping) || 0),
      outsideDhakaShipping: Math.max(0, Number(outsideDhakaShipping) || 0),
    };
    saveIntegrationSettings(payload);
    if (payload.pixelId) {
      initPixel(payload.pixelId);
    }
    onConfigSaved();
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleReset = () => {
    resetIntegrationSettings();
    const def = getActiveStoreConfig();
    setWpSiteUrl(def.woocommerce.wpSiteUrl);
    setMode(def.woocommerce.mode);
    setProductId(String(def.product.id));
    setSku(def.product.sku);
    setConsumerKey(def.woocommerce.consumerKey);
    setConsumerSecret(def.woocommerce.consumerSecret);
    setPixelId(def.pixel.pixelId);
    setInsideDhakaShipping(String(def.shipping.insideDhaka));
    setOutsideDhakaShipping(String(def.shipping.outsideDhaka));
    setBridgeStatus(null);
    onConfigSaved();
  };

  const handleTestBridge = async () => {
    setTestingBridge(true);
    const result = await testWooCommerceBridge();
    setBridgeStatus(result);
    setTestingBridge(false);
  };

  const handleCopySnippet = async () => {
    try {
      await navigator.clipboard.writeText(WORDPRESS_PHP_SNIPPET);
      setCopiedSnippet(true);
      setTimeout(() => setCopiedSnippet(false), 2000);
    } catch {
      // Fallback ignored
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="setup-modal-title"
    >
      <div className="w-full max-w-2xl bg-[#FFF9FB] border border-[#EED7E0] rounded-xl shadow-xl overflow-hidden my-8">
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-[#EED7E0]">
          <div>
            <h2
              id="setup-modal-title"
              className="text-lg font-semibold text-[#26171E]"
            >
              WordPress WooCommerce Bridge ও Meta Pixel সেটআপ
            </h2>
            <p className="text-xs text-[#735763]">
              dist ফোল্ডারের ভেতরে থাকা wc-bridge.php দিয়ে স্বয়ংক্রিয়ভাবে WooCommerce অর্ডার সিঙ্ক হয়
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-[#735763] hover:text-[#26171E] hover:bg-[#FAEBF0] transition-colors"
            aria-label="Close setup modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#26171E] mb-1.5">
                WordPress সাইট URL (একই ডোমেইনে আপলোড করলে খালি রাখুন)
              </label>
              <input
                type="url"
                value={wpSiteUrl}
                onChange={(e) => setWpSiteUrl(e.target.value)}
                placeholder="https://yourdomain.com"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#E5C9D4] rounded-lg focus:outline-none focus:border-[#C23364]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#26171E] mb-1.5">
                Meta (Facebook) Pixel ID
              </label>
              <input
                type="text"
                value={pixelId}
                onChange={(e) => setPixelId(e.target.value)}
                placeholder="যেমন: 123456789012345"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#E5C9D4] rounded-lg focus:outline-none focus:border-[#C23364] tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#26171E] mb-1.5">
                WC Product ID
              </label>
              <input
                type="number"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E5C9D4] rounded-lg focus:outline-none focus:border-[#C23364] tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#26171E] mb-1.5">
                Product SKU
              </label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E5C9D4] rounded-lg focus:outline-none focus:border-[#C23364]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#26171E] mb-1.5">
                ঢাকা ডেলিভারি (৳)
              </label>
              <input
                type="number"
                min={0}
                value={insideDhakaShipping}
                onChange={(e) => setInsideDhakaShipping(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E5C9D4] rounded-lg focus:outline-none focus:border-[#C23364] tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#26171E] mb-1.5">
                ঢাকার বাইরে (৳)
              </label>
              <input
                type="number"
                min={0}
                value={outsideDhakaShipping}
                onChange={(e) => setOutsideDhakaShipping(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E5C9D4] rounded-lg focus:outline-none focus:border-[#C23364] tabular-nums"
              />
            </div>
          </div>

          <div>
            <span className="block text-xs font-medium text-[#26171E] mb-2">
              WooCommerce অর্ডার সংযোগ পদ্ধতি
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-1 bg-[#FAEBF0] rounded-lg">
              <button
                type="button"
                onClick={() => setMode('wc_bridge')}
                className={`px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  mode === 'wc_bridge'
                    ? 'bg-white text-[#26171E] shadow-sm'
                    : 'text-[#735763] hover:text-[#26171E]'
                }`}
              >
                Auto Bridge (wc-bridge.php)
              </button>
              <button
                type="button"
                onClick={() => setMode('custom_endpoint')}
                className={`px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  mode === 'custom_endpoint'
                    ? 'bg-white text-[#26171E] shadow-sm'
                    : 'text-[#735763] hover:text-[#26171E]'
                }`}
              >
                functions.php স্নিপেট
              </button>
              <button
                type="button"
                onClick={() => setMode('wc_rest_api')}
                className={`px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  mode === 'wc_rest_api'
                    ? 'bg-white text-[#26171E] shadow-sm'
                    : 'text-[#735763] hover:text-[#26171E]'
                }`}
              >
                REST API v3 Keys
              </button>
            </div>
          </div>

          {mode === 'wc_bridge' && (
            <div className="bg-white border border-[#EED7E0] rounded-lg p-4 space-y-3">
              <div className="text-xs text-[#433731] leading-relaxed space-y-1.5">
                <p className="font-semibold text-[#26171E]">
                  স্বয়ংক্রিয় WooCommerce Bridge (কোনো কোড এডিট বা API Key লাগবে না)
                </p>
                <p>
                  ১. <code className="font-mono text-[#26171E]">npm run build</code> করলে{' '}
                  <code className="font-mono text-[#26171E]">dist/</code> ফোল্ডারের ভেতর{' '}
                  <code className="font-mono text-[#C23364]">wc-bridge.php</code> অটোমেটিক তৈরি হবে।
                </p>
                <p>
                  ২. আপনার cPanel → <code className="font-mono text-[#26171E]">public_html/</code> (বা{' '}
                  <code className="font-mono text-[#26171E]">public_html/wp-content/landing-page/</code> ইত্যাদি যেকোনো সাব-ফোল্ডারে) পুরো{' '}
                  <code className="font-mono text-[#26171E]">dist/</code> ফাইলগুলো আপলোড করুন।
                </p>
                <p>
                  ৩. কাস্টমার অর্ডার করলেই <code className="font-mono text-[#26171E]">wc-bridge.php</code> নিজে থেকে WordPress খুঁজে সরাসরি{' '}
                  <strong>WooCommerce → Orders</strong>-এ অর্ডার সেভ করবে।
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleTestBridge}
                  disabled={testingBridge}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#26171E] bg-[#FAEBF0] hover:bg-[#F4DCE4] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Activity className="w-3.5 h-3.5 text-[#C23364]" />
                  {testingBridge ? 'চেক করা হচ্ছে...' : 'Bridge সংযোগ পরীক্ষা করুন'}
                </button>
                {bridgeStatus && (
                  <span
                    className={`text-xs font-medium ${
                      bridgeStatus.ok ? 'text-emerald-700' : 'text-amber-700'
                    }`}
                  >
                    {bridgeStatus.detail}
                  </span>
                )}
              </div>
            </div>
          )}

          {mode === 'wc_rest_api' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-white border border-[#EED7E0] rounded-lg">
              <div>
                <label className="block text-xs font-medium text-[#26171E] mb-1.5">
                  Consumer Key (ck_...)
                </label>
                <input
                  type="text"
                  value={consumerKey}
                  onChange={(e) => setConsumerKey(e.target.value)}
                  placeholder="ck_xxxxxxxxxxxxxxxx"
                  className="w-full px-3 py-2 text-sm bg-[#FFF9FB] border border-[#E5C9D4] rounded-lg focus:outline-none focus:border-[#C23364]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#26171E] mb-1.5">
                  Consumer Secret (cs_...)
                </label>
                <input
                  type="password"
                  value={consumerSecret}
                  onChange={(e) => setConsumerSecret(e.target.value)}
                  placeholder="cs_xxxxxxxxxxxxxxxx"
                  className="w-full px-3 py-2 text-sm bg-[#FFF9FB] border border-[#E5C9D4] rounded-lg focus:outline-none focus:border-[#C23364]"
                />
              </div>
            </div>
          )}

          {mode === 'custom_endpoint' && (
            <div className="bg-white border border-[#EED7E0] rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-[#FAEBF0]/60 border-b border-[#EED7E0]">
                <span className="text-xs font-medium text-[#26171E]">
                  WordPress functions.php স্নিপেট (বিকল্প পদ্ধতি)
                </span>
                <button
                  type="button"
                  onClick={handleCopySnippet}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#C23364] bg-white border border-[#EED7E0] rounded-md hover:bg-[#FFF9FB] transition-colors whitespace-nowrap"
                >
                  {copiedSnippet ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> কপি হয়েছে
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> কোড কপি করুন
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3 text-[11px] leading-relaxed text-[#433731] overflow-x-auto max-h-44 font-mono">
                {WORDPRESS_PHP_SNIPPET}
              </pre>
            </div>
          )}

          <div className="text-xs text-[#735763] leading-relaxed bg-[#FAEBF0]/70 p-3.5 rounded-lg">
            স্থায়ীভাবে বিল্ডে রাখতে চাইলে{' '}
            <code className="font-mono text-[#26171E]">src/config/storeConfig.ts</code> ফাইলে Pixel ID ও Product ID বসিয়ে{' '}
            <code className="font-mono text-[#26171E]">npm run build</code> দিন এবং পুরো{' '}
            <code className="font-mono text-[#26171E]">dist/</code> ফোল্ডার WordPress-এ আপলোড করুন।
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#EED7E0]">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#735763] hover:text-[#26171E] transition-colors whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" /> রিসেট করুন
            </button>

            <div className="flex items-center gap-3">
              {savedNotice && (
                <span className="text-xs font-medium text-emerald-700">
                  সেভ সম্পন্ন হয়েছে
                </span>
              )}
              <button
                type="submit"
                className="px-5 py-2.5 text-sm font-semibold text-white bg-[#C23364] hover:bg-[#A32450] rounded-lg transition-colors whitespace-nowrap"
              >
                সেটিংস সেভ করুন
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
