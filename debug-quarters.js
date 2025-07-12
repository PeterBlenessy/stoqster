// Debug script to test quarter mapping
// Run this in the browser console on the Funds page

// Check if FI store is available
if (window.fiStore) {
  console.log('🔍 FI Store found, checking quarter mapping...')
  
  // Check available source dates
  console.log('📅 Available source dates:', window.fiStore.availableSourceDates)
  
  // Check quarter mapping functions
  if (window.fiStore.getQuarterFromMapping) {
    console.log('🔧 Quarter mapping functions available')
  }
  
  // Check imports data
  console.log('📦 Imports:', window.fiStore.imports)
} else {
  console.log('❌ FI Store not found in window object')
  console.log('Available stores:', Object.keys(window).filter(key => key.includes('store') || key.includes('Store')))
}
