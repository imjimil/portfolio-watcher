'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  BarChart3,
  Eye,
  Shield,
  Zap,
  LineChart,
  PieChart,
  ArrowRight,
  ChevronRight,
  Star,
  Users,
  Globe,
  Lock,
  Smartphone,
  Check,
  ArrowUpRight,
  Twitter,
  Github,
  Mail,
} from 'lucide-react';

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavigation = (href: string) => {
    setIsNavigating(true);
    setTimeout(() => {
      router.push(href);
    }, 150);
  };

  const features = [
    {
      icon: LineChart,
      title: 'Real-Time Analytics',
      description: 'Track every movement with live market data and instant portfolio updates. Never miss a beat.',
      gradient: 'from-emerald-500 to-teal-500',
    },
    {
      icon: PieChart,
      title: 'Portfolio Insights',
      description: 'Beautiful visualizations show your allocation, diversification score, and risk exposure.',
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      icon: BarChart3,
      title: 'Performance Tracking',
      description: 'Compare your returns against benchmarks. Track gains, losses, and dividends over any period.',
      gradient: 'from-violet-500 to-purple-500',
    },
    {
      icon: Eye,
      title: 'Smart Watchlists',
      description: 'Monitor potential investments with price alerts, target tracking, and quick comparisons.',
      gradient: 'from-orange-500 to-amber-500',
    },
    {
      icon: Shield,
      title: 'Bank-Level Security',
      description: 'Your data is encrypted and secure. We never sell your information or share it with third parties.',
      gradient: 'from-rose-500 to-pink-500',
    },
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Built for speed. Load your entire portfolio in milliseconds, not seconds.',
      gradient: 'from-yellow-500 to-orange-500',
    },
  ];

  const stats = [
    { value: '50K+', label: 'Active Users', icon: Users },
    { value: '$2.5B+', label: 'Assets Tracked', icon: TrendingUp },
    { value: '99.9%', label: 'Uptime', icon: Zap },
    { value: '150+', label: 'Countries', icon: Globe },
  ];

  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'Day Trader',
      avatar: 'SC',
      content: 'Finally, a portfolio tracker that actually looks good and works fast. I\'ve tried everything else - this is the one.',
      rating: 5,
    },
    {
      name: 'Marcus Williams',
      role: 'Long-term Investor',
      avatar: 'MW',
      content: 'The historical performance charts are incredible. I can see exactly how my portfolio has grown over the years.',
      rating: 5,
    },
    {
      name: 'Elena Rodriguez',
      role: 'Financial Advisor',
      avatar: 'ER',
      content: 'I recommend this to all my clients. Clean interface, accurate data, and the export features are perfect for tax season.',
      rating: 5,
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0">
        {/* Gradient Mesh */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-violet-900/15 via-transparent to-transparent" />
        
        {/* Animated Orbs */}
        <div 
          className="absolute w-[500px] h-[500px] rounded-full bg-emerald-500/10 blur-[120px] animate-pulse"
          style={{ 
            top: '10%', 
            left: '20%',
            transform: `translate(${scrollY * 0.02}px, ${scrollY * 0.01}px)`,
          }} 
        />
        <div 
          className="absolute w-[400px] h-[400px] rounded-full bg-blue-500/10 blur-[100px] animate-pulse"
          style={{ 
            top: '40%', 
            right: '10%',
            animationDelay: '1s',
            transform: `translate(${-scrollY * 0.015}px, ${scrollY * 0.02}px)`,
          }} 
        />
        <div 
          className="absolute w-[300px] h-[300px] rounded-full bg-violet-500/10 blur-[80px] animate-pulse"
          style={{ 
            bottom: '20%', 
            left: '30%',
            animationDelay: '2s',
            transform: `translate(${scrollY * 0.01}px, ${-scrollY * 0.015}px)`,
          }} 
        />

        {/* Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '64px 64px',
          }}
        />

        {/* Noise Texture */}
        <div className="absolute inset-0 opacity-[0.03] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIzMDAiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iMSIvPjwvc3ZnPg==')]" />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50">
        <div 
          className={`transition-all duration-300 ${
            scrollY > 50 
              ? 'bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5' 
              : 'bg-transparent'
          }`}
        >
          <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
            <div className="flex h-16 sm:h-20 items-center justify-between">
              <Link href="/" className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold tracking-tight">Portfolio</span>
              </Link>
              
              {/* Desktop Nav */}
              <nav className="hidden md:flex items-center gap-8">
                <a href="#features" className="text-sm text-gray-400 hover:text-white transition-colors">Features</a>
                <a href="#testimonials" className="text-sm text-gray-400 hover:text-white transition-colors">Reviews</a>
                <a href="#pricing" className="text-sm text-gray-400 hover:text-white transition-colors">Pricing</a>
              </nav>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleNavigation('/login')}
                  disabled={isNavigating}
                  className="hidden sm:block text-sm font-medium text-gray-300 hover:text-white transition-colors px-4 py-2"
                >
                  Sign In
                </button>
                <button
                  onClick={() => handleNavigation('/signup')}
                  disabled={isNavigating}
                  className="px-5 py-2.5 text-sm font-semibold bg-white text-black rounded-full hover:bg-gray-100 transition-all hover:scale-105 active:scale-100"
                >
                  Get Started
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 sm:pt-40 pb-20 sm:pb-32">
        <div className="container mx-auto px-4 sm:px-6 max-w-7xl relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm mb-8 transition-all duration-1000 ${
                mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
              }`}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-sm text-gray-300">Trusted by 50,000+ investors worldwide</span>
            </div>

            {/* Headline */}
            <h1
              className={`text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6 transition-all duration-1000 delay-100 ${
                mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              Your wealth,
              <br />
              <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
                beautifully tracked
              </span>
            </h1>

            {/* Subheadline */}
            <p
              className={`text-lg sm:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed transition-all duration-1000 delay-200 ${
                mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              The most powerful portfolio tracker for serious investors. 
              Real-time data, stunning analytics, and insights that help you make smarter decisions.
            </p>

            {/* CTA Buttons */}
            <div
              className={`flex flex-col sm:flex-row gap-4 justify-center items-center mb-16 transition-all duration-1000 delay-300 ${
                mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              <button
                onClick={() => handleNavigation('/signup')}
                disabled={isNavigating}
                className="group w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-full font-semibold text-base hover:from-emerald-400 hover:to-emerald-500 transition-all shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-105 active:scale-100 flex items-center justify-center gap-2"
              >
                Start Free Trial
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => handleNavigation('/login')}
                disabled={isNavigating}
                className="w-full sm:w-auto px-8 py-4 bg-white/5 text-white rounded-full font-semibold text-base border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-2"
              >
                Watch Demo
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>

            {/* Stats Row */}
            <div
              className={`grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 transition-all duration-1000 delay-400 ${
                mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              {stats.map((stat, idx) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={idx}
                    className="relative group"
                  >
                    <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative bg-white/[0.03] backdrop-blur-sm border border-white/5 rounded-2xl p-4 sm:p-6 hover:border-white/10 transition-colors">
                      <Icon className="h-5 w-5 text-gray-500 mb-3 mx-auto" />
                      <div className="text-2xl sm:text-3xl font-bold mb-1">{stat.value}</div>
                      <div className="text-xs sm:text-sm text-gray-500">{stat.label}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dashboard Preview */}
          <div
            className={`mt-20 sm:mt-28 relative transition-all duration-1000 delay-500 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            {/* Glow Effect */}
            <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/20 via-blue-500/20 to-violet-500/20 rounded-3xl blur-2xl opacity-50" />
            
            {/* Browser Frame */}
            <div className="relative bg-[#12121a] rounded-2xl sm:rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
              {/* Browser Header */}
              <div className="flex items-center gap-2 px-4 py-3 bg-white/5 border-b border-white/5">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="px-4 py-1 bg-white/5 rounded-full text-xs text-gray-500">
                    portfolio-tracker.app
                  </div>
                </div>
              </div>
              
              {/* Dashboard Mockup */}
              <div className="p-4 sm:p-8">
                <div className="grid grid-cols-12 gap-4 sm:gap-6">
                  {/* Main Chart Area */}
                  <div className="col-span-12 lg:col-span-8 bg-white/[0.02] rounded-xl p-4 sm:p-6 border border-white/5">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <div className="text-2xl sm:text-3xl font-bold">$127,845.32</div>
                        <div className="text-emerald-400 text-sm flex items-center gap-1 mt-1">
                          <TrendingUp className="h-4 w-4" />
                          +$12,458.00 (10.8%) today
                        </div>
                      </div>
                      <div className="hidden sm:flex gap-2">
                        {['1D', '1W', '1M', '3M', 'YTD', '1Y'].map((period, i) => (
                          <button
                            key={period}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              i === 2 ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-500 hover:text-gray-300'
                            }`}
                          >
                            {period}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Chart Placeholder */}
                    <div className="h-48 sm:h-64 relative">
                      <svg viewBox="0 0 400 150" className="w-full h-full" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="rgb(16, 185, 129)" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="rgb(16, 185, 129)" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <path
                          d="M0,120 Q50,110 100,90 T200,70 T300,50 T400,30"
                          fill="none"
                          stroke="rgb(16, 185, 129)"
                          strokeWidth="2"
                        />
                        <path
                          d="M0,120 Q50,110 100,90 T200,70 T300,50 T400,30 L400,150 L0,150 Z"
                          fill="url(#chartGradient)"
                        />
                      </svg>
                    </div>
                  </div>
                  
                  {/* Side Panel */}
                  <div className="col-span-12 lg:col-span-4 space-y-4 sm:space-y-6">
                    {/* Holdings */}
                    <div className="bg-white/[0.02] rounded-xl p-4 border border-white/5">
                      <div className="text-sm font-medium text-gray-400 mb-4">Top Holdings</div>
                      {[
                        { symbol: 'AAPL', name: 'Apple Inc', value: '$24,350', change: '+2.4%', positive: true },
                        { symbol: 'MSFT', name: 'Microsoft', value: '$18,920', change: '+1.8%', positive: true },
                        { symbol: 'GOOGL', name: 'Alphabet', value: '$15,640', change: '-0.5%', positive: false },
                      ].map((stock, i) => (
                        <div key={i} className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
                          <div>
                            <div className="font-medium text-sm">{stock.symbol}</div>
                            <div className="text-xs text-gray-500">{stock.name}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-sm">{stock.value}</div>
                            <div className={`text-xs ${stock.positive ? 'text-emerald-400' : 'text-red-400'}`}>
                              {stock.change}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Allocation */}
                    <div className="bg-white/[0.02] rounded-xl p-4 border border-white/5">
                      <div className="text-sm font-medium text-gray-400 mb-4">Allocation</div>
                      <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-full border-4 border-emerald-500 border-t-blue-500 border-l-violet-500" />
                        <div className="space-y-2 text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="text-gray-400">Tech 45%</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            <span className="text-gray-400">Finance 30%</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-violet-500" />
                            <span className="text-gray-400">Health 25%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-24 sm:py-32">
        <div className="container mx-auto px-4 sm:px-6 max-w-7xl relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-gray-400 mb-6">
              <Zap className="h-3 w-3" />
              Powerful Features
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold mb-4">
              Everything you need to
              <br />
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                master your investments
              </span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Built by investors, for investors. Every feature is designed to give you 
              the edge in managing your portfolio.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div
                  key={idx}
                  className="group relative"
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative bg-white/[0.02] backdrop-blur-sm border border-white/5 rounded-xl sm:rounded-2xl p-4 sm:p-8 hover:border-white/10 transition-all duration-500 h-full">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-3 sm:mb-5 shadow-lg`}>
                      <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                    <h3 className="text-sm sm:text-lg font-semibold mb-1.5 sm:mb-3">{feature.title}</h3>
                    <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Social Proof / Testimonials */}
      <section id="testimonials" className="relative py-24 sm:py-32">
        <div className="container mx-auto px-4 sm:px-6 max-w-7xl relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-gray-400 mb-6">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              Loved by Investors
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold mb-4">
              Join thousands of
              <br />
              <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                happy investors
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, idx) => (
              <div
                key={idx}
                className="bg-white/[0.02] backdrop-blur-sm border border-white/5 rounded-2xl p-6 sm:p-8 hover:border-white/10 transition-colors"
              >
                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                
                {/* Quote */}
                <p className="text-gray-300 mb-6 leading-relaxed">&ldquo;{testimonial.content}&rdquo;</p>
                
                {/* Author */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center text-sm font-semibold">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{testimonial.name}</div>
                    <div className="text-xs text-gray-500">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative py-24 sm:py-32">
        <div className="container mx-auto px-4 sm:px-6 max-w-7xl relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 mb-6">
              <Zap className="h-3 w-3" />
              Limited Time Offer
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold mb-4">
              Simple, transparent
              <br />
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                pricing
              </span>
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Start free, upgrade when you&apos;re ready. No hidden fees, no surprises.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Free Plan */}
            <div className="flex flex-col bg-white/[0.02] border border-white/5 rounded-2xl p-8 hover:border-white/10 transition-colors">
              <div className="text-sm font-medium text-gray-400 mb-2">Starter</div>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-gray-500">/month</span>
              </div>
              <p className="text-sm text-gray-400 mb-6">Perfect for getting started with portfolio tracking.</p>
              
              <ul className="space-y-3 mb-8 flex-grow">
                {[
                  'Up to 2 portfolios',
                  'Real-time stock prices',
                  'Basic performance charts',
                  'Watchlist (10 stocks)',
                  'Mobile app access',
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-gray-300">
                    <Check className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleNavigation('/signup')}
                className="w-full py-3 px-4 bg-white/5 border border-white/10 rounded-xl font-semibold text-sm hover:bg-white/10 transition-colors mt-auto"
              >
                Get Started Free
              </button>
            </div>

            {/* Pro Plan */}
            <div className="relative flex flex-col bg-gradient-to-b from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-2xl p-8">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <div className="px-3 py-1 bg-emerald-500 rounded-full text-xs font-semibold text-black">
                  Most Popular
                </div>
              </div>
              
              <div className="text-sm font-medium text-emerald-400 mb-2">Pro</div>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-4xl font-bold">$9</span>
                <span className="text-gray-500">/month</span>
              </div>
              <p className="text-sm text-gray-400 mb-6">For serious investors who want the full experience.</p>
              
              <ul className="space-y-3 mb-8 flex-grow">
                {[
                  'Unlimited portfolios',
                  'Real-time data + pre/post market',
                  'Advanced analytics & insights',
                  'Unlimited watchlists',
                  'Export to CSV/PDF',
                  'Priority support',
                  'API access',
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-gray-300">
                    <Check className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleNavigation('/signup')}
                className="w-full py-3 px-4 bg-emerald-500 rounded-xl font-semibold text-sm text-black hover:bg-emerald-400 transition-colors mt-auto"
              >
                Start 14-Day Free Trial
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative py-24 sm:py-32">
        <div className="container mx-auto px-4 sm:px-6 max-w-4xl relative z-10">
          <div className="relative bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-violet-500/10 rounded-3xl p-8 sm:p-12 border border-white/10 overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1/2 bg-emerald-500/20 blur-[100px]" />
            
            <div className="relative text-center">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Ready to take control of your wealth?
              </h2>
              <p className="text-gray-400 mb-8 max-w-xl mx-auto">
                Join over 50,000 investors who trust Portfolio to track and grow their investments.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => handleNavigation('/signup')}
                  className="group px-8 py-4 bg-white text-black rounded-full font-semibold hover:bg-gray-100 transition-all hover:scale-105 active:scale-100 flex items-center justify-center gap-2"
                >
                  Start Your Free Trial
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-4">No credit card required • Free forever plan available</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-white/5 py-12 sm:py-16">
        <div className="container mx-auto px-4 sm:px-6 max-w-7xl relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <Link href="/" className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold">Portfolio</span>
              </Link>
              <p className="text-sm text-gray-500 mb-4">
                The modern portfolio tracker for serious investors.
              </p>
              <div className="flex gap-3">
                <a href="#" className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                  <Twitter className="h-4 w-4 text-gray-400" />
                </a>
                <a href="#" className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                  <Github className="h-4 w-4 text-gray-400" />
                </a>
                <a href="#" className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                  <Mail className="h-4 w-4 text-gray-400" />
                </a>
              </div>
            </div>

            {/* Links */}
            <div>
              <div className="text-sm font-semibold mb-4">Product</div>
              <ul className="space-y-3 text-sm text-gray-400">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Integrations</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Changelog</a></li>
              </ul>
            </div>

            <div>
              <div className="text-sm font-semibold mb-4">Company</div>
              <ul className="space-y-3 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Press</a></li>
              </ul>
            </div>

            <div>
              <div className="text-sm font-semibold mb-4">Legal</div>
              <ul className="space-y-3 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Cookies</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} Portfolio Tracker. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <Lock className="h-3 w-3" />
                256-bit SSL encryption
              </span>
              <span className="flex items-center gap-1.5">
                <Shield className="h-3 w-3" />
                SOC 2 Compliant
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
