import { Portfolio, WatchlistItem, Alert } from '@/types';
import { createClient } from '@/lib/supabase/client';

// Cache user to avoid repeated auth calls
let cachedUser: { user: any; timestamp: number } | null = null;
const USER_CACHE_DURATION = 60000; // 1 minute cache

// Helper to get current user (with caching)
async function getCurrentUser() {
  // Return cached user if still valid
  if (cachedUser && Date.now() - cachedUser.timestamp < USER_CACHE_DURATION) {
    return cachedUser.user;
  }
  
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');
  
  // Cache the user
  cachedUser = { user, timestamp: Date.now() };
  return user;
}

// Clear user cache (call on logout)
export function clearUserCache() {
  cachedUser = null;
}

// Portfolios
export async function getPortfolios(): Promise<Portfolio[]> {
  try {
    const user = await getCurrentUser();
    const supabase = createClient();
    
    // Fetch portfolios with transaction count
    const { data, error } = await supabase
      .from('portfolios')
      .select('*, transactions(count)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Convert database format to Portfolio type
    return (data || []).map((p: any) => {
      // Get transaction count from the nested query result
      const transactionCount = p.transactions?.[0]?.count || 0;
      
      return {
        id: p.id,
        name: p.name,
        description: p.description || undefined,
        holdings: [], // Will be calculated
        transactions: new Array(transactionCount), // Placeholder array with correct length for count display
        totalValue: Number(p.total_value) || 0,
        totalCost: Number(p.total_cost) || 0,
        totalGainLoss: Number(p.total_gain_loss) || 0,
        totalGainLossPercent: Number(p.total_gain_loss_percent) || 0,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      };
    });
  } catch (error) {
    console.error('Error fetching portfolios:', error);
    return [];
  }
}

export async function savePortfolio(portfolio: Portfolio, skipTransactions: boolean = false): Promise<void> {
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
      created_at: portfolio.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Use upsert to handle both insert and update
    const { error } = await supabase
      .from('portfolios')
      .upsert(portfolioData, {
        onConflict: 'id',
      });

    if (error) {
      console.error('Error upserting portfolio:', error);
      throw error;
    }

    // Save transactions only if not skipped and there are new transactions
    if (!skipTransactions && portfolio.transactions && portfolio.transactions.length > 0) {
      await saveTransactions(portfolio.id, portfolio.transactions);
    }
  } catch (error) {
    console.error('Error saving portfolio:', error);
    throw error;
  }
}

// Lightweight function to update just portfolio stats (no transaction sync)
export async function updatePortfolioStats(portfolioId: string, stats: {
  totalValue: number;
  totalCost: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
}): Promise<void> {
  try {
    const supabase = createClient();

    const { error } = await supabase
      .from('portfolios')
      .update({
        total_value: stats.totalValue,
        total_cost: stats.totalCost,
        total_gain_loss: stats.totalGainLoss,
        total_gain_loss_percent: stats.totalGainLossPercent,
        updated_at: new Date().toISOString(),
      })
      .eq('id', portfolioId);

    if (error) {
      console.error('Error updating portfolio stats:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error updating portfolio stats:', error);
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

    if (error || !data) {
      console.error('Error fetching portfolio data:', error);
      return null;
    }

    // Load transactions (will return empty array on error)
    const transactions = await getTransactions(id);

    return {
      id: data.id,
      name: data.name,
      description: data.description || undefined,
      holdings: [], // Will be calculated
      transactions: transactions || [], // Ensure it's always an array
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
export async function getTransactions(portfolioId: string) {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('portfolio_id', portfolioId)
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }

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
  } catch (error) {
    console.error('Error in getTransactions:', error);
    return [];
  }
}

// Insert new transactions only (for import/create)
async function saveTransactions(portfolioId: string, transactions: any[]) {
  const supabase = createClient();

  // Get existing transaction IDs
  const { data: existing } = await supabase
    .from('transactions')
    .select('id')
    .eq('portfolio_id', portfolioId);

  const existingIds = new Set((existing || []).map((t: any) => t.id));
  const toInsert = transactions.filter(t => !existingIds.has(t.id));

  // Only insert new transactions
  if (toInsert.length > 0) {
    const insertData = toInsert.map(t => ({
      id: t.id,
      portfolio_id: portfolioId,
      symbol: t.symbol,
      type: t.type,
      quantity: t.quantity,
      price: t.price,
      date: t.date,
      fees: t.fees || 0,
      notes: t.notes || null,
    }));
    
    const { error } = await supabase
      .from('transactions')
      .insert(insertData);

    if (error) {
      console.error('Error inserting transactions:', error);
      throw error;
    }
  }
}

// Update a single transaction (for edit)
export async function updateTransaction(transaction: any) {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('transactions')
    .update({
      symbol: transaction.symbol,
      type: transaction.type,
      quantity: transaction.quantity,
      price: transaction.price,
      date: transaction.date,
      fees: transaction.fees || 0,
      notes: transaction.notes || null,
    })
    .eq('id', transaction.id);

  if (error) throw error;
}

// Delete a single transaction
export async function deleteTransaction(transactionId: string) {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', transactionId);

  if (error) throw error;
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
      dateAdded: w.created_at || undefined,
      category: w.category || undefined,
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

    // Get current watchlist from DB to find items to delete
    const { data: existing } = await supabase
      .from('watchlist')
      .select('symbol')
      .eq('user_id', user.id);

    const existingSymbols = new Set((existing || []).map((w: any) => w.symbol));
    const currentSymbols = new Set(watchlist.map(w => w.symbol));

    // Delete items that are no longer in the watchlist
    const toDelete = Array.from(existingSymbols).filter(s => !currentSymbols.has(s));
    if (toDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('watchlist')
        .delete()
        .eq('user_id', user.id)
        .in('symbol', toDelete);

      if (deleteError) {
        console.error('Error deleting watchlist items:', deleteError);
        throw deleteError;
      }
    }

    // Upsert (update or insert) each item individually to avoid race conditions
    for (const item of watchlist) {
      const itemData = {
        user_id: user.id,
        symbol: item.symbol,
        name: item.name,
        current_price: item.currentPrice,
        change: item.change,
        change_percent: item.changePercent,
        target_price: item.targetPrice || null,
        notes: item.notes || null,
        updated_at: new Date().toISOString(),
      };

      // Use upsert with onConflict to handle duplicates gracefully
      const { error } = await supabase
        .from('watchlist')
        .upsert(itemData, {
          onConflict: 'user_id,symbol',
          ignoreDuplicates: false,
        });

      if (error) {
        // If it's a duplicate key error, that's okay - just skip it
        if (error.code === '23505') {
          // Duplicate key - try to update instead
          const { error: updateError } = await supabase
            .from('watchlist')
            .update(itemData)
            .eq('user_id', user.id)
            .eq('symbol', item.symbol);

          if (updateError) {
            console.error(`Error updating watchlist item ${item.symbol}:`, updateError);
          }
        } else {
          console.error(`Error upserting watchlist item ${item.symbol}:`, error);
          throw error;
        }
      }
    }
  } catch (error) {
    console.error('Error saving watchlist:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to save watchlist: ${error.message}`);
    }
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
