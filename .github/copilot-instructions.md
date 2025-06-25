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
