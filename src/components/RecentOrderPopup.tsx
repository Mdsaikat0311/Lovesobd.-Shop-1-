import { useEffect, useState } from 'react';
import { ShoppingBag, X } from 'lucide-react';
import { RecentWooOrder } from '../services/woocommerce';

interface RecentOrderPopupProps {
  orders: RecentWooOrder[];
}

export function RecentOrderPopup({ orders }: RecentOrderPopupProps) {
  const [tick, setTick] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    setTick(0);
  }, [orders.length]);

  useEffect(() => {
    if (isDismissed || orders.length === 0) {
      setIsVisible(false);
      return;
    }

    if (isPaused) {
      return;
    }

    let showTimer: ReturnType<typeof setTimeout> | undefined;
    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    let nextTimer: ReturnType<typeof setTimeout> | undefined;

    // Medium-paced 5-second cycle: wait 1.4s, show smoothly for 3.6s, fade out 0.4s -> next order
    const waitMs = tick === 0 ? 5000 : 1400;
    showTimer = setTimeout(() => {
      setIsVisible(true);

      hideTimer = setTimeout(() => {
        setIsVisible(false);

        nextTimer = setTimeout(() => {
          setTick((prev) => prev + 1);
        }, 400);
      }, 3600);
    }, waitMs);

    return () => {
      if (showTimer) clearTimeout(showTimer);
      if (hideTimer) clearTimeout(hideTimer);
      if (nextTimer) clearTimeout(nextTimer);
    };
  }, [tick, isDismissed, isPaused, orders.length]);

  if (isDismissed || orders.length === 0) {
    return null;
  }

  const currentOrder = orders[tick % orders.length];
  if (!currentOrder) return null;

  return (
    <aside
      aria-live="polite"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`fixed bottom-4 left-4 z-30 w-[calc(100vw-2rem)] max-w-[300px] transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isVisible
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 translate-y-3 pointer-events-none'
      }`}
    >
      <div className="flex items-center gap-3 bg-white border border-[#EED7E0] rounded-xl px-3.5 py-2.5 shadow-md">
        <div className="w-9 h-9 rounded-lg bg-[#FAEBF0] flex items-center justify-center shrink-0">
          <ShoppingBag className="w-4 h-4 text-[#C23364]" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-[#26171E] truncate">
            {currentOrder.customerName}
          </p>
          <p className="text-xs text-[#5E4650] truncate mt-0.5">
            {currentOrder.productName}
          </p>
          <p className="text-[11px] font-medium text-[#C23364] mt-0.5">
            সদ্য অর্ডার করেছে
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          aria-label="নোটিফিকেশন বন্ধ করুন"
          className="p-1 text-[#967B86] hover:text-[#26171E] rounded transition-colors shrink-0 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
}
