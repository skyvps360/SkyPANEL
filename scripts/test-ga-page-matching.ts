// Test script to verify Google Analytics page matching logic
function testPageMatching() {
  console.log('🧪 Testing Google Analytics page matching logic...');

  const enabledPages = [
    "/",
    "/dashboard",
    "/servers",
    "/billing",
    "/dns",
    "/blog",
    "/docs",
    "/plans",
    "/status",
    "/api-docs"
  ];

  const testPages = [
    "/",
    "/dashboard",
    "/servers",
    "/servers/123",
    "/billing",
    "/billing/transactions",
    "/dns",
    "/dns/domains",
    "/blog",
    "/blog/post-1",
    "/docs",
    "/docs/api",
    "/plans",
    "/status",
    "/api-docs",
    "/admin",
    "/admin/settings",
    "/login",
    "/register"
  ];

  console.log('📋 Testing pages against enabled pages:');
  console.log('Enabled pages:', enabledPages);
  console.log('');

  testPages.forEach(testPage => {
    const isPageEnabled = enabledPages.some((enabledPage: string) => {
      // Exact match
      if (enabledPage === testPage) {
        return true;
      }
      
      // Wildcard match (if page ends with *)
      if (enabledPage.endsWith('*')) {
        const pattern = enabledPage.slice(0, -1);
        return testPage.startsWith(pattern);
      }
      
      // Prefix match (for nested routes) - only if it's not just "/"
      if (enabledPage.endsWith('/') && enabledPage !== '/') {
        return testPage.startsWith(enabledPage);
      }
      
      return false;
    });

    const status = isPageEnabled ? '✅ ENABLED' : '❌ DISABLED';
    console.log(`${status} ${testPage}`);
  });

  console.log('');
  console.log('📊 Summary:');
  const enabledCount = testPages.filter(testPage => {
    return enabledPages.some((enabledPage: string) => {
      if (enabledPage === testPage) return true;
      if (enabledPage.endsWith('*')) {
        const pattern = enabledPage.slice(0, -1);
        return testPage.startsWith(pattern);
      }
      if (enabledPage.endsWith('/') && enabledPage !== '/') {
        return testPage.startsWith(enabledPage);
      }
      return false;
    });
  }).length;

  console.log(`   • Enabled pages: ${enabledCount}/${testPages.length}`);
  console.log(`   • Disabled pages: ${testPages.length - enabledCount}/${testPages.length}`);
}

// Run the test
testPageMatching(); 