import { useState } from 'react';
import { Gift } from 'lucide-react';

interface ProductImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackTitle?: string;
  priority?: boolean;
}

export function ProductImage({
  src,
  alt,
  className = '',
  fallbackTitle = 'Butterfly Luxury Jewellery',
  priority = false,
}: ProductImageProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#FAEBF0] to-[#F4DCE4] text-[#735763] p-6 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <Gift className="w-8 h-8 mb-2 text-[#C23364]" strokeWidth={1.5} />
        <span className="text-sm font-medium text-[#26171E]">{fallbackTitle}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="eager"
      decoding="sync"
      fetchPriority={priority ? 'high' : 'auto'}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
}
