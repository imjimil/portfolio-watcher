'use client';

import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { FileSpreadsheet, Upload, Download } from 'lucide-react';

export default function CSVImportSection() {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1, triggerOnce: true });
  const { ref: card1Ref, isVisible: card1Visible } = useScrollAnimation({ threshold: 0.1, triggerOnce: true });
  const { ref: card2Ref, isVisible: card2Visible } = useScrollAnimation({ threshold: 0.1, triggerOnce: true });

  return (
    <section className="py-12 sm:py-16 lg:py-24 bg-gradient-to-br from-blue-50/50 via-cyan-50/50 to-teal-50/50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-teal-500/10 dark:from-blue-500/20 dark:via-cyan-500/20 dark:to-teal-500/20 animate-pulse"></div>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto">
          <div 
            ref={ref}
            className={`text-center mb-8 sm:mb-12 transition-all duration-1000 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-full bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 mb-4 sm:mb-6 shadow-lg shadow-blue-500/50 animate-pulse-slow">
              <FileSpreadsheet className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-white" />
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 dark:from-blue-400 dark:via-cyan-400 dark:to-teal-400 bg-clip-text text-transparent mb-3 sm:mb-4">
              Import Your Portfolio
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto px-2">
              Already have portfolio data? Import it from CSV and start tracking immediately
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-2 gap-3 sm:gap-4 lg:gap-8">
            <div
              ref={card1Ref}
              className={`bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 border border-gray-200/50 dark:border-gray-700/50 hover:border-blue-400/50 dark:hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-700 hover:scale-105 hover:-translate-y-1 ${
                card1Visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'
              }`}
            >
              <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 mb-3 sm:mb-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 dark:from-blue-500 dark:to-blue-700 flex items-center justify-center flex-shrink-0 shadow-lg">
                  <Upload className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-white" />
                </div>
                <h3 className="text-base sm:text-lg lg:text-2xl font-bold text-gray-900 dark:text-white">Easy Import</h3>
              </div>
              <p className="text-xs sm:text-sm lg:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                Upload your CSV file with transaction data (symbol, date, type, quantity, price) and we&apos;ll automatically set up your portfolio.
              </p>
            </div>
            <div
              ref={card2Ref}
              className={`bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 border border-gray-200/50 dark:border-gray-700/50 hover:border-cyan-400/50 dark:hover:border-cyan-500/50 hover:shadow-2xl hover:shadow-cyan-500/20 transition-all duration-700 hover:scale-105 hover:-translate-y-1 ${
                card2Visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
              }`}
            >
              <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 mb-3 sm:mb-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-lg bg-gradient-to-br from-cyan-400 to-cyan-600 dark:from-cyan-500 dark:to-cyan-700 flex items-center justify-center flex-shrink-0 shadow-lg">
                  <Download className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-white" />
                </div>
                <h3 className="text-base sm:text-lg lg:text-2xl font-bold text-gray-900 dark:text-white">Export Anytime</h3>
              </div>
              <p className="text-xs sm:text-sm lg:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                Export your portfolio data to CSV format for tax reporting, analysis, or backup purposes whenever you need.
              </p>
            </div>
          </div>
          <div className={`mt-6 sm:mt-8 text-center transition-all duration-1000 delay-400 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 px-2">
              Supported formats: CSV with columns (Date, Symbol, Type, Quantity, Price)
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

