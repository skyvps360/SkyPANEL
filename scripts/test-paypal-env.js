// Test script to verify PayPal environment variables are properly configured
// This simulates what the client-side code would see in production
import 'dotenv/config';

console.log('PayPal Environment Variables Test');
console.log('=================================');

// Simulate the environment variables that would be available in production build
const mockEnv = {
  VITE_PAYPAL_SANDBOX: process.env.VITE_PAYPAL_SANDBOX,
  VITE_PAYPAL_SANDBOX_CLIENT_ID: process.env.VITE_PAYPAL_SANDBOX_CLIENT_ID,
  VITE_PAYPAL_SANDBOX_SECRET: process.env.VITE_PAYPAL_SANDBOX_SECRET,
  VITE_PAYPAL_CLIENT_ID: process.env.VITE_PAYPAL_CLIENT_ID,
  VITE_PAYPAL_SECRET: process.env.VITE_PAYPAL_SECRET,
  VITE_PAYPAL_CURRENCY: process.env.VITE_PAYPAL_CURRENCY,
};

console.log('\nEnvironment Variables:');
Object.entries(mockEnv).forEach(([key, value]) => {
  console.log(`${key}: ${value ? '✅ SET' : '❌ MISSING'}`);
  if (key.includes('SECRET') && value) {
    console.log(`  Value: ${value.substring(0, 10)}...`);
  } else if (value) {
    console.log(`  Value: ${value}`);
  }
});

// Simulate the PayPal configuration logic from App.tsx
const isSandbox = mockEnv.VITE_PAYPAL_SANDBOX === "true";
const clientId = isSandbox 
  ? mockEnv.VITE_PAYPAL_SANDBOX_CLIENT_ID 
  : mockEnv.VITE_PAYPAL_CLIENT_ID;

console.log('\nPayPal Configuration:');
console.log(`Mode: ${isSandbox ? 'SANDBOX' : 'PRODUCTION'}`);
console.log(`Client ID: ${clientId ? '✅ Available' : '❌ Missing'}`);
console.log(`Currency: ${mockEnv.VITE_PAYPAL_CURRENCY || 'USD'}`);

console.log('\nPayPal Integration Status:');
if (clientId) {
  console.log('✅ PayPal should work in production build');
} else {
  console.log('❌ PayPal will NOT work - missing client ID');
}
