# Stoqster Project - Copilot Instructions

## Project Overview

Stoqster is a Tauri-based desktop application for tracking Swedish investment companies (investmentbolag) and funds. It's built with Vue 3, Quasar UI framework, and Tauri v2 for the desktop wrapper.

## Technology Stack

- **Frontend**: Vue 3 with Composition API, Quasar UI framework, Vite build tool
- **Backend**: Tauri v2 with Rust
- **State Management**: Pinia store
- **Data Storage**: LocalForage for client-side storage
- **HTTP Requests**: Tauri HTTP plugin with browser fetch fallback
- **Language**: Swedish UI (all user-facing text should be in Swedish)

## Agentic Programming Guidelines

### Understanding the Codebase

When working on this project, always start by:

1. **Explore the docs/ directory** for comprehensive project documentation
2. **Review existing patterns** in similar components before implementing new features
3. **Check the API integrations** in src/api/ to understand data flow
4. **Examine composables** in src/composables/ for reusable business logic
5. **Look at stores** in src/stores/ for state management patterns

### Making Changes Safely

#### Before Making Changes
- [ ] Run `yarn build` to ensure the project builds successfully
- [ ] Check `git status` to understand current repository state
- [ ] Read relevant documentation in docs/ directory
- [ ] Identify similar existing patterns in the codebase

#### Change Strategy
- [ ] Make minimal, surgical changes that preserve existing functionality
- [ ] Follow established patterns and conventions
- [ ] Test changes incrementally with `yarn tauri dev`
- [ ] Validate that changes don't break existing features

#### After Making Changes
- [ ] Run `yarn tauri build` to verify builds still work
- [ ] Test the specific feature you modified
- [ ] Check for console errors or warnings
- [ ] Verify Swedish text for any user-facing changes

### Troubleshooting Common Issues

#### Build Failures
```bash
# Clear dependencies and reinstall
rm -rf node_modules yarn.lock
yarn install

# Clear Tauri cache
rm -rf src-tauri/target

# Check for TypeScript/ESLint errors
yarn build
```

#### Development Server Issues
```bash
# Kill existing processes
pkill -f "vite|tauri"

# Restart development server
yarn tauri dev
```

#### API Connection Problems
1. Check browser DevTools Network tab for failed requests
2. Verify API endpoints in src/api/ files
3. Check cookie authentication in browser
4. Review console logs for authentication errors
5. Test API endpoints manually in browser

#### State Management Issues
1. Check localStorage in browser DevTools Application tab
2. Verify LocalForage data in IndexedDB
3. Review Pinia store state in Vue DevTools
4. Check for state persistence logic in stores

#### Component Rendering Issues
1. Use Vue DevTools to inspect component state
2. Check for reactive data updates
3. Verify computed properties and watchers
4. Review component lifecycle hooks

### Debugging Patterns

#### Console Logging Strategy
Always use emoji prefixes for consistent debugging:
```javascript
console.log('🔄 Initializing component')
console.log('✅ Operation completed successfully') 
console.log('❌ Operation failed:', error)
console.log('⚠️ Warning condition detected')
console.log('🌐 Making API request to:', url)
console.log('💾 Saving data to storage')
console.log('🔍 Searching/filtering data')
console.log('📱 App lifecycle event')
console.log('⏰ Timer/interval operation')
```

#### Error Investigation Process
1. **Identify the error location** using stack traces
2. **Check recent changes** that might have caused the issue
3. **Review similar working code** for patterns
4. **Test with minimal reproduction** cases
5. **Verify dependencies** and imports are correct

#### Performance Debugging
1. Use browser Performance tab for profiling
2. Check Network tab for slow API calls
3. Monitor memory usage in Task Manager
4. Profile component rendering with Vue DevTools

### Problem-Solving Approach

#### Understanding Existing Code
When modifying existing functionality:
1. **Read the component thoroughly** before making changes
2. **Understand data flow** from API → Composable → Store → Component
3. **Check related components** that might be affected
4. **Review git history** to understand why code was written that way
5. **Look for TODOs and comments** that explain context

#### Implementing New Features
1. **Find similar existing features** to use as templates
2. **Start with the simplest implementation** possible
3. **Follow the established architecture** (composables → stores → components)
4. **Add error handling** and loading states from the beginning
5. **Test edge cases** and error conditions

#### API Integration Best Practices
```javascript
// Always use the established pattern
async function newApiFunction(params) {
  // 1. Validate parameters
  if (!params?.required) {
    throw new Error('Required parameter missing')
  }
  
  try {
    // 2. Use centralized request handling
    const requestOptions = await getRequestOptions(params, 'apiName')
    
    // 3. Make request with proper error handling
    const response = await fetch(requestOptions.url, requestOptions.options)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    // 4. Process and validate response
    const data = await response.json()
    console.log('✅ API request successful')
    return data
    
  } catch (error) {
    console.error('❌ API request failed:', error)
    throw error
  }
}
```

### Testing and Validation Approaches

#### Manual Testing Checklist
For any changes made, verify:
- [ ] Application starts without errors (`yarn tauri dev`)
- [ ] All pages load correctly without console errors
- [ ] API calls complete successfully
- [ ] Data persists correctly (check localStorage/IndexedDB)
- [ ] Swedish text displays properly for any UI changes
- [ ] Dark/light mode toggle works if UI was modified
- [ ] Responsive design works on different window sizes

#### Feature-Specific Testing
- **IBIndex Integration**: Test company listings, details, holdings, events
- **FBIndex Integration**: Test real estate company data and encoding
- **FI Integration**: Test fund data download and processing
- **Update System**: Test update checks and installation process
- **Settings**: Test preferences persistence and restoration
- **Watchlists**: Test adding/removing items and alerts

#### Performance Validation
- **Startup Time**: Application should start in < 3 seconds
- **Navigation**: Page transitions should be < 500ms
- **API Calls**: Should complete in < 5 seconds
- **Memory**: Monitor for memory leaks during extended use
- **Build Size**: Keep bundle size under control

#### Error Scenarios Testing
Always test these common error scenarios:
- Network disconnection during API calls
- Invalid API responses or timeouts
- LocalForage storage failures
- Missing or corrupted user preferences
- Update server unavailability

### Code Modification Best Practices

#### When Adding New Features
1. **Follow the composables pattern**: Business logic goes in src/composables/
2. **Use Pinia for state**: Global state in src/stores/
3. **Implement caching**: Use LocalForage for data persistence
4. **Add loading states**: Show spinners/indicators for async operations
5. **Handle errors gracefully**: Show Swedish error messages to users

#### When Fixing Bugs
1. **Reproduce the bug** first in development environment
2. **Identify the root cause** using debugging tools and logs
3. **Make minimal changes** to fix only the specific issue
4. **Test the fix thoroughly** including edge cases
5. **Verify no regressions** in related functionality

#### When Refactoring Code
1. **Understand the current behavior** completely first
2. **Create before/after diagrams** illustrating component and composable structure changes
3. **Make incremental changes** rather than large rewrites
4. **Preserve existing APIs** that other components depend on
5. **Test after each small change** to catch issues early
6. **Document any behavior changes** in comments
7. **Update architecture documentation** with final diagrams and design decisions

### Working with External APIs

#### Understanding API Integration Architecture
```
Component → Store → Composable → API Service → External API
                               ↓
                          LocalForage Cache
```

#### API Request Flow
1. **Component** triggers action (user interaction)
2. **Store** manages loading state and data
3. **Composable** handles business logic and caching
4. **API Service** manages authentication and requests
5. **Cache** provides fallback and performance

#### Authentication Handling
All external APIs use cookie-based authentication:
- IBIndex: `ibi-tracking` cookie
- FBIndex: `fbi-tracking` cookie  
- FI: No authentication required

Cookies are automatically acquired by visiting the main page and stored globally in the API modules.

#### Error Recovery Patterns
```javascript
// Implement automatic retry with cookie refresh
async function resilientApiCall(apiFunction, ...args) {
  try {
    return await apiFunction(...args)
  } catch (error) {
    if (error.message.includes('401') || error.message.includes('403')) {
      // Clear cookies and retry
      trackingCookie = null
      console.log('🔄 Retrying API call with fresh authentication')
      return await apiFunction(...args)
    }
    throw error
  }
}
```

## Coding Standards

### Vue/JavaScript Guidelines

- Always use Vue 3 Composition API with `<script setup>` syntax
- Use `async/await` for all asynchronous operations, avoid `.then()` chains
- All API request functions must be async and properly handle errors
- Import statements should be organized: Vue imports first, then third-party, then local imports
- Use `ref()` for reactive primitives and `reactive()` for complex objects
- Prefer destructuring with `storeToRefs()` when accessing Pinia store state

### API and HTTP Requests

- All API calls must use the new async pattern with proper cookie authentication
- API request functions should validate parameters and throw descriptive errors
- Always include comprehensive error handling with try/catch blocks
- Use Tauri's HTTP plugin for external API calls (fbindex.se, ibindex.se, fi.se)
- Include proper request headers matching browser requests for CORS compliance
- Implement cookie fetching logic for authenticated requests when required

### Error Handling

- Always wrap API calls in try/catch blocks
- Log errors to console with descriptive context
- Show user-friendly error messages in Swedish using Quasar notify
- Validate function parameters and throw errors for invalid inputs
- Use defensive programming practices for undefined values

### File Organization

- Components go in `src/components/`
- API logic goes in `src/api/`
- Store files go in `src/stores/`
- Pages go in `src/pages/`
- Follow existing naming conventions (PascalCase for components, camelCase for functions)

## Release Process

When making changes that should be released:

1. **Version Bumping**: Update version numbers in both:
   - `package.json` (frontend version)
   - `src-tauri/Cargo.toml` (backend version - use different versioning scheme)

2. **Changelog**: Add detailed entry to `CHANGELOG.md` under new version section:
   - Follow format: `## vX.Y.Z - YYYY-MM-DD`
   - List changes with bullet points using past tense
   - Include technical details about fixes and improvements

3. **Release**: Use the automated CICD script:
   ```bash
   yarn cicd
   ```
   This script will:
   - Commit all changes with changelog as commit message
   - Create a draft GitHub release with version tag
   - Publish the release automatically

## Project-Specific Rules

### API Integrations

- **FBIndex API**: Swedish real estate investment companies data from fbindex.se
- **IBIndex API**: Swedish investment companies data from ibindex.se  
- **FI API**: Swedish fund data from fi.se (Finansinspektionen)

### Data Storage

- Use LocalForage for persistent client-side storage
- Store API responses locally to reduce network requests
- Implement proper cache invalidation strategies

### UI/UX Guidelines

- All user-facing text must be in Swedish
- Use Quasar's notification system for user feedback
- Follow existing color scheme and component patterns
- Tables should be responsive and support filtering/sorting
- Loading states should be implemented for all async operations

### Security

- Enable `unsafe-headers` feature in Tauri HTTP plugin for full header control
- Implement proper CORS handling for external API requests
- Validate all user inputs and API responses
- Use secure storage practices for sensitive data

## Common Patterns

### Component Structure
```vue
<template>
  <!-- Quasar components with Swedish text -->
</template>

<script setup>
// Vue imports
import { ref, onMounted } from 'vue'
// Third-party imports  
import { useQuasar } from 'quasar'
// Local imports
import { apiFunction } from '../api/someAPI.js'

// Component logic with proper error handling
</script>
```

### API Function Structure
```javascript
async function apiFunction(params) {
  // Validate parameters
  if (!params) {
    throw new Error('Invalid parameters')
  }
  
  try {
    // Get request options with authentication
    const requestOptions = await getRequestOptions(params, 'apiName')
    
    // Make request with validation
    const response = await fetch(requestOptions.url, requestOptions.options)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error('API error:', error)
    throw error
  }
}
```

## Dependencies Management

- Use `yarn` as package manager
- Keep dependencies up to date but test thoroughly after updates
- Prefer stable versions over cutting-edge releases
- Add new dependencies only when necessary and well-justified

## Testing and Quality

- Test all changes manually before committing
- Ensure app builds and runs without errors or warnings
- Verify API calls work correctly with authentication
- Check for console errors and resolve them before release
- Validate that all async operations complete successfully

### Logging Guidelines

Use consistent and descriptive console logging with emojis for better debugging and monitoring:

- `🔄` Initialization and setup operations
- `✅` Successful operations and positive outcomes
- `❌` Errors and failures
- `⚠️` Warnings and edge cases
- `📱` App information and metadata
- `📅` Scheduled or time-based operations
- `🚀` Installation or deployment operations
- `📦` Download or data retrieval operations
- `🛑` Stop or termination operations
- `🧹` Cleanup operations
- `🔍` Search or query operations
- `💾` Data storage operations
- `🌐` Network requests
- `⏰` Timing-related operations

Always include context and meaningful error messages in logs for better debugging experience.

### Composables Guidelines

- Create reusable composables in `src/composables/` directory
- Use descriptive names prefixed with `use` (e.g., `useUpdater.js`)
- Export composable functions that return reactive state and methods
- Keep composables focused on a single responsibility
- Document composables with JSDoc comments for complex logic
- Composables should be framework-agnostic logic that can be used by stores or components

#### Architecture Pattern
- **Composables**: Pure business logic, no global state knowledge
- **Stores**: Global state management and persistence
- **Components**: Orchestration between composables and stores

#### Example Flow
```javascript
// Component calls composable
const result = await someComposable.performAction(params)

// Component updates store based on result
if (result.success) {
  store.setState(result.data)
  showNotification('Success')
} else {
  showNotification(result.error)
}
```
