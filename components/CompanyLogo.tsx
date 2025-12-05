'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface CompanyLogoProps {
  symbol: string;
  name?: string;
  size?: number;
  className?: string;
}

export default function CompanyLogo({ symbol, name, size = 36, className }: CompanyLogoProps) {
  const [imageError, setImageError] = useState(false);

  // Clean symbol for URL (remove exchange suffixes like .TO, .NE, etc.)
  const cleanSymbol = symbol.split('.')[0].toUpperCase();
  
  // Get API key from environment variable
  const apiKey = process.env.NEXT_PUBLIC_LOGO_DEV_API_KEY;
  
  // Build logo URL using logo.dev API
  const logoUrl = apiKey 
    ? `https://img.logo.dev/ticker/${cleanSymbol}?token=${apiKey}`
    : null;

  const fallbackInitial = symbol.charAt(0).toUpperCase();

  if (imageError || !logoUrl) {
    return (
      <div
        className={cn(
          'rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center text-sm font-bold text-gray-700 dark:text-gray-300 flex-shrink-0',
          className
        )}
        style={{ width: size, height: size }}
      >
        {fallbackInitial}
      </div>
    );
  }

  return (
    <div
      className={cn('relative flex-shrink-0 overflow-hidden', className)}
      style={{ width: size, height: size }}
    >
      <Image
        src={logoUrl}
        alt={`${symbol} logo`}
        width={size}
        height={size}
        className="rounded-xl w-full h-full object-cover bg-gray-50 dark:bg-gray-800"
        onError={() => setImageError(true)}
        unoptimized
      />
    </div>
  );
}

