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
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import FeatureSection from './FeatureSection';
import CSVImportSection from './CSVImportSection';
import HowItWorksSection from './HowItWorksSection';
import BenefitsSection from './BenefitsSection';
import CTASection from './CTASection';

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
                className="px-4 py-2 bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 text-white rounded-lg font-medium hover:from-blue-500 hover:via-cyan-500 hover:to-teal-500 active:scale-95 transition-all duration-300 disabled:opacity-70 disabled:cursor-wait shadow-lg shadow-blue-500/50"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Premium Animated Gradient Background with Professional Color Science */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/15 via-indigo-500/15 via-cyan-500/15 to-teal-500/15 dark:from-blue-900/25 dark:via-indigo-900/25 dark:via-cyan-900/25 dark:to-teal-900/25 animate-gradient"></div>
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-500/10 via-blue-500/10 via-cyan-500/10 to-emerald-500/10 dark:from-slate-900/20 dark:via-blue-900/20 dark:via-cyan-900/20 dark:to-emerald-900/20 animate-gradient-reverse"></div>
        <div className="absolute inset-0 bg-gradient-to-bl from-cyan-400/8 via-teal-400/8 to-emerald-400/8 dark:from-cyan-900/15 dark:via-teal-900/15 dark:to-emerald-900/15 animate-gradient-slow"></div>
        <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm"></div>
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        {/* Animated orbs - professional blue/teal theme */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/15 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-xl opacity-60 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-cyan-500/15 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-xl opacity-60 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-teal-500/15 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-xl opacity-60 animate-blob animation-delay-4000"></div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 lg:pt-20 pb-16 sm:pb-24 lg:pb-32 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-100 via-cyan-100 to-teal-100 dark:from-blue-900/30 dark:via-cyan-900/30 dark:to-teal-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium mb-8 transition-all duration-1000 shadow-lg shadow-blue-500/20 ${
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
              <span className="block bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 dark:from-blue-400 dark:via-cyan-400 dark:to-teal-400 bg-clip-text text-transparent animate-gradient-text">
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
                className="group px-8 py-4 bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 hover:from-blue-500 hover:via-cyan-500 hover:to-teal-500 text-white rounded-lg font-semibold text-lg shadow-lg shadow-blue-500/50 hover:shadow-xl hover:shadow-blue-500/70 transform hover:scale-105 active:scale-95 transition-all duration-300 flex items-center gap-2 disabled:opacity-70 disabled:cursor-wait relative overflow-hidden"
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
                className="px-8 py-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg font-semibold text-lg border-2 border-gray-200 dark:border-gray-700 hover:border-cyan-500 dark:hover:border-cyan-500 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all duration-300 disabled:opacity-70 disabled:cursor-wait"
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
                className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-lg sm:rounded-xl p-4 sm:p-5 lg:p-6 border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl hover:shadow-blue-500/20 transition-all duration-500 hover:scale-105 hover:-translate-y-1"
              >
                <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 dark:from-blue-400 dark:via-cyan-400 dark:to-teal-400 bg-clip-text text-transparent mb-1 sm:mb-2">
                  {stat.value}
                </div>
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CSV Import Section */}
      <CSVImportSection />

      {/* Features Section */}
      <FeatureSection features={features} />

      {/* How It Works */}
      <HowItWorksSection steps={steps} />

      {/* Benefits Section */}
      <BenefitsSection benefits={benefits} />

      {/* CTA Section */}
      <CTASection />

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

