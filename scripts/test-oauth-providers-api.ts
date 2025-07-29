import 'dotenv/config';

async function testOAuthProvidersAPI() {
  try {
    console.log('Testing OAuth providers API endpoint...');
    
    // Test the enabled providers endpoint
    const response = await fetch('http://localhost:3000/api/oauth/providers/enabled', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Response data:', JSON.stringify(data, null, 2));
      
      if (data.providers && data.providers.length > 0) {
        console.log('\n✅ Found enabled OAuth providers:');
        data.providers.forEach((provider: any, index: number) => {
          console.log(`  ${index + 1}. ${provider.displayName} (${provider.providerName})`);
          console.log(`     Enabled: ${provider.enabled}`);
          console.log(`     Has Client ID: ${!!provider.clientId}`);
          console.log(`     Has Client Secret: ${!!provider.clientSecret}`);
          console.log(`     Has Redirect URL: ${!!provider.redirectUrl}`);
        });
      } else {
        console.log('\n❌ No enabled OAuth providers found');
      }
    } else {
      const errorText = await response.text();
      console.error('❌ API request failed:', errorText);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to test OAuth providers API:', error);
    process.exit(1);
  }
}

// Run the test
testOAuthProvidersAPI(); 