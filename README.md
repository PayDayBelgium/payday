# PayDay Trading Tracker

A modern, professional React/TypeScript trading tracker for managing options strategies. Built to replace Excel-based trade management with a beautiful, intuitive interface.

## Features

### ✅ Implemented
- **Modern UI**: Dark mode, Bloomberg/Trading View inspired design
- **Fixed Sidebar Navigation**: Quick access to all portfolios and strategies
- **Dashboard**: Portfolio overview with portfolio summaries and charts
  - Real-time stats (total value, uncovered positions, weekly/yearly returns)
  - Portfolio comparison table
  - Portfolio allocation charts
  - Critical alerts
- **Poor Man's Covered Call Module**:
  - LEAP and stock position tracking
  - Covered calls management
  - Color-coded warnings (expiring positions, ITM, profit targets)
  - Coverage analysis
- **Redux State Management**: Full application state with TypeScript
- **Mock Data**: Pre-loaded demo data to explore features

### 🚧 Coming Soon
- Real-time market data integration (Interactive Brokers)
- Advanced trade history and P/L analytics

## Tech Stack

- **React 19** with **TypeScript**
- **Redux Toolkit** for state management
- **React Router** for navigation
- **Vite** for blazing fast builds
- **Tailwind CSS** for styling
- **Recharts** for data visualization
- **date-fns** for date handling
- **Lucide React** for icons

## Getting Started

### Prerequisites
- Node.js 18+ and npm

### Installation

1. Clone the repository or navigate to the project folder:
```bash
cd C:\Development\PayDay\payday-web
```

2. Dependencies are already installed, but if needed:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to the URL shown (typically http://localhost:3000)

### Build for Production

```bash
npm run build
```

The production-ready files will be in the `dist` folder.

## Project Structure

```
payday-web/
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── Layout.tsx    # Main app layout
│   │   └── Sidebar.tsx   # Navigation sidebar
│   ├── pages/            # Page components
│   │   ├── Dashboard.tsx # Main dashboard
│   │   └── PMCCStrategy.tsx # Poor Man's Covered Call page
│   ├── store/            # Redux state management
│   │   ├── index.ts      # Store configuration
│   │   └── slices/       # Redux slices
│   │       ├── positionsSlice.ts
│   │       ├── tradesSlice.ts
│   │       ├── portfoliosSlice.ts
│   │       ├── alertsSlice.ts
│   │       └── rulesSlice.ts
│   ├── types/            # TypeScript type definitions
│   │   └── index.ts      # All trading types
│   ├── hooks/            # Custom React hooks
│   ├── utils/            # Utility functions
│   │   └── mockData.ts   # Demo data
│   ├── App.tsx           # Main app component
│   └── main.tsx          # App entry point
├── public/               # Static assets
└── package.json          # Dependencies and scripts
```

## Color-Coded Warning System

The app uses visual indicators to help you spot risks and opportunities:

- 🟢 **Green**: Profitable, safe, or action recommended (e.g., 80%+ profit captured)
- 🟠 **Orange**: Warning, attention needed (e.g., expiring in 2 weeks)
- 🔴 **Red**: Critical, urgent action needed (e.g., expiring in 1 week, ITM positions)
- 🔵 **Blue**: Informational
- ⚪ **Gray**: Neutral or closed positions

## Portfolios Supported

- **Lynx**
- **FreeStoxx**
- **DeGiro**
- **SAXO**

Each portfolio has its own section with dedicated strategy tracking.

## Development Roadmap

See [docs/CODE-REVIEW-2026-06.md](docs/CODE-REVIEW-2026-06.md) for the current code review and phased refactor plan.

### Phase 1: Foundation (✅ Complete)
- Project setup
- Layout and navigation
- Dashboard
- Poor Man's Covered Call module

### Phase 2: Core Strategies (Next)
- Spreads module
- Cash Secured Puts
- KaChing strategy

### Phase 3: Analytics
- Trade history
- P/L tracking and charts
- Export functionality

### Phase 4: Advanced Features
- Rules engine
- Smart suggestions
- Data import

## Contributing

This is a personal project, but suggestions and feedback are welcome!

## License

Private use only.

## Screenshots

(Screenshots coming soon - the app is running with beautiful dark mode UI!)

---

Built with ❤️ to replace Excel and make trading more efficient
