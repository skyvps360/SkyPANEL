// Simple script to verify environment variables are properly loaded
import 'dotenv/config';

console.log('Environment Variable Check:');
console.log('===========================');

console.log('\nPayPal Configuration:');
console.log(`VITE_PAYPAL_SANDBOX: ${process.env.VITE_PAYPAL_SANDBOX}`);
console.log(`VITE_PAYPAL_CLIENT_ID exists: ${!!process.env.VITE_PAYPAL_CLIENT_ID}`);
console.log(`PAYPAL_CLIENT_ID exists: ${!!process.env.PAYPAL_CLIENT_ID}`);
console.log(`VITE_PAYPAL_SECRET exists: ${!!process.env.VITE_PAYPAL_SECRET}`);
console.log(`PAYPAL_SECRET exists: ${!!process.env.PAYPAL_SECRET}`);

console.log('\nSandbox credentials:');
console.log(`VITE_PAYPAL_SANDBOX_CLIENT_ID exists: ${!!process.env.VITE_PAYPAL_SANDBOX_CLIENT_ID}`);
console.log(`VITE_PAYPAL_SANDBOX_SECRET exists: ${!!process.env.VITE_PAYPAL_SANDBOX_SECRET}`);

// Check if environment is properly set
console.log(`\nNODE_ENV: ${process.env.NODE_ENV}`);

// Summary based on what we found
console.log('\nSummary:');

const isSandbox = process.env.VITE_PAYPAL_SANDBOX === 'true';
console.log(`PayPal Mode: ${isSandbox ? 'SANDBOX' : 'PRODUCTION'}`);

const clientId = isSandbox
  ? process.env.VITE_PAYPAL_SANDBOX_CLIENT_ID
  : (process.env.VITE_PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID);

const clientSecret = isSandbox
  ? process.env.VITE_PAYPAL_SANDBOX_SECRET
  : (process.env.VITE_PAYPAL_SECRET || process.env.PAYPAL_SECRET);

console.log(`Will PayPal work? ${!!clientId && !!clientSecret ? 'YES ✅' : 'NO ❌'}`); 