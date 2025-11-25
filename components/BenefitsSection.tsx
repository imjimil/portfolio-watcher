'use client';

import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { LucideIcon } from 'lucide-react';

interface Benefit {
  icon: LucideIcon;
  text: string;
}

interface BenefitsSectionProps {
  benefits: Benefit[];
}

export default function BenefitsSection({ benefits }: BenefitsSectionProps) {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1, triggerOnce: true });

  return (
    <section className="py-12 sm:py-16 lg:py-24 bg-gradient-to-b from-white via-gray-50/30 to-white dark:from-gray-900 dark:via-gray-800/30 dark:to-gray-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-cyan-500/5 to-teal-500/5 dark:from-blue-500/10 dark:via-cyan-500/10 dark:to-teal-500/10"></div>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto">
          <div 
            ref={ref}
            className={`text-center mb-8 sm:mb-12 lg:mb-16 transition-all duration-1000 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-white dark:via-gray-200 dark:to-white bg-clip-text text-transparent mb-3 sm:mb-4">
              Why Choose Us?
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300">
              Built for modern investors who demand the best
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
            {benefits.map((benefit, idx) => {
              const Icon = benefit.icon;
              const { ref: benefitRef, isVisible: benefitVisible } = useScrollAnimation({ 
                threshold: 0.1, 
                triggerOnce: true,
                rootMargin: '0px 0px -50px 0px'
              });
              
              return (
                <div
                  key={idx}
                  ref={benefitRef}
                  className={`flex items-center gap-2 sm:gap-3 lg:gap-4 p-3 sm:p-4 lg:p-6 rounded-lg sm:rounded-xl bg-gradient-to-r from-blue-50/50 via-cyan-50/50 to-teal-50/50 dark:from-gray-800/90 dark:via-gray-800/50 dark:to-gray-900/90 border border-gray-200/50 dark:border-gray-600/50 transition-all duration-700 hover:shadow-xl hover:shadow-blue-500/10 dark:hover:shadow-blue-500/20 hover:scale-105 hover:-translate-y-1 ${
                    benefitVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'
                  }`}
                  style={{ transitionDelay: `${idx * 100}ms` }}
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 dark:from-blue-400 dark:to-cyan-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-white" />
                  </div>
                  <span className="text-xs sm:text-sm lg:text-lg font-semibold text-gray-900 dark:text-white">
                    {benefit.text}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

