/**
 * Test script to verify quarter comparison logic
 */

// Import the comparison function
import { compareQuarters, formatQuarterForDisplay } from './src/api/fiHistoricalUtils.js';

// Test data
const testQuarters = [
  '2023Q1',
  '2025Q1', 
  '2024Q4',
  '2024Q1',
  '2025Q2',
  '2023Q4'
];

console.log('🔍 Testing quarter sorting...');
console.log('Original:', testQuarters);

const sorted = [...testQuarters].sort(compareQuarters);
console.log('Sorted (newest first):', sorted);

// Test formatting
console.log('\n🔍 Testing quarter formatting...');
testQuarters.forEach(quarter => {
  console.log(`${quarter} → ${formatQuarterForDisplay(quarter)}`);
});

// Expected order should be: 2025Q2, 2025Q1, 2024Q4, 2024Q1, 2023Q4, 2023Q1
const expected = ['2025Q2', '2025Q1', '2024Q4', '2024Q1', '2023Q4', '2023Q1'];
const isCorrect = JSON.stringify(sorted) === JSON.stringify(expected);

console.log('\n✅ Expected:', expected);
console.log(isCorrect ? '✅ Quarter sorting is correct!' : '❌ Quarter sorting is incorrect!');
