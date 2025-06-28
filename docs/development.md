# Development Guide

This guide provides comprehensive instructions for setting up and contributing to the Stoqster project.

## Prerequisites

### Required Tools
- **Node.js**: Version 18+ (check with `node --version`)
- **Yarn**: Package manager (install with `npm install -g yarn`)
- **Rust**: Latest stable toolchain
- **Git**: Version control

### Platform-Specific Requirements

#### macOS
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Node.js via Homebrew
brew install node

# Install Yarn
npm install -g yarn
```

#### Windows
```bash
# Install Rust (download from rustup.rs)
# Install Node.js (download from nodejs.org)
# Install Yarn
npm install -g yarn
```

#### Linux (Ubuntu/Debian)
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Yarn
npm install -g yarn
```

## Project Setup

### 1. Clone the Repository
```bash
git clone https://github.com/PeterBlenessy/stoqster.git
cd stoqster
```

### 2. Install Dependencies
```bash
# Install frontend dependencies
yarn install

# Install Tauri CLI if not already installed
cargo install tauri-cli
```

### 3. Verify Installation
```bash
# Check if all tools are available
node --version
yarn --version
rustc --version
cargo --version
```

## Development Workflow

### Starting Development Server
```bash
# Start the development server with hot reloading
yarn tauri dev

# This will:
# - Start Vite development server on http://localhost:5173
# - Launch Tauri development window
# - Enable hot reloading for both frontend and backend
```

### Building the Application
```bash
# Build for production
yarn tauri build

# This creates optimized bundles in the dist/ directory
```

## Project Structure Understanding

### Frontend Structure (src/)
```
src/
├── api/                    # External API integrations
│   ├── fbindexAPI.js      # Real estate companies API
│   ├── ibindexAPI.mjs     # Investment companies API
│   ├── fiAPI.js           # Finansinspektionen API
│   └── helpers.js         # Common API utilities
├── components/             # Reusable UI components
│   ├── Component*.vue     # Main feature components
│   ├── *Dialog.vue        # Modal dialogs
│   └── TableToolbar.vue   # Shared table controls
├── composables/           # Business logic
│   ├── useApiRequest.js   # Centralized API handling
│   ├── useLocalStorage.js # Data persistence
│   ├── useDataLoader.js   # Data fetching logic
│   ├── useTableState.js   # Table state management
│   └── useUpdater.js      # Update functionality
├── stores/                # Pinia state management
│   ├── settings-store.js  # User preferences
│   └── update-store.js    # Update state
├── pages/                 # Route-level components
│   ├── PageIbindex.vue    # Investment companies page
│   ├── PageFbindex.vue    # Real estate companies page
│   ├── PageFunds.vue      # Funds page
│   └── PageDashboard.vue  # Dashboard page
└── layouts/               # Application layouts
    └── MainLayout.vue     # Main application shell
```

### Backend Structure (src-tauri/)
```
src-tauri/
├── src/                   # Rust source code
├── capabilities/          # Tauri capabilities configuration
├── icons/                 # Application icons
├── Cargo.toml            # Rust dependencies
└── tauri.conf.json       # Tauri configuration
```

## Coding Standards and Patterns

### Vue.js Guidelines

#### Component Structure
```vue
<template>
  <!-- Quasar components with Swedish text -->
  <q-page>
    <!-- Component content -->
  </q-page>
</template>

<script setup>
// 1. Vue imports first
import { ref, reactive, onMounted, computed } from 'vue'

// 2. Third-party imports
import { useQuasar } from 'quasar'
import { storeToRefs } from 'pinia'

// 3. Local imports
import { useSettingsStore } from 'src/stores/settings-store'
import { someComposable } from 'src/composables/someComposable'

// Reactive state
const isLoading = ref(false)
const data = reactive({})

// Store usage
const settingsStore = useSettingsStore()
const { darkMode } = storeToRefs(settingsStore)

// Lifecycle
onMounted(async () => {
  try {
    await loadData()
  } catch (error) {
    console.error('❌ Failed to load data:', error)
  }
})

// Methods
const loadData = async () => {
  // Implementation
}
</script>

<style scoped>
/* Component-specific styles */
</style>
```

#### API Request Pattern
```javascript
async function fetchData(params) {
  // 1. Validate parameters
  if (!params?.required) {
    throw new Error('Required parameter missing')
  }
  
  try {
    // 2. Get request options with authentication
    const requestOptions = await getRequestOptions(params, 'apiName')
    
    // 3. Make request with validation
    const response = await fetch(requestOptions.url, requestOptions.options)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    // 4. Process response
    const data = await response.json()
    console.log('✅ Data fetched successfully')
    return data
    
  } catch (error) {
    console.error('❌ API request failed:', error)
    throw error
  }
}
```

### Composables Pattern
```javascript
// src/composables/useFeature.js
import { ref, reactive } from 'vue'

export function useFeature() {
  // Reactive state
  const isLoading = ref(false)
  const error = ref(null)
  const data = reactive({})
  
  // Methods
  const performAction = async (params) => {
    isLoading.value = true
    error.value = null
    
    try {
      // Business logic here
      const result = await apiCall(params)
      Object.assign(data, result)
      return { success: true, data: result }
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      isLoading.value = false
    }
  }
  
  // Return public interface
  return {
    // State
    isLoading: readonly(isLoading),
    error: readonly(error),
    data: readonly(data),
    
    // Methods
    performAction
  }
}
```

### Error Handling

#### API Error Handling
```javascript
try {
  const result = await apiCall()
  // Success handling
} catch (error) {
  // Log error with context
  console.error('❌ Operation failed:', {
    operation: 'apiCall',
    error: error.message,
    timestamp: new Date().toISOString()
  })
  
  // Show user-friendly message in Swedish
  $q.notify({
    type: 'negative',
    message: 'Ett fel uppstod vid hämtning av data',
    caption: error.message
  })
}
```

#### Component Error Boundaries
```vue
<script setup>
import { onErrorCaptured } from 'vue'

// Capture and handle component errors
onErrorCaptured((error, instance, info) => {
  console.error('❌ Component error:', {
    error: error.message,
    component: instance?.$options.name,
    info
  })
  
  // Prevent error from propagating
  return false
})
</script>
```

## State Management

### Pinia Store Pattern
```javascript
// src/stores/feature-store.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useFeatureStore = defineStore('feature', () => {
  // State
  const items = ref([])
  const isLoading = ref(false)
  
  // Getters
  const itemCount = computed(() => items.value.length)
  const hasItems = computed(() => itemCount.value > 0)
  
  // Actions
  const loadItems = async () => {
    isLoading.value = true
    try {
      const result = await api.getItems()
      items.value = result
    } finally {
      isLoading.value = false
    }
  }
  
  const addItem = (item) => {
    items.value.push(item)
  }
  
  // Persist state to localStorage
  watch(items, (newItems) => {
    localStorage.setItem('feature-items', JSON.stringify(newItems))
  }, { deep: true })
  
  // Load initial state
  const savedItems = localStorage.getItem('feature-items')
  if (savedItems) {
    items.value = JSON.parse(savedItems)
  }
  
  return {
    // State
    items,
    isLoading,
    
    // Getters
    itemCount,
    hasItems,
    
    // Actions
    loadItems,
    addItem
  }
})
```

## Testing Guidelines

### Manual Testing Checklist
- [ ] Application starts without errors
- [ ] All pages load correctly
- [ ] API calls complete successfully
- [ ] Data persists correctly
- [ ] Dark/light mode toggle works
- [ ] Update system functions properly
- [ ] No console errors or warnings

### Performance Testing
- [ ] Application startup time < 3 seconds
- [ ] Page navigation is smooth
- [ ] Large datasets load efficiently
- [ ] Memory usage remains stable

## Debugging

### Common Issues and Solutions

#### Build Errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules yarn.lock
yarn install

# Clear Tauri cache
rm -rf src-tauri/target
```

#### Development Server Issues
```bash
# Kill existing processes
pkill -f "vite\|tauri"

# Restart development server
yarn dev
```

#### API Connection Issues
1. Check network connectivity
2. Verify API endpoints are accessible
3. Check console for CORS errors
4. Validate authentication cookies

### Logging and Debugging

#### Console Logging Pattern
```javascript
// Use consistent emoji prefixes for different log types
console.log('🔄 Initializing component')
console.log('✅ Operation completed successfully')
console.error('❌ Operation failed')
console.warn('⚠️ Warning condition detected')
console.log('🌐 Making API request')
console.log('💾 Saving to storage')
console.log('🔍 Searching data')
```

#### Browser DevTools
- Use Vue DevTools for component inspection
- Monitor Network tab for API calls
- Check Application tab for localStorage/IndexedDB
- Use Performance tab for performance analysis

## Contributing

### Git Workflow
```bash
# Create feature branch
git checkout -b feature/description

# Make changes and commit
git add .
git commit -m "Add feature description"

# Push to remote
git push origin feature/description

# Create pull request on GitHub
```

### Commit Message Guidelines
- Use descriptive commit messages
- Start with verb in present tense
- Include context and reasoning
- Reference issue numbers when applicable

### Code Review Checklist
- [ ] Code follows established patterns
- [ ] No console errors or warnings
- [ ] All dependencies are necessary
- [ ] Swedish text for user-facing content
- [ ] Proper error handling implemented
- [ ] Performance considerations addressed

## Dependencies Management

### Updating Dependencies
```bash
# Check for outdated frontend packages
yarn outdated

# Update frontend dependencies
yarn upgrade --latest

# Check for outdated Rust packages
cd src-tauri
cargo outdated

# Update Rust dependencies
cargo update
```

### Adding New Dependencies
```bash
# Add frontend dependency
yarn add package-name

# Add development dependency
yarn add --dev package-name

# Add Rust dependency (in src-tauri/Cargo.toml)
[dependencies]
new-crate = "version"
```

## Release Process

### Version Management
1. Update version in `package.json`
2. Update version in `src-tauri/Cargo.toml`
3. Add changelog entry in `CHANGELOG.md`
4. Test application thoroughly

### Automated Release
```bash
# Automated build and release process
yarn cicd
```

This will:
- Commit all changes with changelog as commit message
- Create a draft GitHub release with version tag
- Build and upload application bundles
- Publish the release automatically

### Manual Release Steps
1. Update version numbers
2. Update CHANGELOG.md
3. Test build: `yarn build`
4. Commit changes: `git commit -m "Release vX.Y.Z"`
5. Create release: `yarn release:draft`
6. Upload build artifacts
7. Publish release: `yarn release:publish`

## Environment Setup

### Development Environment Variables
Create `.env` file in project root:
```env
# Development settings
VITE_DEV_MODE=true
VITE_API_BASE_URL=https://api.example.com
```

### GitHub Token Setup
For release automation:
```bash
# Create personal access token on GitHub
# Export as environment variable
export GH_TOKEN=your_github_token
```

## Troubleshooting

### Common Development Issues

#### Tauri Bundle Errors
- Verify Rust toolchain is up to date: `rustup update`
- Clear Tauri cache: `rm -rf src-tauri/target`
- Check Tauri configuration in `tauri.conf.json`

#### Vite Build Issues
- Clear Vite cache: `rm -rf node_modules/.vite`
- Check for conflicting dependencies
- Verify ES module compatibility

#### API Authentication Issues
- Clear browser cookies and cache
- Check network requests in DevTools
- Verify API endpoints are accessible
- Test authentication flow manually

### Getting Help
- Check existing GitHub issues
- Review documentation in docs/
- Ask questions in project discussions
- Contact maintainers for urgent issues

## Best Practices

### Performance
- Use lazy loading for large components
- Implement proper caching strategies
- Optimize API requests and batching
- Monitor memory usage and cleanup

### Security
- Validate all user inputs
- Sanitize data before storage
- Use proper CORS settings
- Keep dependencies updated

### Maintainability
- Write self-documenting code
- Use consistent naming conventions
- Keep components focused and small
- Document complex business logic

### User Experience
- Provide loading states for async operations
- Show meaningful error messages in Swedish
- Implement proper keyboard navigation
- Follow accessibility guidelines