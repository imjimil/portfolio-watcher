import { Portfolio, WatchlistItem, Alert } from '@/types';
import { createClient } from '@/lib/supabase/client';

// Helper to get current user
async function getCurrentUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');
  return user;
}

// Portfolios
export async function getPortfolios(): Promise<Portfolio[]> {
  try {
    const user = await getCurrentUser();
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('portfolios')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Convert database format to Portfolio type
    return (data || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      description: p.description || undefined,
      holdings: [], // Will be calculated
      transactions: [], // Will be loaded separately
      totalValue: Number(p.total_value) || 0,
      totalCost: Number(p.total_cost) || 0,
      totalGainLoss: Number(p.total_gain_loss) || 0,
      totalGainLossPercent: Number(p.total_gain_loss_percent) || 0,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));
  } catch (error) {
    console.error('Error fetching portfolios:', error);
    return [];
  }
}

export async function savePortfolio(portfolio: Portfolio): Promise<void> {
  try {
    const user = await getCurrentUser();
    const supabase = createClient();

    const portfolioData = {
      id: portfolio.id,
      user_id: user.id,
      name: portfolio.name,
      description: portfolio.description || null,
      total_value: portfolio.totalValue,
      total_cost: portfolio.totalCost,
      total_gain_loss: portfolio.totalGainLoss,
      total_gain_loss_percent: portfolio.totalGainLossPercent,
      updated_at: new Date().toISOString(),
    };

    // Check if portfolio exists
    const { data: existing } = await supabase
      .from('portfolios')
      .select('id')
      .eq('id', portfolio.id)
      .single();

    if (existing) {
      // Update
      const { error } = await supabase
        .from('portfolios')
        .update(portfolioData)
        .eq('id', portfolio.id);

      if (error) throw error;
    } else {
      // Insert
      const { error } = await supabase
        .from('portfolios')
        .insert({
          ...portfolioData,
          created_at: portfolio.createdAt || new Date().toISOString(),
        });

      if (error) throw error;
    }

    // Save transactions separately
    if (portfolio.transactions && portfolio.transactions.length > 0) {
      await saveTransactions(portfolio.id, portfolio.transactions);
    }
  } catch (error) {
    console.error('Error saving portfolio:', error);
    throw error;
  }
}

export async function getPortfolio(id: string): Promise<Portfolio | null> {
  try {
    const user = await getCurrentUser();
    const supabase = createClient();

    const { data, error } = await supabase
      .from('portfolios')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !data) return null;

    // Load transactions
    const transactions = await getTransactions(id);

    return {
      id: data.id,
      name: data.name,
      description: data.description || undefined,
      holdings: [], // Will be calculated
      transactions,
      totalValue: Number(data.total_value) || 0,
      totalCost: Number(data.total_cost) || 0,
      totalGainLoss: Number(data.total_gain_loss) || 0,
      totalGainLossPercent: Number(data.total_gain_loss_percent) || 0,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (error) {
    console.error('Error fetching portfolio:', error);
    return null;
  }
}

export async function deletePortfolio(id: string): Promise<void> {
  try {
    const user = await getCurrentUser();
    const supabase = createClient();

    const { error } = await supabase
      .from('portfolios')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting portfolio:', error);
    throw error;
  }
}

// Transactions
async function getTransactions(portfolioId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('portfolio_id', portfolioId)
    .order('date', { ascending: true });

  if (error) throw error;

  return (data || []).map((t: any) => ({
    id: t.id,
    symbol: t.symbol,
    type: t.type as 'buy' | 'sell' | 'dividend',
    quantity: Number(t.quantity),
    price: Number(t.price),
    date: t.date,
    fees: t.fees ? Number(t.fees) : undefined,
    notes: t.notes || undefined,
  }));
}

async function saveTransactions(portfolioId: string, transactions: any[]) {
  const supabase = createClient();

  // Get existing transactions
  const { data: existing } = await supabase
    .from('transactions')
    .select('id')
    .eq('portfolio_id', portfolioId);

  const existingIds = new Set((existing || []).map((t: any) => t.id));
  const toInsert = transactions.filter(t => !existingIds.has(t.id));
  const toUpdate = transactions.filter(t => existingIds.has(t.id));

  // Insert new transactions
  if (toInsert.length > 0) {
    const { error } = await supabase
      .from('transactions')
      .insert(
        toInsert.map(t => ({
          id: t.id,
          portfolio_id: portfolioId,
          symbol: t.symbol,
          type: t.type,
          quantity: t.quantity,
          price: t.price,
          date: t.date,
          fees: t.fees || 0,
          notes: t.notes || null,
        }))
      );

    if (error) throw error;
  }

  // Update existing transactions
  for (const t of toUpdate) {
    const { error } = await supabase
      .from('transactions')
      .update({
        symbol: t.symbol,
        type: t.type,
        quantity: t.quantity,
        price: t.price,
        date: t.date,
        fees: t.fees || 0,
        notes: t.notes || null,
      })
      .eq('id', t.id);

    if (error) throw error;
  }

  // Delete transactions that are no longer in the list
  const currentIds = new Set(transactions.map(t => t.id));
  const toDelete = (existing || []).filter((t: any) => !currentIds.has(t.id));

  if (toDelete.length > 0) {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .in('id', toDelete.map((t: any) => t.id));

    if (error) throw error;
  }
}

// Watchlist
export async function getWatchlist(): Promise<WatchlistItem[]> {
  try {
    const user = await getCurrentUser();
    const supabase = createClient();

    const { data, error } = await supabase
      .from('watchlist')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((w: any) => ({
      symbol: w.symbol,
      name: w.name,
      currentPrice: Number(w.current_price) || 0,
      change: Number(w.change) || 0,
      changePercent: Number(w.change_percent) || 0,
      targetPrice: w.target_price ? Number(w.target_price) : undefined,
      notes: w.notes || undefined,
    }));
  } catch (error) {
    console.error('Error fetching watchlist:', error);
    return [];
  }
}

export async function saveWatchlist(watchlist: WatchlistItem[]): Promise<void> {
  try {
    const user = await getCurrentUser();
    const supabase = createClient();

    // Delete all existing watchlist items
    await supabase
      .from('watchlist')
      .delete()
      .eq('user_id', user.id);

    // Insert new watchlist items
    if (watchlist.length > 0) {
      const { error } = await supabase
        .from('watchlist')
        .insert(
          watchlist.map(w => ({
            user_id: user.id,
            symbol: w.symbol,
            name: w.name,
            current_price: w.currentPrice,
            change: w.change,
            change_percent: w.changePercent,
            target_price: w.targetPrice || null,
            notes: w.notes || null,
          }))
        );

      if (error) throw error;
    }
  } catch (error) {
    console.error('Error saving watchlist:', error);
    throw error;
  }
}

// Alerts
export async function getAlerts(): Promise<Alert[]> {
  try {
    const user = await getCurrentUser();
    const supabase = createClient();

    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((a: any) => ({
      id: a.id,
      symbol: a.symbol,
      type: a.type as 'price_above' | 'price_below' | 'change_percent',
      value: Number(a.value),
      isActive: a.is_active,
      triggered: a.triggered,
      createdAt: a.created_at,
    }));
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return [];
  }
}

export async function saveAlerts(alerts: Alert[]): Promise<void> {
  try {
    const user = await getCurrentUser();
    const supabase = createClient();

    // Delete all existing alerts
    await supabase
      .from('alerts')
      .delete()
      .eq('user_id', user.id);

    // Insert new alerts
    if (alerts.length > 0) {
      const { error } = await supabase
        .from('alerts')
        .insert(
          alerts.map(a => ({
            user_id: user.id,
            symbol: a.symbol,
            type: a.type,
            value: a.value,
            is_active: a.isActive,
            triggered: a.triggered,
          }))
        );

      if (error) throw error;
    }
  } catch (error) {
    console.error('Error saving alerts:', error);
    throw error;
  }
}

// Active Portfolio
export async function getActivePortfolioId(): Promise<string | null> {
  try {
    const user = await getCurrentUser();
    const supabase = createClient();

    const { data, error } = await supabase
      .from('active_portfolios')
      .select('portfolio_id')
      .eq('user_id', user.id)
      .single();

    if (error || !data) return null;
    return data.portfolio_id;
  } catch (error) {
    console.error('Error fetching active portfolio:', error);
    return null;
  }
}

export async function setActivePortfolioId(id: string | null): Promise<void> {
  try {
    const user = await getCurrentUser();
    const supabase = createClient();

    if (id) {
      const { error } = await supabase
        .from('active_portfolios')
        .upsert({
          user_id: user.id,
          portfolio_id: id,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('active_portfolios')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
    }
  } catch (error) {
    console.error('Error setting active portfolio:', error);
    throw error;
  }
}
