# Quick Start Guide

## 🚀 Get Started in 3 Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```

### 3. Open in Browser
Navigate to: http://localhost:3000

## 📝 First Steps

1. **Add Your First Transaction**
   - Click "Add Transaction" button
   - Enter a stock symbol (e.g., AAPL, MSFT, GOOGL)
   - Click "Fetch" to get current price
   - Fill in quantity and date
   - Click "Add Transaction"

2. **View Your Portfolio**
   - See your holdings in the "Holdings" tab
   - Check performance in the "Overview" tab
   - View charts and analytics

3. **Add to Watchlist**
   - Go to "Watchlist" tab
   - Click "Add" button
   - Search for stocks
   - Add stocks you want to monitor

## 🎯 Sample Data

The app comes with mock data for these stocks:
- AAPL (Apple)
- MSFT (Microsoft)
- GOOGL (Alphabet)
- AMZN (Amazon)
- TSLA (Tesla)
- META (Meta)
- NVDA (NVIDIA)

Try adding transactions for any of these symbols!

## 💡 Tips

- **Dark Mode**: Toggle the moon/sun icon in the header
- **Export Data**: Click "Export" to download your portfolio as CSV
- **Delete Transactions**: Go to Transactions tab and click delete
- **Multiple Views**: Switch between Overview, Holdings, Transactions, and Watchlist tabs

## 🔧 Troubleshooting

**Port not available?**
- Try a different port: `npm run dev -- -p 3001`

**Dependencies not installing?**
- Clear cache: `npm cache clean --force`
- Delete node_modules and package-lock.json, then reinstall

**Build errors?**
- Make sure you're using Node.js 18+
- Check that all dependencies are installed

## 📚 Next Steps

1. Read the full README.md for detailed documentation
2. Integrate a real stock API (see README for options)
3. Customize the styling to match your brand
4. Add more features from the future enhancements list

Happy tracking! 📈

