'use client';

import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { LucideIcon } from 'lucide-react';

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
}

interface FeatureSectionProps {
  features: Feature[];
}

function FeatureCard({ feature, index }: { feature: Feature; index: number }) {
  const { ref, isVisible } = useScrollAnimation({ 
    threshold: 0.1, 
    triggerOnce: true,
    rootMargin: '0px 0px -50px 0px'
  });
  
  const Icon = feature.icon;
  
  return (
    <div
      ref={ref}
      className={`group p-4 sm:p-6 lg:p-8 rounded-xl sm:rounded-2xl bg-gradient-to-br from-white via-gray-50/50 to-white dark:from-gray-800/90 dark:via-gray-800/50 dark:to-gray-900/90 border border-gray-200/50 dark:border-gray-700/50 hover:border-blue-400/50 dark:hover:border-blue-500/50 transition-all duration-700 hover:shadow-2xl hover:shadow-blue-500/10 dark:hover:shadow-blue-500/20 hover:scale-105 hover:-translate-y-1 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      <div className={`w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-lg sm:rounded-xl ${
        feature.color.includes('blue') ? 'bg-gradient-to-br from-blue-400 to-blue-600 dark:from-blue-500 dark:to-blue-700' :
        feature.color.includes('green') ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 dark:from-emerald-500 dark:to-emerald-700' :
        feature.color.includes('purple') ? 'bg-gradient-to-br from-indigo-400 to-indigo-600 dark:from-indigo-500 dark:to-indigo-700' :
        feature.color.includes('orange') ? 'bg-gradient-to-br from-orange-400 to-orange-600 dark:from-orange-500 dark:to-orange-700' :
        feature.color.includes('pink') ? 'bg-gradient-to-br from-pink-400 to-pink-600 dark:from-pink-500 dark:to-pink-700' :
        feature.color.includes('teal') ? 'bg-gradient-to-br from-teal-400 to-teal-600 dark:from-teal-500 dark:to-teal-700' :
        'bg-gradient-to-br from-indigo-400 to-indigo-600 dark:from-indigo-500 dark:to-indigo-700'
      } flex items-center justify-center mb-3 sm:mb-4 lg:mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-lg`}>
        <Icon className={`h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 text-white`} />
      </div>
      <h3 className="text-sm sm:text-base lg:text-xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-3">
        {feature.title}
      </h3>
      <p className="text-xs sm:text-sm lg:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
        {feature.description}
      </p>
    </div>
  );
}

export default function FeatureSection({ features }: FeatureSectionProps) {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1, triggerOnce: true });

  return (
    <section className="py-12 sm:py-16 lg:py-24 bg-gradient-to-b from-white via-gray-50/50 to-white dark:from-gray-900 dark:via-gray-800/50 dark:to-gray-900 relative overflow-hidden">
      {/* Premium gradient overlay - professional blue theme */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-cyan-500/5 to-teal-500/5 dark:from-blue-500/10 dark:via-cyan-500/10 dark:to-teal-500/10"></div>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div 
          ref={ref}
          className={`text-center mb-8 sm:mb-12 lg:mb-16 transition-all duration-1000 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-white dark:via-gray-200 dark:to-white bg-clip-text text-transparent mb-3 sm:mb-4">
            Everything You Need
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto px-2">
            Powerful features to manage and analyze your stock portfolio
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-8">
          {features.map((feature, idx) => (
            <FeatureCard key={idx} feature={feature} index={idx} />
          ))}
        </div>
      </div>
    </section>
  );
}

