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
  ArrowRight,
  LineChart,
  PieChart,
  Check,
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
    setTimeout(() => {
      router.push(href);
    }, 150);
  };

  const features = [
    {
      icon: TrendingUp,
      title: 'Real-time Tracking',
      description: 'Live stock prices and instant portfolio updates',
    },
    {
      icon: BarChart3,
      title: 'Performance Analytics',
      description: 'Comprehensive metrics and gain/loss tracking',
    },
    {
      icon: PieChart,
      title: 'Allocation Charts',
      description: 'Visual breakdown of your portfolio distribution',
    },
    {
      icon: LineChart,
      title: 'Historical Charts',
      description: 'Track performance over any time period',
    },
    {
      icon: Eye,
      title: 'Watchlist',
      description: 'Monitor stocks you\'re interested in',
    },
    {
      icon: Download,
      title: 'Export Data',
      description: 'Download your data for tax reporting',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex h-14 items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900 dark:text-white">Portfolio</span>
            </Link>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleNavigation('/login')}
                disabled={isNavigating}
                className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => handleNavigation('/signup')}
                disabled={isNavigating}
                className="px-4 py-2 text-sm font-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full hover:opacity-90 transition-opacity"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-blue-500/15 to-cyan-500/15 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-emerald-500/15 to-blue-500/15 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 max-w-6xl pt-16 sm:pt-24 pb-20 sm:pb-32 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold mb-6 transition-all duration-700 ${
                mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Free Portfolio Tracker
            </div>
            <h1
              className={`text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight transition-all duration-700 delay-100 ${
                mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              Track your investments
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-blue-600 dark:from-emerald-400 dark:to-blue-400">
                with confidence
              </span>
            </h1>
            <p
              className={`text-lg sm:text-xl text-gray-600 dark:text-gray-400 mb-10 max-w-2xl mx-auto transition-all duration-700 delay-200 ${
                mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              Professional portfolio tracking with real-time data, performance analytics, and beautiful visualizations. Completely free.
            </p>
            <div
              className={`flex flex-col sm:flex-row gap-3 justify-center items-center transition-all duration-700 delay-300 ${
                mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              <button
                onClick={() => handleNavigation('/signup')}
                disabled={isNavigating}
                className="group px-8 py-3.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full font-semibold text-base hover:opacity-90 transition-all flex items-center gap-2"
              >
                Start Tracking
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => handleNavigation('/login')}
                disabled={isNavigating}
                className="px-8 py-3.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-full font-semibold text-base border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
              >
                Sign In
              </button>
            </div>
          </div>

          {/* Stats */}
          <div
            className={`grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto mt-16 transition-all duration-700 delay-400 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            {[
              { label: 'Real-time Data', value: '100%' },
              { label: 'Cost', value: 'Free' },
              { label: 'Secure', value: '100%' },
              { label: 'All Devices', value: '✓' },
            ].map((stat, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-gray-800/50 rounded-2xl p-4 border border-gray-100 dark:border-gray-700/50 text-center"
              >
                <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {stat.value}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-24 bg-white dark:bg-gray-800/30">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Everything you need
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Powerful features to help you track, analyze, and optimize your portfolio
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div
                  key={idx}
                  className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-6 border border-gray-100 dark:border-gray-700/50 hover:border-blue-200 dark:hover:border-blue-800/50 transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/10 to-emerald-500/10 dark:from-blue-500/20 dark:to-emerald-500/20 flex items-center justify-center mb-4">
                    <Icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 sm:py-24">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Get started in minutes
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Three simple steps to start tracking your portfolio
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { step: '1', title: 'Create Account', desc: 'Sign up for free in seconds' },
              { step: '2', title: 'Add Transactions', desc: 'Record your buys and sells' },
              { step: '3', title: 'Track Performance', desc: 'Watch your portfolio grow' },
            ].map((item, idx) => (
              <div key={idx} className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-600 text-white text-xl font-bold flex items-center justify-center mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-24 bg-gray-900 dark:bg-gray-800">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to start tracking?
          </h2>
          <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
            Join thousands of investors who trust Portfolio Tracker to monitor their investments.
          </p>
          <button
            onClick={() => handleNavigation('/signup')}
            disabled={isNavigating}
            className="group px-8 py-3.5 bg-white text-gray-900 rounded-full font-semibold text-base hover:opacity-90 transition-all inline-flex items-center gap-2"
          >
            Get Started Free
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-gray-950 py-8 border-t border-gray-800">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
              <span className="text-base font-bold text-white">Portfolio</span>
            </div>
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} Portfolio Tracker
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
