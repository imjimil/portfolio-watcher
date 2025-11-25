'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { ArrowRight } from 'lucide-react';

export default function CTASection() {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1, triggerOnce: true });

  const handleNavigation = (href: string) => {
    setIsNavigating(true);
    setTimeout(() => {
      router.push(href);
    }, 200);
  };

  return (
    <section className="py-12 sm:py-16 lg:py-24 bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 relative overflow-hidden">
      {/* Animated background effects */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/90 via-cyan-600/90 to-teal-600/90"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.1),transparent_50%)]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.1),transparent_50%)]"></div>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div 
          ref={ref}
          className={`max-w-3xl mx-auto text-center transition-all duration-1000 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6 drop-shadow-lg">
            Ready to Take Control of Your Portfolio?
          </h2>
          <p className="text-lg sm:text-xl text-blue-100 mb-6 sm:mb-8 lg:mb-10 drop-shadow">
            Join thousands of investors tracking their portfolios with confidence
          </p>
          <button
            onClick={() => handleNavigation('/signup')}
            disabled={isNavigating}
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold text-lg shadow-2xl shadow-white/20 hover:shadow-white/30 transform hover:scale-105 active:scale-95 transition-all duration-300 disabled:opacity-70 disabled:cursor-wait relative overflow-hidden group"
          >
            <span className={`relative z-10 flex items-center gap-2 transition-transform duration-300 ${isNavigating ? 'translate-x-2' : ''}`}>
              Start Tracking Now
              <ArrowRight className={`h-5 w-5 transition-transform duration-300 ${isNavigating ? 'translate-x-2' : 'group-hover:translate-x-1'}`} />
            </span>
            {isNavigating && (
              <span className="absolute inset-0 bg-gray-100 animate-pulse"></span>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}

