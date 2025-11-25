'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  Wallet,
  BarChart3,
  Eye,
  Download,
  Upload,
  Shield,
  Zap,
  Smartphone,
  ArrowRight,
  LineChart,
  PieChart,
  Activity,
  DollarSign,
  Clock,
  FileSpreadsheet,
} from 'lucide-react';

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleNavigation = (href: string) => {
    setIsNavigating(true);
    // Add a small delay for smooth animation
    setTimeout(() => {
      router.push(href);
    }, 200);
  };

  const features = [
    {
      icon: TrendingUp,
      title: 'Real-time Tracking',
      description: 'Monitor your portfolio with live stock prices and instant updates',
      color: 'text-blue-600 dark:text-blue-400',
    },
    {
      icon: BarChart3,
      title: 'Advanced Analytics',
      description: 'Comprehensive performance metrics, ROI calculations, and gain/loss tracking',
      color: 'text-green-600 dark:text-green-400',
    },
    {
      icon: PieChart,
      title: 'Portfolio Allocation',
      description: 'Visual pie charts showing your asset distribution at a glance',
      color: 'text-purple-600 dark:text-purple-400',
    },
    {
      icon: LineChart,
      title: 'Performance Charts',
      description: 'Interactive charts showing portfolio performance over time (1d, 5d, 1m, 6m, YTD, All)',
      color: 'text-orange-600 dark:text-orange-400',
    },
    {
      icon: Eye,
      title: 'Watchlist',
      description: 'Monitor stocks you\'re interested in without adding them to your portfolio',
      color: 'text-pink-600 dark:text-pink-400',
    },
    {
      icon: Download,
      title: 'CSV Export',
      description: 'Export your portfolio and transaction data for tax reporting or analysis',
      color: 'text-indigo-600 dark:text-indigo-400',
    },
    {
      icon: Upload,
      title: 'CSV Import',
      description: 'Import your existing portfolio data from CSV files to get started quickly',
      color: 'text-teal-600 dark:text-teal-400',
    },
  ];

  const benefits = [
    { icon: Zap, text: 'Lightning Fast Performance' },
    { icon: Shield, text: 'Secure & Private' },
    { icon: Smartphone, text: 'Fully Responsive' },
    { icon: Clock, text: 'Real-time Updates' },
  ];

  const steps = [
    {
      number: '01',
      title: 'Sign Up',
      description: 'Create your free account in seconds',
    },
    {
      number: '02',
      title: 'Add Transactions',
      description: 'Record your buy/sell transactions with ease',
    },
    {
      number: '03',
      title: 'Track Performance',
      description: 'Watch your portfolio grow with real-time analytics',
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Simple Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-gray-900/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <span className="text-xl font-bold">Portfolio Tracker</span>
            </Link>
            <div className="flex items-center gap-4">
              <button
                onClick={() => handleNavigation('/login')}
                disabled={isNavigating}
                className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors disabled:opacity-70"
              >
                Sign In
              </button>
              <button
                onClick={() => handleNavigation('/signup')}
                disabled={isNavigating}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 active:scale-95 transition-all duration-300 disabled:opacity-70 disabled:cursor-wait"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Animated Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-400 via-purple-500 via-pink-500 to-orange-400 dark:from-blue-900 dark:via-purple-900 dark:via-pink-900 dark:to-orange-900 opacity-20 dark:opacity-10 animate-gradient"></div>
        <div className="absolute inset-0 bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-600 dark:from-cyan-900 dark:via-blue-900 dark:to-indigo-900 opacity-30 dark:opacity-15 animate-gradient-reverse"></div>
        <div className="absolute inset-0 bg-white dark:bg-gray-900"></div>
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 lg:pt-20 pb-16 sm:pb-24 lg:pb-32 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium mb-8 transition-all duration-1000 ${
                mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              <span>Professional Portfolio Tracker</span>
            </div>
            <h1
              className={`text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 dark:text-white mb-6 transition-all duration-1000 delay-100 ${
                mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              Track Your
              <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Portfolio Like a Pro
              </span>
            </h1>
            <p
              className={`text-xl sm:text-2xl text-gray-600 dark:text-gray-300 mb-10 max-w-2xl mx-auto transition-all duration-1000 delay-200 ${
                mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              Comprehensive stock portfolio tracking with real-time data, advanced analytics, and beautiful visualizations
            </p>
            <div
              className={`flex flex-col sm:flex-row gap-4 justify-center items-center transition-all duration-1000 delay-300 ${
                mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              <button
                onClick={() => handleNavigation('/signup')}
                disabled={isNavigating}
                className="group px-8 py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white rounded-lg font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 transition-all duration-300 flex items-center gap-2 disabled:opacity-70 disabled:cursor-wait relative overflow-hidden"
              >
                <span className={`relative z-10 flex items-center gap-2 transition-transform duration-300 ${isNavigating ? 'translate-x-2' : ''}`}>
                  Get Started Free
                  <ArrowRight className={`h-5 w-5 transition-transform duration-300 ${isNavigating ? 'translate-x-2' : 'group-hover:translate-x-1'}`} />
                </span>
                {isNavigating && (
                  <span className="absolute inset-0 bg-gradient-to-r from-blue-700 via-purple-700 to-pink-700 animate-pulse"></span>
                )}
              </button>
              <button
                onClick={() => handleNavigation('/login')}
                disabled={isNavigating}
                className="px-8 py-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg font-semibold text-lg border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all duration-300 disabled:opacity-70 disabled:cursor-wait"
              >
                Sign In
              </button>
            </div>
          </div>

          {/* Animated Stats */}
          <div
            className={`grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 max-w-4xl mx-auto mt-12 sm:mt-16 lg:mt-20 transition-all duration-1000 delay-400 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            {[
              { label: 'Real-time Data', value: '100%' },
              { label: 'Free Forever', value: '$0' },
              { label: 'Secure', value: '100%' },
              { label: 'Responsive', value: 'All Devices' },
            ].map((stat, idx) => (
              <div
                key={idx}
                className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-lg sm:rounded-xl p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-300 hover:scale-105"
              >
                <div className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1 sm:mb-2">
                  {stat.value}
                </div>
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CSV Import Section */}
      <section className="py-12 sm:py-16 lg:py-24 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 dark:from-blue-500/5 dark:via-purple-500/5 dark:to-pink-500/5 animate-pulse"></div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto">
            <div className={`text-center mb-8 sm:mb-12 transition-all duration-1000 delay-200 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}>
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 mb-4 sm:mb-6">
                <FileSpreadsheet className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-white" />
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">
                Import Your Portfolio
              </h2>
              <p className="text-base sm:text-lg lg:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto px-2">
                Already have portfolio data? Import it from CSV and start tracking immediately
              </p>
            </div>
            <div className={`grid grid-cols-2 md:grid-cols-2 gap-3 sm:gap-4 lg:gap-8 transition-all duration-1000 delay-300 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}>
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300 hover:scale-105">
                <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 mb-3 sm:mb-4">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                    <Upload className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <h3 className="text-base sm:text-lg lg:text-2xl font-bold text-gray-900 dark:text-white">Easy Import</h3>
                </div>
                <p className="text-xs sm:text-sm lg:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                  Upload your CSV file with transaction data (symbol, date, type, quantity, price) and we&apos;ll automatically set up your portfolio.
                </p>
              </div>
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300 hover:scale-105">
                <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 mb-3 sm:mb-4">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                    <Download className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="text-base sm:text-lg lg:text-2xl font-bold text-gray-900 dark:text-white">Export Anytime</h3>
                </div>
                <p className="text-xs sm:text-sm lg:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                  Export your portfolio data to CSV format for tax reporting, analysis, or backup purposes whenever you need.
                </p>
              </div>
            </div>
            <div className={`mt-6 sm:mt-8 text-center transition-all duration-1000 delay-400 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 px-2">
                Supported formats: CSV with columns (Date, Symbol, Type, Quantity, Price)
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-16 lg:py-24 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12 lg:mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">
              Everything You Need
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto px-2">
              Powerful features to manage and analyze your stock portfolio
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-8">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div
                  key={idx}
                  className={`group p-4 sm:p-6 lg:p-8 rounded-xl sm:rounded-2xl bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all duration-300 hover:shadow-xl hover:scale-105 ${
                    mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                  }`}
                  style={{ transitionDelay: `${idx * 100}ms` }}
                >
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-lg sm:rounded-xl ${feature.color.includes('blue') ? 'bg-blue-100 dark:bg-blue-900/30' : feature.color.includes('green') ? 'bg-green-100 dark:bg-green-900/30' : feature.color.includes('purple') ? 'bg-purple-100 dark:bg-purple-900/30' : feature.color.includes('orange') ? 'bg-orange-100 dark:bg-orange-900/30' : feature.color.includes('pink') ? 'bg-pink-100 dark:bg-pink-900/30' : feature.color.includes('teal') ? 'bg-teal-100 dark:bg-teal-900/30' : 'bg-indigo-100 dark:bg-indigo-900/30'} flex items-center justify-center mb-3 sm:mb-4 lg:mb-6 group-hover:scale-110 transition-transform`}>
                    <Icon className={`h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 ${feature.color}`} />
                  </div>
                  <h3 className="text-sm sm:text-base lg:text-xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-xs sm:text-sm lg:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 sm:py-16 lg:py-24 bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-800 dark:to-gray-900">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12 lg:mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">
              How It Works
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300">
              Get started in three simple steps
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 max-w-5xl mx-auto">
            {steps.map((step, idx) => (
              <div
                key={idx}
                className={`relative text-center transition-all duration-500 ${
                  mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: `${idx * 150}ms` }}
              >
                <div className="text-4xl sm:text-5xl lg:text-6xl font-bold text-blue-600 dark:text-blue-400 opacity-20 mb-3 sm:mb-4">
                  {step.number}
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl p-6 sm:p-8 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300 hover:scale-105">
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-3">
                    {step.title}
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                    {step.description}
                  </p>
                </div>
                {idx < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                    <ArrowRight className="h-8 w-8 text-gray-400" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-12 sm:py-16 lg:py-24 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8 sm:mb-12 lg:mb-16">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">
                Why Choose Us?
              </h2>
              <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300">
                Built for modern investors who demand the best
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
              {benefits.map((benefit, idx) => {
                const Icon = benefit.icon;
                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-2 sm:gap-3 lg:gap-4 p-3 sm:p-4 lg:p-6 rounded-lg sm:rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 border border-gray-200 dark:border-gray-600 transition-all duration-300 hover:shadow-lg hover:scale-105 ${
                      mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
                    }`}
                    style={{ transitionDelay: `${idx * 100}ms` }}
                  >
                    <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-lg bg-blue-600 dark:bg-blue-500 flex items-center justify-center flex-shrink-0">
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

      {/* CTA Section */}
      <section className="py-12 sm:py-16 lg:py-24 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6">
              Ready to Take Control of Your Portfolio?
            </h2>
            <p className="text-lg sm:text-xl text-blue-100 mb-6 sm:mb-8 lg:mb-10">
              Join thousands of investors tracking their portfolios with confidence
            </p>
            <button
              onClick={() => handleNavigation('/signup')}
              disabled={isNavigating}
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 transition-all duration-300 disabled:opacity-70 disabled:cursor-wait relative overflow-hidden"
            >
              <span className={`relative z-10 flex items-center gap-2 transition-transform duration-300 ${isNavigating ? 'translate-x-2' : ''}`}>
                Start Tracking Now
                <ArrowRight className={`h-5 w-5 transition-transform duration-300 ${isNavigating ? 'translate-x-2' : ''}`} />
              </span>
              {isNavigating && (
                <span className="absolute inset-0 bg-gray-100 animate-pulse"></span>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <TrendingUp className="h-6 w-6 text-blue-400" />
              <span className="text-xl font-bold text-white">Portfolio Tracker</span>
            </div>
            <div className="flex gap-6">
              <button
                onClick={() => handleNavigation('/login')}
                className="hover:text-white transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => handleNavigation('/signup')}
                className="hover:text-white transition-colors"
              >
                Sign Up
              </button>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-sm">
            <p>© {new Date().getFullYear()} Portfolio Tracker. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

