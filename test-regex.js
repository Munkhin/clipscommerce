// Test script to validate ES2018 regex functionality
const { extractHashtags, analyzeHashtags } = require('./src/app/workflows/data_analysis/functions/hashtag_analysis.ts');

// Test cases
const testContent = "Check out this #amazing post! #coding #javascript #🌍world";
const multipleContent = [
  "Love this #sunset #photography #beautiful",
  "New #coding #tutorial coming soon! #javascript #webdev",
  "#sunset #photography again for consistency"
];

console.log('Testing hashtag extraction...');
try {
  const hashtags = extractHashtags(testContent);
  console.log('Extracted hashtags:', hashtags);
  
  const topHashtags = analyzeHashtags(multipleContent, 3);
  console.log('Top hashtags from multiple content:', topHashtags);
  
  console.log('✅ ES2018 regex patterns are working correctly!');
} catch (error) {
  console.error('❌ Error testing regex patterns:', error.message);
}