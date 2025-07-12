# FI Historical Data Tracking - Performance Considerations

## LocalForage vs Custom IndexedDB Implementation

### Current State

Currently, we use LocalForage as a wrapper around IndexedDB for storing historical FI fund data. The data is organized as:
- `funds-{sourceDate}`: Arrays of fund records for each source date
- `holdings-{sourceDate}`: Arrays of holding records for each source date
- `fi-imports`: Import metadata with source dates and quarters
- `fi-quarter-mapping`: Quarter to source date mapping

### LocalForage Limitations

LocalForage provides a simple key-value interface but has limitations for complex queries:

1. **No Secondary Indexes**: LocalForage doesn't support IndexedDB's native secondary indexes
2. **Linear Scanning**: Queries by quarter or date range require iterating through all keys
3. **Limited Query Performance**: No efficient filtering on record properties

### Performance Analysis

#### Current Query Patterns:
- **By Quarter**: Need to map quarter → sourceDate → load specific fund/holdings arrays
- **Multi-Quarter**: Load multiple arrays and concatenate
- **By Fund Name**: Linear scan through loaded arrays
- **Date Ranges**: Would require loading and filtering multiple date keys

#### Current Performance Characteristics:
- ✅ **Good**: Single quarter/date lookups (O(1) key access)
- ✅ **Good**: Small datasets (< 1000 records per quarter)
- ⚠️ **Adequate**: Multi-quarter selection (O(n) array operations)
- ❌ **Poor**: Complex filtering across quarters without loading all data

### Custom IndexedDB Implementation Benefits

A custom IndexedDB implementation could provide:

1. **Secondary Indexes** on:
   - `quarter` (for efficient quarter-based queries)
   - `sourceDate` (for date range queries)
   - `fundName` (for efficient fund filtering)
   - `importedAt` (for chronological queries)

2. **Compound Indexes** for:
   - `(quarter, fundName)` for filtered fund lists per quarter
   - `(sourceDate, quarter)` for time-based navigation

3. **Range Queries**:
   - Efficient date range selection
   - Quarter-based pagination
   - Fund name prefix searches

### Implementation Recommendations

#### Keep LocalForage For Now ✅
**Reasons:**
- Current dataset size is manageable (< 50 quarters × ~2000 funds = ~100k records)
- Query patterns are simple (mostly single or few-quarter selections)
- Development complexity vs performance gain doesn't justify custom implementation yet
- LocalForage provides good reliability and cross-browser compatibility

#### Consider Custom IndexedDB When:
- Dataset grows beyond 500k total records
- Complex date range queries become common
- Real-time filtering across multiple quarters is needed
- Performance becomes a user-visible issue (> 500ms query times)

#### Hybrid Approach (Future):
Could implement a custom IndexedDB layer while keeping LocalForage for:
- Settings and simple key-value storage
- Backward compatibility during migration
- Fallback for browsers with IndexedDB issues

### Current Optimizations Applied

1. **Efficient Data Structure**: Organize by source date for O(1) lookups
2. **Lazy Loading**: Only load data for selected quarters
3. **In-Memory Caching**: Keep loaded data in Pinia store
4. **Minimal Data Transfer**: Store separate funds/holdings collections
5. **Quarter Mapping**: Persistent quarter → sourceDate lookup table

### Performance Monitoring

Current approach should handle:
- ✅ Up to 100 quarters of historical data
- ✅ Up to 5000 funds per quarter  
- ✅ Up to 50k holdings per quarter
- ✅ Multi-quarter comparison (2-5 quarters)
- ✅ Real-time dropdown filtering

**Decision: Continue with LocalForage** for the current implementation while monitoring performance metrics. Consider custom IndexedDB only if dataset size or query complexity significantly increases.

## Implementation Status

### ✅ Completed Features

1. **Data Storage Structure**
   - Organized storage by source date: `funds-{sourceDate}`, `holdings-{sourceDate}`
   - Persistent quarter mapping for robust quarter/sourceDate association
   - Import metadata tracking with `fi-imports` store

2. **Multi-Quarter Selection**
   - Quarter dropdown supports multiple selection
   - Data loading and display for multiple quarters simultaneously
   - Quarter column added to table when multiple quarters selected

3. **User Experience Improvements**
   - Quarter selector moved to left of search field
   - Sticky progress notifications during bulk import
   - Auto-selection of latest quarter on first import
   - Always have a quarter selected when data is available

4. **Import Process**
   - Bulk historical import with progress tracking
   - Table updates as soon as latest data is imported
   - Proper error handling and user feedback
   - Import deduplication (skip already imported dates)

5. **Data Reactivity**
   - Table rows computed from store state for automatic updates
   - Proper watchers for quarter selection changes
   - Store-driven UI updates

### 🔧 Current Fixes Applied

1. **Fixed dropdown sorting** to show newest quarters first
2. **Fixed reactivity issues** by making table rows computed from store
3. **Fixed sticky notifications** with proper Quasar notification API
4. **Fixed quarter selection logic** with auto-selection fallbacks
5. **Enhanced logging** for better debugging of data flow

### 📋 Testing Checklist

- [ ] Dropdown shows quarters in correct order (newest first)
- [ ] Multi-quarter selection loads and displays data from all selected quarters
- [ ] Quarter column appears when multiple quarters selected
- [ ] Import progress shows sticky notification with file names
- [ ] Table updates immediately when first import completes
- [ ] Always have a quarter selected when data is available
- [ ] Clearing selection auto-selects latest quarter
- [ ] Dropdown shows record counts for each quarter

### 🚀 Next Steps

1. **Validation Testing**: Test all dropdown and multi-quarter functionality
2. **Performance Review**: Monitor query times with larger datasets
3. **UI Polish**: Ensure consistent quarter formatting and labels
4. **Edge Case Handling**: Test with empty datasets, failed imports, etc.
5. **Consider IndexedDB Migration**: Only if performance issues arise with larger datasets