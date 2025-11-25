# Advanced Stock Portfolio Tracker 📈

A comprehensive, feature-rich stock portfolio tracking application built with Next.js, TypeScript, and Tailwind CSS. Perfect for showcasing your full-stack development skills in your portfolio!

## ✨ Features

### Core Features
- ✅ **Real-time Stock Price Tracking** - Get up-to-date stock prices with automatic updates
- ✅ **Portfolio Management** - Track multiple portfolios with detailed holdings
- ✅ **Transaction History** - Complete buy/sell/dividend transaction tracking
- ✅ **Advanced Analytics** - Comprehensive performance metrics and ROI calculations
- ✅ **Interactive Charts** - Beautiful visualizations with Recharts
- ✅ **Watchlist** - Monitor stocks without adding to portfolio
- ✅ **Gain/Loss Calculations** - Real-time profit/loss tracking with percentages
- ✅ **Portfolio Allocation** - Visual pie charts showing asset distribution
- ✅ **Dark Mode** - Beautiful dark theme with smooth transitions
- ✅ **Responsive Design** - Works perfectly on desktop, tablet, and mobile

### Advanced Features
- 📊 **Portfolio Performance Charts** - Historical price trends
- 📈 **Allocation Visualization** - See your portfolio distribution at a glance
- 📤 **CSV Export** - Export portfolio and transaction data
- 🔍 **Stock Search** - Quick search and add stocks to watchlist
- 💾 **Local Storage** - Data persists in browser (easily upgradeable to database)
- 🎨 **Modern UI/UX** - Clean, professional interface
- ⚡ **Fast Performance** - Optimized with Next.js 14 App Router

## 🚀 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React
- **State Management**: React Hooks + Local Storage

## 📦 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Run the development server:**
```bash
npm run dev
```

3. **Open your browser:**
Navigate to [http://localhost:3000](http://localhost:3000)

### Building for Production

```bash
npm run build
npm start
```

## 🔌 API Integration

This project uses **Yahoo Finance** public API endpoints for real-time stock data. No API key required! The app includes a production-grade implementation with smart caching and error handling.

### Yahoo Finance Integration

**No setup required!** The app uses Yahoo Finance's public query endpoints:
- Stock search: `/v1/finance/search`
- Real-time quotes: `/v8/finance/chart`
- Historical data: `/v8/finance/chart` with date ranges

**Features:**
- ✅ No API key needed - completely free
- ✅ No rate limits (within reasonable usage)
- ✅ Smart caching (1 min for quotes, 5 min for search)
- ✅ Production-grade error handling
- ✅ Optimized API usage (1 call per search, 1 call per stock lookup)
- ✅ Fast and reliable data

## 📁 Project Structure

```
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Main dashboard
│   └── globals.css         # Global styles
├── components/
│   ├── Header.tsx          # App header with theme toggle
│   ├── StatCard.tsx        # Statistics display cards
│   ├── HoldingsTable.tsx   # Portfolio holdings table
│   ├── PortfolioChart.tsx # Performance charts
│   ├── AllocationChart.tsx # Pie chart for allocation
│   ├── Watchlist.tsx       # Watchlist component
│   ├── TransactionHistory.tsx # Transaction table
│   ├── AddTransactionModal.tsx # Add transaction form
│   └── ThemeProvider.tsx   # Dark mode provider
├── lib/
│   ├── stockService.ts     # Stock data fetching (mock/API)
│   ├── storage.ts         # Local storage utilities
│   ├── utils.ts           # Helper functions
│   └── export.ts          # CSV export functionality
├── types/
│   └── index.ts           # TypeScript type definitions
└── public/                # Static assets
```

## 🎯 Key Features Explained

### Portfolio Management
- Add buy/sell/dividend transactions
- Automatic holding calculations (FIFO method)
- Real-time portfolio value updates
- Multiple portfolio support (ready for expansion)

### Analytics Dashboard
- **Total Value**: Current market value of all holdings
- **Total Cost**: Your investment cost basis
- **Gain/Loss**: Profit or loss in dollars and percentage
- **Day Change**: How your portfolio moved today

### Watchlist
- Track stocks without owning them
- Real-time price updates
- Quick add/remove functionality

### Data Export
- Export portfolio holdings to CSV
- Export transaction history to CSV
- Perfect for tax reporting or analysis

## 🎨 Customization

### Adding Real API Integration

Replace the mock functions in `lib/stockService.ts`:

```typescript
export async function getStockData(symbol: string): Promise<Stock | null> {
  const response = await fetch(
    `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${process.env.NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY}`
  );
  const data = await response.json();
  // Transform API response to Stock type
  return transformToStock(data);
}
```

### Styling
- Modify `tailwind.config.ts` for theme customization
- Update colors in `app/globals.css`
- All components use Tailwind utility classes

## 🚀 Deployment

### Vercel (Recommended)
1. Push to GitHub
2. Import project in Vercel
3. Deploy automatically

### Other Platforms
- **Netlify**: Works great with Next.js
- **AWS Amplify**: Full-stack deployment
- **Railway**: Simple deployment

## 📝 Future Enhancements

Ideas for making this even more impressive:

- [ ] Multiple portfolio support with switching
- [ ] Price alerts and notifications
- [ ] Stock comparison tool
- [ ] News integration
- [ ] Technical indicators (RSI, MACD, etc.)
- [ ] Backend API with database (PostgreSQL/MongoDB)
- [ ] User authentication
- [ ] Social features (share portfolios)
- [ ] Mobile app (React Native)
- [ ] Advanced filtering and sorting

## 🤝 Contributing

This is a portfolio project, but feel free to fork and enhance!

## 📄 License

MIT License - feel free to use this in your portfolio!

## 💡 Portfolio Tips

When showcasing this project:

1. **Highlight the Tech Stack** - Next.js 14, TypeScript, Tailwind
2. **Showcase Features** - Emphasize the advanced analytics and charts
3. **Discuss Architecture** - Explain component structure and data flow
4. **API Integration** - Mention how easy it is to swap mock data for real APIs
5. **Responsive Design** - Show it works on all devices
6. **Performance** - Fast loading, optimized code

## 🎓 Learning Outcomes

This project demonstrates:
- ✅ Modern React patterns (Hooks, Context)
- ✅ TypeScript for type safety
- ✅ Next.js App Router
- ✅ Data visualization
- ✅ State management
- ✅ Local storage persistence
- ✅ Responsive design
- ✅ Dark mode implementation
- ✅ CSV export functionality
- ✅ Complex calculations and data processing

---

**Built with ❤️ for your portfolio**

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## API Integration

This project uses **Yahoo Finance** public API endpoints - no API key required!

The app automatically fetches:
- Real-time stock quotes
- Historical price data
- Stock search results

No configuration needed - just start using it!

## Project Structure

```
├── app/              # Next.js app directory
├── components/       # React components
├── lib/             # Utilities and helpers
├── types/           # TypeScript type definitions
└── public/          # Static assets
```

## License

MIT

