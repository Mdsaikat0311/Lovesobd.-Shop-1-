import { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  Gift,
  Phone,
  ShieldCheck,
  Truck,
  MessageCircle,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { ProductImage } from './components/ProductImage';
import { RecentOrderPopup } from './components/RecentOrderPopup';
import { SetupGuideModal } from './components/SetupGuideModal';
import { getActiveStoreConfig, StoreConfig } from './config/storeConfig';
import {
  initPixel,
  trackInitiateCheckout,
  trackPurchase,
  trackViewContent,
} from './services/pixel';
import {
  calculateTotals,
  DeliveryZone,
  fetchRecentWooOrders,
  OrderResult,
  RecentWooOrder,
  submitWooCommerceOrder,
} from './services/woocommerce';

const HERO_GALLERY = [
  {
    id: 'maroon',
    label: 'মেরুন ভেলভেট লুক',
    src: './assets/aistudio/IMG-20261115-WA0001_e7215610.jpg',
    alt: 'Butterfly Jewelry Set — Maroon velvet luxury look with necklace, bracelet and payel',
  },
  {
    id: 'ivory',
    label: 'আইভরি ব্রাইডাল লুক',
    src: './assets/aistudio/IMG-20261115-WA0000_67c9689e.jpg',
    alt: 'Butterfly Jewelry Set — Ivory embroidered look with necklace, bracelet and payel',
  },
  {
    id: 'emerald',
    label: 'এমারেল্ড মডেল লুক',
    src: './assets/aistudio/Gemini_Generated_Image_g7drl7g7drl7g7dr__1__72a0ccb4.jpg',
    alt: 'Butterfly Jewelry Set — Emerald velvet close-up of necklace, woven bracelet and payel',
  },
];

const COMBO_ITEMS = [
  {
    index: '01',
    category: 'আইভরি এলিগ্যান্ট লুক',
    title: 'হালকা ও আরামদায়ক ব্রেসলেট ও সেট',
    description:
      'প্রিমিয়াম স্টেইনলেস স্টিল ও দীর্ঘস্থায়ী গোল্ডেন শাইন—হালকা ওজন হওয়ায় সারাদিন পরেও আরামদায়ক।',
    image: './assets/aistudio/IMG-20261115-WA0000_67c9689e.jpg',
    alt: 'Butterfly Jewelry Set worn with ivory embroidered outfit',
  },
  {
    index: '02',
    category: 'এমারেল্ড মডেল লুক',
    title: 'ব্রেসলেট ও ম্যাচিং পায়েল (১ জোড়া)',
    description:
      'আকর্ষণীয় স্লিক ব্রেসলেট এবং ১ জোড়া (২ পিস) ম্যাচিং বাটারফ্লাই পায়েল—আপনার পুরো গিফট লুককে করে সম্পূর্ণ।',
    image: './assets/aistudio/Gemini_Generated_Image_g7drl7g7drl7g7dr__1__72a0ccb4.jpg',
    alt: 'Model showcase of Butterfly Necklace, gold bracelet and butterfly anklets in emerald dress',
  },
  {
    index: '03',
    category: 'রয়েল মেরুন লুক',
    title: 'Butterfly Necklace ও সম্পূর্ণ সেট',
    description:
      '18K গোল্ড-প্লেটেড স্লিক স্নেক চেইন ও নাজুক বাটারফ্লাই পেন্ডেন্ট—যেকোনো উৎসব ও শাড়ি বা কামিজের সাথে মানানসই।',
    image: './assets/aistudio/IMG-20261115-WA0001_e7215610.jpg',
    alt: 'Butterfly Jewelry Set worn with maroon embroidered dress',
  },
];

const FAQ_ITEMS = [
  {
    question: 'এই গিফট কম্বোতে কী কী থাকছে?',
    answer:
      'এক কম্বোতেই থাকছে ১টি Butterfly Necklace (স্নেক চেইনসহ), ১টি 5-Flower Woven Bracelet এবং ১ জোড়া (২ পিস) Matching Butterfly Payel—সুন্দর গিফট বক্স প্যাকেজিংয়ে।',
  },
  {
    question: 'অফার মূল্য ও ডেলিভারি চার্জ কত?',
    answer:
      'রেগুলার প্রাইস ৳১,১৯০—বর্তমান স্পেশাল গিফট অফারে পাচ্ছেন মাত্র ৳৭৯০। সারা দেশে ক্যাশ অন ডেলিভারি সুবিধা রয়েছে।',
  },
  {
    question: 'অর্ডার করার নিয়ম কী?',
    answer:
      'নিচের অর্ডার ফর্মে আপনার নাম, মোবাইল নম্বর এবং সম্পূর্ণ ঠিকানা লিখে "অর্ডার কনফার্ম করুন" বাটনে ক্লিক করলেই আপনার অর্ডারটি সরাসরি সম্পন্ন হয়ে যাবে। কোনো অগ্রিম টাকা লাগবে না।',
  },
  {
    question: 'ডেলিভারি পেতে কতদিন সময় লাগে?',
    answer:
      'ঢাকার ভেতরে সাধারণত ১–২ কর্মদিবস এবং ঢাকার বাইরে সারা দেশে ২–৪ কর্মদিবসের মধ্যে হোম ডেলিভারি পৌঁছে দেওয়া হয়।',
  },
];

function formatBdt(amount: number): string {
  return `৳${amount.toLocaleString('en-US')}`;
}

export default function App() {
  const [config, setConfig] = useState<StoreConfig>(() => getActiveStoreConfig());
  const [quantity, setQuantity] = useState<number>(1);
  const [zone, setZone] = useState<DeliveryZone>('outside');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [giftNote, setGiftNote] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderResult, setOrderResult] = useState<OrderResult | null>(null);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [activeHeroIdx, setActiveHeroIdx] = useState(0);
  const [recentOrders, setRecentOrders] = useState<RecentWooOrder[]>([]);

  const checkoutTrackedRef = useRef(false);

  const totals = calculateTotals(quantity, zone);

  useEffect(() => {
    if (config.pixel.pixelId) {
      initPixel(config.pixel.pixelId);
      trackViewContent({
        pixelId: config.pixel.pixelId,
        productId: config.product.sku,
        productName: config.product.name,
        value: config.product.offerPrice,
        currency: config.product.currency,
      });
    }

    let cancelled = false;
    fetchRecentWooOrders().then((orders) => {
      if (!cancelled && orders.length > 0) {
        setRecentOrders(orders);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [config]);

  const handleCheckoutEngagement = () => {
    if (checkoutTrackedRef.current || !config.pixel.pixelId) return;
    checkoutTrackedRef.current = true;
    trackInitiateCheckout({
      pixelId: config.pixel.pixelId,
      productId: config.product.sku,
      productName: config.product.name,
      value: totals.total,
      numItems: quantity,
      currency: config.product.currency,
    });
  };

  const handleQuantityChange = (newQty: number) => {
    setQuantity(newQty);
    handleCheckoutEngagement();
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedName = fullName.trim();
    const cleanedPhone = phone.replace(/[\s-]/g, '').trim();
    const trimmedAddress = address.trim();

    if (trimmedName.length < 2) {
      setFormError('অনুগ্রহ করে আপনার পুরো নাম লিখুন।');
      return;
    }
    if (!/^(\+?88)?01[3-9]\d{8}$/.test(cleanedPhone)) {
      setFormError('অনুগ্রহ করে সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 01954605031)।');
      return;
    }
    if (trimmedAddress.length < 8) {
      setFormError('ডেলিভারির জন্য আপনার বাসা/রোড/থানা ও জেলার সম্পূর্ণ ঠিকানা দিন।');
      return;
    }

    handleCheckoutEngagement();
    setIsSubmitting(true);

    const result = await submitWooCommerceOrder({
      fullName: trimmedName,
      phone: cleanedPhone,
      address: trimmedAddress,
      zone,
      quantity,
      giftNote,
    });

    setIsSubmitting(false);

    if (!result.success) {
      setFormError(
        result.errorMessage ||
          'অর্ডার সাবমিট করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।'
      );
      return;
    }

    if (config.pixel.pixelId) {
      trackPurchase({
        pixelId: config.pixel.pixelId,
        productId: config.product.sku,
        productName: config.product.name,
        value: result.total,
        numItems: quantity,
        currency: config.product.currency,
        orderId: result.orderNumber || result.orderId,
      });
    }

    setRecentOrders((prev) => [
      {
        id: result.orderNumber || result.orderId || String(Date.now()),
        customerName: trimmedName,
        productName: config.product.name,
      },
      ...prev.slice(0, 9),
    ]);

    setOrderResult(result);
  };

  const handleResetOrder = () => {
    setOrderResult(null);
    setFullName('');
    setPhone('');
    setAddress('');
    setGiftNote('');
    setFormError(null);
    checkoutTrackedRef.current = false;
  };

  const whatsappMessage = encodeURIComponent(
    `আসসালামু আলাইকুম, আমি Butterfly Luxury Jewellery Combo (${quantity} সেট - ${formatBdt(totals.total)}) অর্ডার করতে চাই।`
  );
  const whatsappHref = `https://wa.me/${config.whatsappNumber}?text=${whatsappMessage}`;

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF9FB] text-[#26171E]">
      {/* Top Bar — Strict 3-Zone Contract */}
      <header className="sticky top-0 z-40 bg-[#FFF9FB]/95 backdrop-blur-sm border-b border-[#EED7E0]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-8">
          <a
            href="#overview"
            className="inline-flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            <svg
              width="32"
              height="26"
              viewBox="0 0 38 30"
              fill="none"
              aria-hidden="true"
              className="shrink-0"
            >
              <path
                d="M17.2 7.2C14.7 3.7 9.3 3.9 7.1 7.6C4.9 11.4 6.7 16.5 13.7 21.8C20.7 16.5 22.5 11.4 20.3 7.6C18.9 5.2 15.8 4.4 13.7 5.7"
                stroke="#26171E"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M10.2 12.1C8.8 10.1 5.7 10.2 4.5 12.3C3.2 14.5 4.3 17.5 8.2 20.5C12.1 17.5 13.2 14.5 11.9 12.3C11 10.7 9.1 10.4 7.8 11.4"
                stroke="#C23364"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M27.5 19.5C30.2 17.2 33.4 16.2 36 16.4M28.2 22.4C31.2 21.4 33.8 21.3 36.2 22"
                stroke="#C23364"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
            <span className="font-display text-xl sm:text-2xl font-bold tracking-tight text-[#26171E]">
              Loveso<span className="text-[#C23364]">BD</span>
            </span>
          </a>

          <nav
            aria-label="Primary"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-[#735763]"
          >
            <a
              href="#overview"
              className="hover:text-[#C23364] transition-colors whitespace-nowrap shrink-0"
            >
              কম্বো পরিচিতি
            </a>
            <a
              href="#inside-box"
              className="hover:text-[#C23364] transition-colors whitespace-nowrap shrink-0"
            >
              গিফট সেট
            </a>
            <a
              href="#order-now"
              className="hover:text-[#C23364] transition-colors whitespace-nowrap shrink-0"
            >
              অর্ডার ফর্ম
            </a>
            <a
              href="#faq"
              className="hover:text-[#C23364] transition-colors whitespace-nowrap shrink-0"
            >
              প্রশ্নোত্তর
            </a>
          </nav>

          <div className="shrink-0">
            <a
              href="#order-now"
              className="inline-flex items-center justify-center px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#C23364] hover:bg-[#A32450] rounded-lg transition-colors whitespace-nowrap shrink-0 tabular-nums"
            >
              অর্ডার করুন · {formatBdt(config.product.offerPrice)}
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Section 1: Hero Split Showcase */}
        <section
          id="overview"
          className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-12 sm:pt-12 sm:pb-16"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center">
              <p className="text-xs sm:text-sm font-medium text-[#C23364] tracking-wide mb-3">
                প্রিমিয়াম গিফট কালেকশন · ক্যাশ অন ডেলিভারি · সারা দেশে হোম ডেলিভারি
              </p>

              <h1
                className="font-display text-3xl sm:text-4xl lg:text-[44px] font-semibold leading-[1.2] text-[#26171E] mb-4"
                style={{ textWrap: 'balance' }}
              >
                প্রিয়জনের জন্য পারফেক্ট গিফট — Butterfly Luxury Jewellery Combo
              </h1>

              <p className="text-[15px] sm:text-base leading-relaxed text-[#5E4650] mb-6 max-w-xl">
                এক কম্বোতেই পাচ্ছেন সম্পূর্ণ একটি এলিগ্যান্ট লুক:{' '}
                <strong className="font-semibold text-[#26171E]">
                  Butterfly Necklace
                </strong>
                ,{' '}
                <strong className="font-semibold text-[#26171E]">
                  5-Flower Woven Bracelet
                </strong>{' '}
                এবং{' '}
                <strong className="font-semibold text-[#26171E]">
                  Matching Butterfly Payel (১ জোড়া / ২ পিস)
                </strong>
                —প্রিমিয়াম ভেলভেট গিফট বক্সসহ।
              </p>

              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 pb-6 mb-6 border-b border-[#EED7E0]">
                <span className="text-3xl sm:text-4xl font-bold text-[#C23364] tabular-nums">
                  {formatBdt(config.product.offerPrice)}
                </span>
                <span className="text-lg text-[#967B86] line-through tabular-nums">
                  {formatBdt(config.product.regularPrice)}
                </span>
                <span className="text-sm font-medium text-[#735763]">
                  আজকের কম্বো অফারে সাশ্রয়{' '}
                  <span className="tabular-nums font-semibold text-[#26171E]">
                    {formatBdt(
                      config.product.regularPrice - config.product.offerPrice
                    )}
                  </span>
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                <a
                  href="#order-now"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm sm:text-base font-semibold text-white bg-[#C23364] hover:bg-[#A32450] rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <Gift className="w-4 h-4" />
                  এখনই অর্ডার করুন
                </a>
              </div>
            </div>

            <div className="lg:col-span-6 flex flex-col gap-3">
              <div className="rounded-xl overflow-hidden border border-[#EED7E0] bg-[#FDF4F7] shadow-sm aspect-[1199/1312] max-h-[540px] w-full mx-auto">
                <ProductImage
                  src={HERO_GALLERY[activeHeroIdx].src}
                  alt={HERO_GALLERY[activeHeroIdx].alt}
                  fallbackTitle="Butterfly Luxury Jewellery Combo"
                  priority
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                {HERO_GALLERY.map((item, idx) => {
                  const isActive = idx === activeHeroIdx;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveHeroIdx(idx)}
                      className={`flex items-center gap-2 p-1.5 rounded-lg border text-left transition-colors cursor-pointer ${
                        isActive
                          ? 'border-[#C23364] bg-white shadow-sm'
                          : 'border-[#EED7E0] bg-white/70 hover:border-[#D59EB3]'
                      }`}
                    >
                      <div className="w-10 h-11 rounded overflow-hidden bg-[#FAEBF0] shrink-0">
                        <ProductImage
                          src={item.src}
                          alt={item.label}
                          priority
                          className="w-full h-full object-cover object-top"
                        />
                      </div>
                      <span className="text-[11px] sm:text-xs font-medium text-[#26171E] leading-tight line-clamp-2">
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: What's Inside the Gift Box */}
        <section
          id="inside-box"
          className="bg-white border-y border-[#EED7E0] py-12 sm:py-16"
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="max-w-2xl mb-8 sm:mb-10">
              <h2
                className="font-display text-2xl sm:text-3xl font-semibold text-[#26171E] mb-2"
                style={{ textWrap: 'balance' }}
              >
                এক কম্বোতেই যা যা থাকছে
              </h2>
              <p className="text-sm sm:text-base text-[#735763]">
                একই থিমে তৈরি তিনটি ম্যাচিং জুয়েলারি—আলাদা করে ম্যাচিং খুঁজতে না ভেবে
                এক সেটেই পেয়ে যাচ্ছেন সম্পূর্ণ গিফট লুক।
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              {COMBO_ITEMS.map((item) => (
                <article
                  key={item.index}
                  className="group bg-[#FFF9FB] border border-[#EED7E0] rounded-xl overflow-hidden transition-transform duration-200 hover:-translate-y-0.5"
                >
                  <div className="aspect-[11/13] bg-[#FDF4F7] overflow-hidden">
                    <ProductImage
                      src={item.image}
                      alt={item.alt}
                      fallbackTitle={item.title}
                      priority
                      className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-2 text-xs text-[#967B86] mb-1.5 tabular-nums">
                      <span>{item.index}</span>
                      <span aria-hidden="true">·</span>
                      <span>{item.category}</span>
                    </div>
                    <h3 className="text-base font-semibold text-[#26171E] mb-1.5">
                      {item.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-[#5E4650]">
                      {item.description}
                    </p>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-10 pt-8 border-t border-[#EED7E0] grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              <div className="flex items-start gap-3">
                <Gift className="w-5 h-5 text-[#C23364] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-[#26171E]">
                    গিফটের জন্য প্রস্তুত বক্স
                  </h4>
                  <p className="text-sm text-[#735763] mt-0.5">
                    জন্মদিন, অ্যানিভার্সারি বা বিশেষ দিনে সরাসরি উপহার দেওয়ার উপযোগী।
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Truck className="w-5 h-5 text-[#C23364] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-[#26171E]">
                    অগ্রিম পেমেন্ট ছাড়াই অর্ডার
                  </h4>
                  <p className="text-sm text-[#735763] mt-0.5">
                    সারা বাংলাদেশে ক্যাশ অন ডেলিভারি—প্রোডাক্ট হাতে পেয়ে টাকা পরিশোধ।
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-[#C23364] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-[#26171E]">
                    ১৮ ক্যারেট গোল্ড ফিনিশ
                  </h4>
                  <p className="text-sm text-[#735763] mt-0.5">
                    সাধারণ সাজ থেকে অনুষ্ঠান—সব ধরনের পোশাকের সাথে সহজেই মানিয়ে যায়।
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Direct Checkout & Order Summary */}
        <section
          id="order-now"
          className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16"
        >
          <div className="max-w-2xl mb-8">
            <p className="text-xs sm:text-sm font-medium text-[#C23364] mb-1.5">
              সহজ অর্ডার ফর্ম · মাত্র ৩০ সেকেন্ডে সম্পন্ন করুন
            </p>
            <h2
              className="font-display text-2xl sm:text-3xl font-semibold text-[#26171E]"
              style={{ textWrap: 'balance' }}
            >
              অর্ডার করতে নিচের তথ্যগুলো পূরণ করুন
            </h2>
          </div>

          {orderResult ? (
            <div className="bg-white border border-[#EED7E0] rounded-xl p-6 sm:p-8 max-w-2xl">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-11 h-11 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6 text-emerald-700" />
                </div>
                <div>
                  <p className="text-xs font-medium text-emerald-700 mb-1">
                    {orderResult.mode === 'woocommerce_live'
                      ? 'WooCommerce অর্ডার কনফার্ম হয়েছে'
                      : 'অর্ডার প্রিভিউ সম্পন্ন হয়েছে'}
                  </p>
                  <h3 className="text-xl sm:text-2xl font-semibold text-[#26171E] tabular-nums">
                    অর্ডার নম্বর #{orderResult.orderNumber}
                  </h3>
                  <p className="text-sm text-[#5E4650] mt-1">
                    {orderResult.message}
                  </p>
                </div>
              </div>

              <div className="border-t border-b border-[#EED7E0] py-4 space-y-2.5 text-sm mb-6">
                <div className="flex justify-between gap-4">
                  <span className="text-[#735763]">প্রোডাক্ট</span>
                  <span className="font-medium text-[#26171E] text-right">
                    {config.product.name} × {quantity}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-[#735763]">ক্রেতার নাম</span>
                  <span className="font-medium text-[#26171E]">{fullName}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-[#735763]">মোবাইল নম্বর</span>
                  <span className="font-medium text-[#26171E] tabular-nums">
                    {phone}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-[#735763]">ডেলিভারি ঠিকানা</span>
                  <span className="font-medium text-[#26171E] text-right max-w-xs">
                    {address}
                  </span>
                </div>
                {giftNote.trim() && (
                  <div className="flex justify-between gap-4">
                    <span className="text-[#735763]">গিফট নোট</span>
                    <span className="font-medium text-[#26171E] text-right max-w-xs">
                      {giftNote}
                    </span>
                  </div>
                )}
                <div className="flex justify-between gap-4 pt-2 border-t border-[#FAEBF0]">
                  <span className="font-semibold text-[#26171E]">
                    মোট পরিশোধযোগ্য (COD)
                  </span>
                  <span className="font-bold text-[#C23364] text-base tabular-nums">
                    {formatBdt(orderResult.total)}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleResetOrder}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-[#C23364] hover:bg-[#A32450] rounded-lg transition-colors whitespace-nowrap"
                >
                  আরেকটি অর্ডার করুন
                </button>
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-[#26171E] bg-[#FFF9FB] border border-[#E5C9D4] hover:border-[#C23364]/40 rounded-lg transition-colors whitespace-nowrap"
                >
                  <MessageCircle className="w-4 h-4 text-[#C23364]" />
                  WhatsApp-এ কথা বলুন
                </a>
              </div>
            </div>
          ) : (
            <form
              onSubmit={handleSubmitOrder}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
            >
              {/* Left Form Fields */}
              <div className="lg:col-span-7 bg-white border border-[#EED7E0] rounded-xl p-5 sm:p-7 space-y-5">
                {/* Package Selection */}
                <div>
                  <span className="block text-sm font-medium text-[#26171E] mb-2">
                    প্যাকেজ বেছে নিন
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(1)}
                      className={`text-left p-3.5 rounded-lg border transition-colors ${
                        quantity === 1
                          ? 'border-[#C23364] bg-[#C23364]/[0.04]'
                          : 'border-[#E5C9D4] bg-[#FFF9FB] hover:border-[#D59EB3]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-[#26171E]">
                          ১টি গিফট কম্বো সেট
                        </span>
                        <span className="text-sm font-bold text-[#C23364] tabular-nums">
                          {formatBdt(config.product.offerPrice)}
                        </span>
                      </div>
                      <p className="text-xs text-[#735763] mt-1">
                        নেকলেস + ব্রেসলেট + ২ পিস পায়েল
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuantityChange(2)}
                      className={`text-left p-3.5 rounded-lg border transition-colors ${
                        quantity === 2
                          ? 'border-[#C23364] bg-[#C23364]/[0.04]'
                          : 'border-[#E5C9D4] bg-[#FFF9FB] hover:border-[#D59EB3]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-[#26171E]">
                          ২টি কম্বো গিফট প্যাক
                        </span>
                        <span className="text-sm font-bold text-[#C23364] tabular-nums">
                          {formatBdt(config.product.twoSetOfferPrice)}
                        </span>
                      </div>
                      <p className="text-xs text-[#735763] mt-1 tabular-nums">
                        আরও {formatBdt(config.product.offerPrice * 2 - config.product.twoSetOfferPrice)} অতিরিক্ত ছাড়
                      </p>
                    </button>
                  </div>
                </div>

                {/* Customer Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="customer-name"
                      className="block text-sm font-medium text-[#26171E] mb-1.5"
                    >
                      আপনার পুরো নাম <span className="text-[#C23364]">*</span>
                    </label>
                    <input
                      id="customer-name"
                      type="text"
                      required
                      value={fullName}
                      onFocus={handleCheckoutEngagement}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="যেমন: তাসনিম আক্তার"
                      className="w-full px-3.5 py-2.5 text-sm bg-[#FFF9FB] border border-[#E5C9D4] rounded-lg focus:outline-none focus:bg-white focus:border-[#C23364] transition-colors"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="customer-phone"
                      className="block text-sm font-medium text-[#26171E] mb-1.5"
                    >
                      মোবাইল নম্বর <span className="text-[#C23364]">*</span>
                    </label>
                    <input
                      id="customer-phone"
                      type="tel"
                      required
                      value={phone}
                      onFocus={handleCheckoutEngagement}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="01XXXXXXXXX"
                      className="w-full px-3.5 py-2.5 text-sm bg-[#FFF9FB] border border-[#E5C9D4] rounded-lg focus:outline-none focus:bg-white focus:border-[#C23364] transition-colors tabular-nums"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="customer-address"
                    className="block text-sm font-medium text-[#26171E] mb-1.5"
                  >
                    সম্পূর্ণ ডেলিভারি ঠিকানা <span className="text-[#C23364]">*</span>
                  </label>
                  <textarea
                    id="customer-address"
                    required
                    rows={2}
                    value={address}
                    onFocus={handleCheckoutEngagement}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="বাসা/হোল্ডিং নং, রোড, এলাকা, থানা ও জেলার নাম লিখুন"
                    className="w-full px-3.5 py-2.5 text-sm bg-[#FFF9FB] border border-[#E5C9D4] rounded-lg focus:outline-none focus:bg-white focus:border-[#C23364] transition-colors resize-none"
                  />
                </div>

                {/* Delivery Area */}
                <div>
                  <span className="block text-sm font-medium text-[#26171E] mb-2">
                    ডেলিভারি এলাকা
                  </span>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-[#FAEBF0] rounded-lg">
                    <button
                      type="button"
                      onClick={() => setZone('dhaka')}
                      className={`py-2 px-3 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                        zone === 'dhaka'
                          ? 'bg-white text-[#26171E] shadow-sm'
                          : 'text-[#735763] hover:text-[#26171E]'
                      }`}
                    >
                      ঢাকার ভেতরে (
                      {config.shipping.insideDhaka === 0
                        ? 'ফ্রি'
                        : formatBdt(config.shipping.insideDhaka)}
                      )
                    </button>
                    <button
                      type="button"
                      onClick={() => setZone('outside')}
                      className={`py-2 px-3 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                        zone === 'outside'
                          ? 'bg-white text-[#26171E] shadow-sm'
                          : 'text-[#735763] hover:text-[#26171E]'
                      }`}
                    >
                      ঢাকার বাইরে (
                      {config.shipping.outsideDhaka === 0
                        ? 'ফ্রি'
                        : formatBdt(config.shipping.outsideDhaka)}
                      )
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Sticky Order Summary */}
              <div className="lg:col-span-5 lg:sticky lg:top-22 bg-white border border-[#EED7E0] rounded-xl p-5 sm:p-7">
                <h3 className="text-base font-semibold text-[#26171E] pb-4 border-b border-[#EED7E0]">
                  আপনার অর্ডার সামারি
                </h3>

                <div className="flex items-center gap-3.5 py-4 border-b border-[#EED7E0]">
                  <div className="w-16 h-16 rounded-lg overflow-hidden border border-[#EED7E0] bg-[#FAEBF0] shrink-0">
                    <ProductImage
                      src="./assets/aistudio/IMG-20261115-WA0001_e7215610.jpg"
                      alt={config.product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#26171E] truncate">
                      {config.product.name}
                    </p>
                    <p className="text-xs text-[#735763] mt-0.5 tabular-nums">
                      পরিমাণ: {quantity} সেট · SKU: {config.product.sku}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-[#26171E] tabular-nums shrink-0">
                    {formatBdt(totals.subtotal)}
                  </span>
                </div>

                <div className="py-4 space-y-2.5 text-sm border-b border-[#EED7E0]">
                  <div className="flex justify-between text-[#5E4650]">
                    <span>সাবটোটাল</span>
                    <span className="tabular-nums font-medium text-[#26171E]">
                      {formatBdt(totals.subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[#5E4650]">
                    <span>প্রিমিয়াম গিফট বক্স</span>
                    <span className="font-medium text-emerald-700">ফ্রি</span>
                  </div>
                  <div className="flex justify-between text-[#5E4650]">
                    <span>
                      ডেলিভারি চার্জ (
                      {zone === 'dhaka' ? 'ঢাকার ভেতরে' : 'ঢাকার বাইরে'})
                    </span>
                    <span
                      className={`tabular-nums font-medium ${
                        totals.shippingCost === 0
                          ? 'text-emerald-700'
                          : 'text-[#26171E]'
                      }`}
                    >
                      {totals.shippingCost === 0
                        ? 'ফ্রি ডেলিভারি'
                        : formatBdt(totals.shippingCost)}
                    </span>
                  </div>
                </div>

                <div className="flex items-baseline justify-between py-4">
                  <span className="text-base font-semibold text-[#26171E]">
                    সর্বমোট (Cash on Delivery)
                  </span>
                  <span className="text-2xl font-bold text-[#C23364] tabular-nums">
                    {formatBdt(totals.total)}
                  </span>
                </div>

                {formError && (
                  <div
                    role="alert"
                    className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-800"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-5 text-sm sm:text-base font-semibold text-white bg-[#C23364] hover:bg-[#A32450] disabled:opacity-65 rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap tabular-nums cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      অর্ডার প্রসেস হচ্ছে...
                    </>
                  ) : (
                    <>অর্ডার কনফার্ম করুন — {formatBdt(totals.total)}</>
                  )}
                </button>

                <div className="mt-4 pt-4 border-t border-[#FAEBF0] flex items-center justify-between gap-2 text-xs text-[#735763]">
                  <span>সরাসরি সহায়তা:</span>
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-medium text-[#26171E] hover:text-[#C23364] transition-colors whitespace-nowrap tabular-nums"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-[#C23364]" />
                    WhatsApp ({config.contactPhone})
                  </a>
                </div>
              </div>
            </form>
          )}
        </section>

        {/* Section 4: FAQ */}
        <section
          id="faq"
          className="bg-white border-t border-[#EED7E0] py-12 sm:py-16"
        >
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#26171E] mb-6 sm:mb-8">
              সাধারণ প্রশ্নোত্তর
            </h2>

            <div className="divide-y divide-[#EED7E0] border-y border-[#EED7E0]">
              {FAQ_ITEMS.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div key={faq.question}>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className="w-full py-4 flex items-center justify-between gap-4 text-left text-sm sm:text-base font-medium text-[#26171E] hover:text-[#C23364] transition-colors cursor-pointer"
                    >
                      <span>{faq.question}</span>
                      <ChevronDown
                        className={`w-4 h-4 text-[#735763] shrink-0 transition-transform duration-200 ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <p className="pb-4 text-sm leading-relaxed text-[#5E4650]">
                        {faq.answer}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      {/* Clean Minimal Footer */}
      <footer className="bg-[#FFF9FB] border-t border-[#EED7E0] py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs sm:text-sm text-[#735763]">
          <div className="flex items-center gap-3">
            <span className="font-display text-lg font-semibold text-[#26171E]">
              {config.brandName}
            </span>
            <span aria-hidden="true">·</span>
            <span>হেল্পলাইন: {config.contactPhone}</span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <span>© {new Date().getFullYear()} {config.brandName}</span>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setIsSetupOpen(true)}
              className="text-xs font-medium text-[#735763] hover:text-[#C23364] underline underline-offset-4 transition-colors whitespace-nowrap cursor-pointer"
            >
              WordPress & Pixel Setup
            </button>
          </div>
        </div>
      </footer>

      <RecentOrderPopup orders={recentOrders} />

      <SetupGuideModal
        isOpen={isSetupOpen}
        onClose={() => setIsSetupOpen(false)}
        onConfigSaved={() => setConfig(getActiveStoreConfig())}
      />
    </div>
  );
}
