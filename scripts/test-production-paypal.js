// Test script to verify PayPal configuration in production build
// This script will check if the environment variables are properly embedded

import puppeteer from 'puppeteer';

async function testPayPalProduction() {
  console.log('Testing PayPal Configuration in Production Build');
  console.log('==============================================');

  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Listen for console messages
    const consoleMessages = [];
    page.on('console', msg => {
      consoleMessages.push(msg.text());
    });

    // Navigate to the billing page
    console.log('Navigating to billing page...');
    await page.goto('http://localhost:3000/billing', { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });

    // Wait a bit for the PayPal configuration to be logged
    await page.waitForTimeout(3000);

    // Look for PayPal configuration in console messages
    const paypalConfigMessage = consoleMessages.find(msg => 
      msg.includes('PayPal Configuration:')
    );

    if (paypalConfigMessage) {
      console.log('✅ Found PayPal Configuration in console');
      console.log('Message:', paypalConfigMessage);
    } else {
      console.log('❌ PayPal Configuration not found in console');
    }

    // Check if PayPal SDK script is loaded
    const paypalScript = await page.$('script[src*="paypal.com/sdk/js"]');
    if (paypalScript) {
      const src = await page.evaluate(el => el.src, paypalScript);
      console.log('✅ PayPal SDK script found:', src);
      
      // Check if client-id is in the URL
      if (src.includes('client-id=')) {
        console.log('✅ Client ID is present in PayPal SDK URL');
      } else {
        console.log('❌ Client ID is missing from PayPal SDK URL');
      }
    } else {
      console.log('❌ PayPal SDK script not found');
    }

    // Check for PayPal buttons
    const paypalButtons = await page.$('.paypal-buttons');
    if (paypalButtons) {
      console.log('✅ PayPal buttons container found');
    } else {
      console.log('❌ PayPal buttons container not found');
    }

    console.log('\nAll console messages:');
    consoleMessages.forEach((msg, index) => {
      if (msg.includes('PayPal') || msg.includes('client')) {
        console.log(`${index + 1}: ${msg}`);
      }
    });

  } catch (error) {
    console.error('Error during test:', error.message);
  } finally {
    await browser.close();
  }
}

// Run the test
testPayPalProduction().catch(console.error);
