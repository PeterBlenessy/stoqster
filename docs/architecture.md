# Stoqster Architecture

## Overview

Stoqster is a Tauri-based desktop application that provides information about Swedish investment companies and funds. It follows a modern frontend architecture with Vue 3 Composition API, Quasar UI framework, and Tauri v2 for the desktop wrapper.

## Technology Stack

### Frontend
- **Framework**: Vue 3 with Composition API
- **UI Library**: Quasar Framework
- **Build Tool**: Vite
- **State Management**: Pinia
- **Routing**: Vue Router
- **Internationalization**: Vue I18n (Swedish UI)

### Backend
- **Desktop Framework**: Tauri v2
- **Language**: Rust
- **HTTP Client**: Tauri HTTP plugin with unsafe-headers feature
- **Auto-updater**: Tauri updater plugin
- **Window State**: Tauri window-state plugin
- **Process Management**: Tauri process plugin

### Data Storage
- **Large Data Storage**: LocalForage (IndexedDB/WebSQL/localStorage)
- **UI State Storage**: localStorage (immediate, synchronous persistence)
- **Cache Management**: Timestamp-based invalidation

## Storage Architecture Pattern

Stoqster uses a dual storage strategy to optimize performance and eliminate race conditions:

### **localStorage for UI State** (Immediate, Synchronous)
- **Selected quarters/dates**: `fi-selectedQuarters`, `ibi-selectedDates`
- **Component state**: Table filters, sorting, column preferences
- **Quarter/import states**: Import progress, error states, UI indicators
- **User preferences**: Settings, watchlists, alerts
- **Session state**: Current selections, form data, temporary state

**Benefits:**
- Synchronous operations - no race conditions
- Immediate persistence - state saved instantly
- Simple debugging - easily inspected in DevTools
- No async complexity for small data
- Browser-native storage with excellent performance

### **IndexedDB for Large Data** (Async, Query-able)
- **Fund records**: Arrays of fund data by quarter/date
- **Holdings data**: Detailed fund holdings information
- **Historical datasets**: Time-series data and bulk imports
- **Cache data**: API responses and processed datasets

**Benefits:**
- Handles large datasets efficiently
- Advanced querying capabilities
- Better performance for bulk operations
- Structured data with relationships

### **Storage Key Conventions**
```javascript
// localStorage keys (UI state)
'fi-selectedQuarters'        // Current quarter selection
'fi-quarterStates'          // Import/download states
'ibi-selectedCompanies'     // Selected companies
'settings-watchlists'       // User watchlists
'ui-tablePreferences'       // Table state preferences

// IndexedDB keys (large data)
'funds-2025Q1'             // Fund data for Q1 2025
'holdings-2025Q1'          // Holdings for Q1 2025
'companies-2024-12-31'     // Company data snapshot
'historical-cache-*'       // Cached API responses
```

### **Implementation Pattern**
```javascript
// ✅ Use localStorage for immediate UI state
const selectedQuarters = ref(getLocalStorage('fi-selectedQuarters', []))

// Automatic persistence with watchers
watch(selectedQuarters, () => {
  setLocalStorage('fi-selectedQuarters', selectedQuarters.value)
}, { deep: true })

// ✅ Use IndexedDB for large datasets
const saveFundsData = async (quarter, fundsArray) => {
  await fundsStore.setItem(`funds-${quarter}`, fundsArray)
}
```

## Architecture Pattern

The application follows a layered architecture with clear separation of concerns:

```
┌─────────────────────────────────────┐
│              Components             │  ← UI Layer
├─────────────────────────────────────┤
│               Stores                │  ← State Management
├─────────────────────────────────────┤
│             Composables             │  ← Business Logic
├─────────────────────────────────────┤
│            API Services             │  ← Data Access
├─────────────────────────────────────┤
│          External APIs              │  ← Data Sources
└─────────────────────────────────────┘
```

### Component Layer
- **Pages**: Route-level components (`PageIbindex.vue`, `PageFunds.vue`, etc.)
- **Components**: Reusable UI components (`ComponentIbindex.vue`, `UpdateDialog.vue`, etc.)
- **Layouts**: Application shell (`MainLayout.vue`)

### State Management (Pinia Stores)
- **Settings Store** (`settings-store.js`): User preferences, watchlists, alerts
- **Update Store** (`update-store.js`): Application update management

### Business Logic (Composables)
- **useApiRequest**: Centralized API request handling with authentication
- **useLocalStorage**: LocalForage store management (large data)
- **useLocalStorageState**: localStorage utilities (UI state)
- **useDataLoader**: Data fetching and caching logic
- **useTableState**: Table state management (sorting, filtering, columns)
- **useUpdater**: Application update logic

### API Services
- **fbindexAPI.js**: Swedish real estate investment companies (fbindex.se)
- **ibindexAPI.mjs**: Swedish investment companies (ibindex.se)
- **fiAPI.js**: Swedish fund data (Finansinspektionen)
- **stocksAPI.js**: Stock market data integration and management
- **market-data/**: Market data provider architecture
  - **BaseMarketDataProvider.js**: Abstract base class for all providers
  - **YahooFinanceProvider.js**: Yahoo Finance API integration (free)
  - **AlphaVantageProvider.js**: Alpha Vantage API integration (API key required)
  - **FinnhubProvider.js**: Finnhub API integration (API key required)
  - **FinancialModelingPrepProvider.js**: Financial Modeling Prep API (API key required)
  - **MarketDataManager.js**: Provider orchestration and fallback management
  - **FieldTranslator.js**: English to Swedish field translation
- **helpers.js**: Common API utilities

## Data Flow

### 1. API Request Flow
```
Component → Store → Composable → API Service → External API
                              ↓
                         IndexedDB Cache (large data)
```

### 2. UI State Flow
```
User Action → Component → Store → localStorage (immediate)
                                ↓
                           Reactive Update
```

### 3. Data Persistence Flow
```
UI State → localStorage (immediate)
Large Data → IndexedDB (async)
Settings → localStorage (preferences)
Cache → IndexedDB (API responses)
```

### 4. Update Flow
```
Startup/Timer → useUpdater → Tauri Updater → Notification → User Action
```

### 3. Data Persistence
```
User Action → Store → localStorage (settings)
Data Fetch → Composable → LocalForage (cached data)
```

## External API Integrations

### IBIndex API (ibindex.se)
- **Purpose**: Swedish investment companies data
- **Data**: Company listings, holdings, events, rebate/premium calculations
- **Format**: XML data converted to JSON
- **Authentication**: Cookie-based session management

### FBIndex API (fbindex.se)
- **Purpose**: Swedish real estate investment companies
- **Data**: Company information and holdings
- **Encoding**: ISO-8859-1 with automatic detection and conversion
- **Authentication**: Cookie-based session management

### FI API (fi.se)
- **Purpose**: Swedish fund data from Finansinspektionen
- **Data**: Quarterly fund holdings
- **Format**: ZIP archives containing XML files
- **Processing**: Unzip → XML parsing → JSON conversion

### Market Data APIs (Multi-provider)
- **Purpose**: Real-time stock market data from multiple providers
- **Providers**: Yahoo Finance, Alpha Vantage, Finnhub, Financial Modeling Prep
- **Architecture**: Modular provider system with fallback capabilities
- **Features**: Rate limiting, error handling, data standardization
- **Configuration**: Provider-specific API key management
- **Format**: Standardized JSON format across all providers
- **Documentation**: See [Market Data API Architecture](api-integrations/market-data-api-architecture.md)

## State Management Strategy

### Reactive State (Pinia)
- User settings and preferences
- Application configuration
- UI state (dark mode, visible columns, etc.)
- Watchlists and alerts

### Persistent Storage (LocalForage)
- Cached API responses
- Historical data
- Large datasets (fund holdings, company data)

### Session Storage (localStorage)
- Update check timestamps
- Temporary UI state
- User preferences

## Security Considerations

### API Security
- Cookie-based authentication for external APIs
- CORS compliance with proper headers
- Request validation and error handling
- Secure storage practices

### Application Security
- Tauri's security model with capability-based permissions
- Sandboxed frontend environment
- Controlled backend API access

## Performance Optimizations

### Caching Strategy
- Timestamp-based cache invalidation
- LocalForage for large datasets
- Selective data refreshing based on user interaction

### UI Performance
- Lazy loading of components
- Efficient table rendering with virtualization
- Debounced search and filtering
- Optimistic UI updates

### Memory Management
- Cleanup of unused data
- Efficient store management
- Resource disposal in component lifecycle

## Development Patterns

### Component Architecture
```vue
<script setup>
// Vue imports first
import { ref, onMounted } from 'vue'
// Third-party imports
import { useQuasar } from 'quasar'
// Local imports
import { useStore } from 'src/stores/store'
</script>
```

### Error Handling
- Try/catch blocks for all async operations
- User-friendly error messages in Swedish
- Comprehensive logging with emoji prefixes
- Graceful degradation for API failures

### Logging Strategy
- Emoji-prefixed console messages for debugging
- Structured error reporting
- Performance monitoring for API calls
- User action tracking for UX improvements

## File Structure

```
src/
├── api/                    # External API integrations
│   ├── market-data/        # Market data provider architecture
│   │   ├── BaseMarketDataProvider.js
│   │   ├── YahooFinanceProvider.js
│   │   ├── AlphaVantageProvider.js
│   │   ├── FinnhubProvider.js
│   │   ├── FinancialModelingPrepProvider.js
│   │   ├── MarketDataManager.js
│   │   ├── FieldTranslator.js
│   │   └── index.js
│   ├── fbindexAPI.js       # FBIndex API integration
│   ├── ibindexAPI.mjs      # IBIndex API integration
│   ├── fiAPI.js           # FI API integration
│   ├── stocksAPI.js       # Stock market data integration
│   └── helpers.js         # Common API utilities
├── components/             # Reusable UI components
│   ├── ComponentGeneralSettings.vue    # General app settings
│   ├── ComponentMarketDataSettings.vue # Market data provider settings
│   ├── ComponentStocks.vue             # Stock listings table
│   ├── ComponentStockOwnership.vue     # Fund ownership details
│   └── ...                            # Other components
├── composables/           # Business logic and utilities
├── i18n/                  # Internationalization
├── layouts/               # Application layouts
├── pages/                 # Route-level components
│   ├── PageStocks.vue     # Stocks page
│   └── ...               # Other pages
├── router/                # Vue Router configuration
├── stores/                # Pinia state management
├── App.vue                # Root component
├── main.js                # Application entry point
└── styles.css             # Global styles
```

## Build and Deployment

### Development
- Vite development server with hot reloading
- Tauri development mode for desktop testing
- ESLint for code quality

### Production
- Vite production build with optimization
- Tauri bundle creation for different platforms
- Automated release process with GitHub Actions
- Version management with semantic versioning

## Future Architecture Considerations

### Scalability
- Component library for better reusability
- Micro-frontend architecture for larger features
- Plugin system for extensibility

### Performance
- Web Workers for heavy data processing
- Service Worker for offline functionality
- Progressive loading strategies

### Maintainability
- TypeScript migration for better type safety
- Automated testing infrastructure
- Documentation generation from code