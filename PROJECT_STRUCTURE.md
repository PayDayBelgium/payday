# PayDay Web - Project Structure

## Overview
This document describes the reorganized project structure for better maintainability and code organization.

## Directory Structure

```
src/
├── pages/                    # Page components organized by feature
│   ├── index.ts             # Central export file for all pages
│   ├── auth/                # Authentication pages
│   │   └── LoginPage.tsx
│   ├── dashboard/           # Dashboard page
│   │   └── Dashboard.tsx
│   ├── portfolios/             # Portfolio-related pages
│   │   ├── PortfolioManagement.tsx
│   │   ├── PortfolioDetail.tsx
│   │   └── PortfolioDataEntry.tsx
│   ├── strategies/          # Trading strategy pages
│   │   ├── PMCCStrategy.tsx
│   │   ├── SpreadsStrategy.tsx
│   │   ├── CSPStrategy.tsx
│   │   └── KaChingStrategy.tsx
│   ├── tools/               # Calculator and tool pages
│   │   ├── PMCCCalculator.tsx
│   │   ├── KaChingCalculator.tsx
│   │   └── MonthlyIncomeCalculator.tsx
│   ├── settings/            # Settings pages
│   │   ├── IBSettings.tsx
│   │   ├── AccountSettings.tsx
│   │   └── RulesManagement.tsx
│   ├── journal/             # Journal and todos
│   │   ├── Journal.tsx
│   │   └── Todos.tsx
│   ├── tickers/             # Ticker overview
│   │   └── TickersOverview.tsx
│   └── help/                # Help and documentation
│       └── HelpPortal.tsx
│
├── components/              # Reusable components organized by type
│   ├── index.ts            # Central export file for all components
│   ├── layout/             # Layout components
│   │   ├── Layout.tsx
│   │   ├── Header.tsx
│   │   └── Sidebar.tsx
│   ├── modals/             # Modal dialogs
│   │   ├── ImageCropModal.tsx
│   │   ├── ConfirmDialog.tsx
│   │   ├── AddLeapModal.tsx
│   │   └── AddCoveredCallModal.tsx
│   ├── forms/              # Form components
│   │   └── DailyRoutineForm.tsx
│   ├── charts/             # Chart and data visualization components
│   │   ├── DailyDataTimeline.tsx
│   │   └── HistoricalDataView.tsx
│   ├── widgets/            # Dashboard widgets
│   │   ├── TodoListWidget.tsx
│   │   ├── GoalsOverview.tsx
│   │   └── StatCard.tsx
│   └── common/             # Common/shared components
│       ├── LoadingOverlay.tsx
│       └── IBConnectionStatus.tsx
│
├── assets/                  # Static assets
│   ├── app/                # Application assets
│   │   └── logo.png
│   └── Portfolios/            # Portfolio logos
│       ├── Saxo.png
│       ├── DeGiro.png
│       ├── Lynx.png
│       ├── IBKR.jpeg
│       └── Bolero.png
│
├── store/                   # Redux store
│   ├── index.ts
│   └── slices/
│       ├── authSlice.ts
│       ├── portfoliosSlice.ts
│       ├── positionsSlice.ts
│       ├── tradesSlice.ts
│       ├── rulesSlice.ts
│       ├── journalSlice.ts
│       └── todosSlice.ts
│
├── hooks/                   # Custom React hooks
├── contexts/                # React contexts
├── utils/                   # Utility functions
├── constants/               # Constants and configuration
├── types/                   # TypeScript type definitions
└── locales/                 # i18n translations

```

## Import Patterns

### Page Imports
```typescript
// Import from the centralized index file
import {
  Dashboard,
  PortfolioManagement,
  PMCCStrategy,
  // ... etc
} from './pages';

// Or import directly from the module
import { Dashboard } from './pages/dashboard/Dashboard';
```

### Component Imports
```typescript
// Import from the centralized index file
import {
  Layout,
  Header,
  ImageCropModal,
  TodoListWidget,
  // ... etc
} from './components';

// Or import directly from the module
import { Layout } from './components/layout/Layout';
import { ImageCropModal } from './components/modals/ImageCropModal';
```

## Benefits

1. **Better Organization**: Files are grouped by feature/type making them easier to find
2. **Clearer Responsibilities**: Each directory has a specific purpose
3. **Easier Maintenance**: Related files are co-located
4. **Improved Scalability**: Easy to add new features without cluttering directories
5. **Central Exports**: Index files provide a clean import API

## Migration Notes

- All page and component files have been moved to their respective subdirectories
- Import paths have been updated throughout the application
- Logo asset moved to `assets/app/logo.png` for better organization
- Central index.ts files created for cleaner imports
