'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import CreatePortfolioModal from '@/components/CreatePortfolioModal';
import { createClient } from '@/lib/supabase/client';
import { getPortfolios, getPortfolio, getActivePortfolioId, setActivePortfolioId, deletePortfolio, savePortfolio, getTransactions } from '@/lib/storage';
import { Portfolio } from '@/types';

// Simple UUID generator for client-side
function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

import {
  User,
  Mail,
  Calendar,
  Wallet,
  TrendingUp,
  List,
  Eye,
  Download,
  Trash2,
  Edit,
  Plus,
  Check,
  X,
  AlertCircle,
  Shield,
  Settings as SettingsIcon,
  Save,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import SkeletonProfileInfo from '@/components/skeletons/SkeletonProfileInfo';
import SkeletonStats from '@/components/skeletons/SkeletonStats';
import SkeletonPortfolioList from '@/components/skeletons/SkeletonPortfolioList';
import SkeletonSidebar from '@/components/skeletons/SkeletonSidebar';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [activePortfolioId, setActivePortfolioIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPortfolios: 0,
    totalTransactions: 0,
    totalWatchlistItems: 0,
    totalValue: 0,
  });
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [deletingPortfolio, setDeletingPortfolio] = useState<string | null>(null);
  const [isCreatePortfolioModalOpen, setIsCreatePortfolioModalOpen] = useState(false);
  const [editingPortfolioId, setEditingPortfolioId] = useState<string | null>(null);
  const [editingPortfolioName, setEditingPortfolioName] = useState('');
  const [editingPortfolioDescription, setEditingPortfolioDescription] = useState('');
  const [savingPortfolio, setSavingPortfolio] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const supabase = createClient();
        
        // Get user
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) {
          router.push('/login');
          return;
        }
        setUser(currentUser);

        // Get profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single();
        
        setProfile(profileData);
        setNewName(profileData?.name || currentUser.email?.split('@')[0] || '');

        // Get portfolios with transactions
        const portfoliosData = await getPortfolios();
        // Load transactions for each portfolio
        const portfoliosWithTransactions = await Promise.all(
          portfoliosData.map(async (p) => {
            const fullPortfolio = await getPortfolio(p.id);
            if (fullPortfolio) {
              return fullPortfolio;
            }
            // Fallback: if getPortfolio fails, still try to load transactions
            const transactions = await getTransactions(p.id);
            return {
              ...p,
              transactions: transactions || [],
            };
          })
        );
        setPortfolios(portfoliosWithTransactions);

        // Get active portfolio
        const activeId = await getActivePortfolioId();
        setActivePortfolioIdState(activeId);

        // Calculate stats
        const totalTransactions = portfoliosWithTransactions.reduce((sum, p) => sum + (p.transactions?.length || 0), 0);
        const totalValue = portfoliosWithTransactions.reduce((sum, p) => sum + p.totalValue, 0);

        // Get watchlist count
        const { count: watchlistCount } = await supabase
          .from('watchlist')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', currentUser.id);

        setStats({
          totalPortfolios: portfoliosWithTransactions.length,
          totalTransactions,
          totalWatchlistItems: watchlistCount || 0,
          totalValue,
        });

        setLoading(false);
      } catch (error) {
        console.error('Error loading profile data:', error);
        setLoading(false);
      }
    };

    loadData();
  }, [router]);

  const handleUpdateName = async () => {
    if (!user || !newName.trim()) return;

    setSavingName(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('profiles')
        .update({ name: newName.trim(), updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (error) throw error;

      // Update user metadata
      await supabase.auth.updateUser({
        data: { name: newName.trim() },
      });

      setProfile((prev: any) => ({ ...prev, name: newName.trim() }));
      setEditingName(false);
    } catch (error: any) {
      console.error('Error updating name:', error);
      alert('Failed to update name: ' + (error.message || 'Unknown error'));
    } finally {
      setSavingName(false);
    }
  };

  const handleSetActivePortfolio = async (portfolioId: string) => {
    try {
      await setActivePortfolioId(portfolioId);
      setActivePortfolioIdState(portfolioId);
      router.push('/dashboard');
    } catch (error) {
      console.error('Error setting active portfolio:', error);
    }
  };

  const handleRenamePortfolio = (portfolio: Portfolio) => {
    setEditingPortfolioId(portfolio.id);
    setEditingPortfolioName(portfolio.name);
    setEditingPortfolioDescription(portfolio.description || '');
  };

  const handleSavePortfolioRename = async (portfolioId: string) => {
    if (!editingPortfolioName.trim()) {
      alert('Portfolio name cannot be empty');
      return;
    }

    setSavingPortfolio(true);
    try {
      const portfolio = portfolios.find(p => p.id === portfolioId);
      if (!portfolio) return;

      const updatedPortfolio: Portfolio = {
        ...portfolio,
        name: editingPortfolioName.trim(),
        description: editingPortfolioDescription.trim() || undefined,
        updatedAt: new Date().toISOString(),
      };

      await savePortfolio(updatedPortfolio);
      setPortfolios(portfolios.map(p => p.id === portfolioId ? updatedPortfolio : p));
      setEditingPortfolioId(null);
      setEditingPortfolioName('');
      setEditingPortfolioDescription('');
    } catch (error) {
      console.error('Error renaming portfolio:', error);
      alert('Failed to rename portfolio');
    } finally {
      setSavingPortfolio(false);
    }
  };

  const handleCancelRename = () => {
    setEditingPortfolioId(null);
    setEditingPortfolioName('');
    setEditingPortfolioDescription('');
  };

  const handleDeletePortfolio = async (portfolioId: string) => {
    if (!confirm('Are you sure you want to delete this portfolio? This action cannot be undone.')) {
      return;
    }

    setDeletingPortfolio(portfolioId);
    try {
      await deletePortfolio(portfolioId);
      setPortfolios(portfolios.filter(p => p.id !== portfolioId));
      if (activePortfolioId === portfolioId) {
        const remaining = portfolios.filter(p => p.id !== portfolioId);
        if (remaining.length > 0) {
          await setActivePortfolioId(remaining[0].id);
          setActivePortfolioIdState(remaining[0].id);
        } else {
          setActivePortfolioIdState(null);
        }
      }
    } catch (error) {
      console.error('Error deleting portfolio:', error);
      alert('Failed to delete portfolio');
    } finally {
      setDeletingPortfolio(null);
    }
  };

  const handleCreatePortfolio = async (name: string, description?: string) => {
    const newPortfolio: Portfolio = {
      id: uuid(),
      name,
      description,
      holdings: [],
      transactions: [],
      totalValue: 0,
      totalCost: 0,
      totalGainLoss: 0,
      totalGainLossPercent: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await savePortfolio(newPortfolio);
    const updatedPortfolios = await getPortfolios();
    const portfoliosWithTransactions = await Promise.all(
      updatedPortfolios.map(async (p) => {
        const fullPortfolio = await getPortfolio(p.id);
        return fullPortfolio || p;
      })
    );
    setPortfolios(portfoliosWithTransactions);

    // Update stats
    const totalTransactions = portfoliosWithTransactions.reduce((sum, p) => sum + (p.transactions?.length || 0), 0);
    const totalValue = portfoliosWithTransactions.reduce((sum, p) => sum + p.totalValue, 0);
    setStats({
      totalPortfolios: portfoliosWithTransactions.length,
      totalTransactions,
      totalWatchlistItems: stats.totalWatchlistItems,
      totalValue,
    });
  };

  const handleExportData = async () => {
    try {
      const supabase = createClient();
      
      // Export all portfolios
      const allPortfolios = await getPortfolios();
      const exportData = {
        user: {
          email: user?.email,
          name: profile?.name,
        },
        portfolios: allPortfolios,
        exportedAt: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `portfolio-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Failed to export data');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <main className="container mx-auto px-4 pt-2 pb-20 sm:pt-6 md:pb-6 max-w-6xl">
          {/* Header Skeleton */}
          <div className="mb-6 sm:mb-8 animate-pulse">
            <div className="h-9 w-64 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
            <div className="h-5 w-96 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">
              <SkeletonProfileInfo />
              <SkeletonStats />
              <SkeletonPortfolioList />
            </div>

            {/* Right Column */}
            <SkeletonSidebar />
          </div>
        </main>
      </div>
    );
  }

  const accountCreatedDate = profile?.created_at 
    ? new Date(profile.created_at).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    : 'Unknown';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main className="container mx-auto px-4 pt-2 pb-20 sm:pt-6 md:pb-6 max-w-6xl">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            Settings
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Manage your account and portfolios
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Left Column - Profile Info & Stats */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Profile Information */}
            <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700/50 p-5">
              <div className="flex items-center justify-between mb-5">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Profile
                </p>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <User className="h-6 w-6 text-white" />
                </div>
              </div>

              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Full Name
                  </label>
                  {editingName ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter your name"
                      />
                      <button
                        onClick={handleUpdateName}
                        disabled={savingName || !newName.trim()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {savingName ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingName(false);
                          setNewName(profile?.name || user?.email?.split('@')[0] || '');
                        }}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <p className="text-gray-900 dark:text-white font-medium">
                        {profile?.name || user?.email?.split('@')[0] || 'Not set'}
                      </p>
                      <button
                        onClick={() => setEditingName(true)}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </button>
                    </div>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email Address
                  </label>
                  <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span>{user?.email}</span>
                    {user?.email_confirmed_at ? (
                      <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
                        Verified
                      </span>
                    ) : (
                      <span className="ml-2 px-2 py-0.5 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded">
                        Unverified
                      </span>
                    )}
                  </div>
                </div>

                {/* Account Created */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Member Since
                  </label>
                  <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>{accountCreatedDate}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Statistics */}
            <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700/50 p-5">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">Statistics</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                  <Wallet className="h-5 w-5 text-blue-600 dark:text-blue-400 mx-auto mb-1.5" />
                  <div className="text-xl font-bold text-gray-900 dark:text-white tabular-nums">{stats.totalPortfolios}</div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wide">Portfolios</div>
                </div>
                <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                  <List className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mx-auto mb-1.5" />
                  <div className="text-xl font-bold text-gray-900 dark:text-white tabular-nums">{stats.totalTransactions}</div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wide">Trades</div>
                </div>
                <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                  <Eye className="h-5 w-5 text-purple-600 dark:text-purple-400 mx-auto mb-1.5" />
                  <div className="text-xl font-bold text-gray-900 dark:text-white tabular-nums">{stats.totalWatchlistItems}</div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wide">Watching</div>
                </div>
                <div className="text-center p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-xl">
                  <TrendingUp className="h-5 w-5 text-cyan-600 dark:text-cyan-400 mx-auto mb-1.5" />
                  <div className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">
                    {formatCurrency(stats.totalValue)}
                  </div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wide">Value</div>
                </div>
              </div>
            </div>

            {/* Portfolio Management */}
            <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700/50 p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Portfolios</p>
                <button
                  onClick={() => setIsCreatePortfolioModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:opacity-90 transition-opacity text-xs font-semibold"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New
                </button>
              </div>

              {portfolios.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No portfolios yet. Create your first portfolio to get started!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {portfolios.map((portfolio) => (
                    <div
                      key={portfolio.id}
                      className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        {editingPortfolioId === portfolio.id ? (
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Portfolio Name
                              </label>
                              <input
                                type="text"
                                value={editingPortfolioName}
                                onChange={(e) => setEditingPortfolioName(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                placeholder="Portfolio name"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Description <span className="text-gray-400">(optional)</span>
                              </label>
                              <input
                                type="text"
                                value={editingPortfolioDescription}
                                onChange={(e) => setEditingPortfolioDescription(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                placeholder="Portfolio description"
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSavePortfolioRename(portfolio.id)}
                                disabled={savingPortfolio || !editingPortfolioName.trim()}
                                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                              >
                                {savingPortfolio ? (
                                  <>
                                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span>Saving...</span>
                                  </>
                                ) : (
                                  <>
                                    <Check className="h-3 w-3" />
                                    <span>Save</span>
                                  </>
                                )}
                              </button>
                              <button
                                onClick={handleCancelRename}
                                disabled={savingPortfolio}
                                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center gap-1"
                              >
                                <X className="h-3 w-3" />
                                <span>Cancel</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                                {portfolio.name}
                              </h3>
                              {activePortfolioId === portfolio.id && (
                                <span className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
                                  Active
                                </span>
                              )}
                            </div>
                            {portfolio.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                {portfolio.description}
                              </p>
                            )}
                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                              <span>{formatCurrency(portfolio.totalValue)}</span>
                              <span>
                                {portfolio.totalGainLossPercent >= 0 ? '+' : ''}
                                {portfolio.totalGainLossPercent.toFixed(2)}%
                              </span>
                              <span>{portfolio.transactions?.length || 0} transactions</span>
                            </div>
                          </>
                        )}
                      </div>
                      {editingPortfolioId !== portfolio.id && (
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => handleRenamePortfolio(portfolio)}
                            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="Rename portfolio"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          {activePortfolioId !== portfolio.id && (
                            <button
                              onClick={() => handleSetActivePortfolio(portfolio.id)}
                              className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                              Set Active
                            </button>
                          )}
                          <button
                            onClick={() => handleDeletePortfolio(portfolio.id)}
                            disabled={deletingPortfolio === portfolio.id}
                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                            title="Delete portfolio"
                          >
                            {deletingPortfolio === portfolio.id ? (
                              <div className="w-4 h-4 border-2 border-red-600/30 border-t-red-600 rounded-full animate-spin"></div>
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Quick Actions */}
          <div className="space-y-4 sm:space-y-6">
            {/* Data Management */}
            <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700/50 p-5">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Data</p>
              <button
                onClick={handleExportData}
                className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Download className="h-5 w-5" />
                <span className="text-sm font-medium">Export All Data</span>
              </button>
            </div>

            {/* Security */}
            <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700/50 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="h-4 w-4 text-emerald-600" />
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Security</p>
              </div>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Your data is encrypted and securely stored. For password changes, use the email reset link.
                </p>
              </div>
            </div>

            {/* Help */}
            <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700/50 p-5">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Help</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Need assistance? Check documentation or contact support.
              </p>
            </div>
          </div>
        </div>
      </main>

      <CreatePortfolioModal
        isOpen={isCreatePortfolioModalOpen}
        onClose={() => setIsCreatePortfolioModalOpen(false)}
        onCreate={handleCreatePortfolio}
      />
    </div>
  );
}

