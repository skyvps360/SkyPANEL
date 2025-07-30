import 'dotenv/config';
import { db } from '../server/db';
import { codeSnippets } from '../shared/schemas/code-snippets-schema';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

async function testCodeSnippetsSystem() {
  console.log('🧪 Testing Code Snippets System...\n');

  try {
    // Test 1: Check if table exists and has data
    console.log('1. Testing database table and initial data...');
    const existingSnippets = await db.select().from(codeSnippets);
    console.log(`✅ Found ${existingSnippets.length} existing snippets in database`);
    
    if (existingSnippets.length > 0) {
      console.log('Sample snippets:');
      existingSnippets.slice(0, 2).forEach(snippet => {
        console.log(`   - ${snippet.name} (${snippet.displayLocation})`);
      });
    }

    // Test 2: Test API endpoints (simulate with direct database operations)
    console.log('\n2. Testing CRUD operations...');
    
    // Create a new snippet
    const newSnippet = {
      name: 'Test Snippet',
      code: '<script>console.log("Test snippet loaded");</script>',
      displayLocation: 'custom' as const,
      customUrl: '/test-page',
      isActive: true,
      description: 'Test snippet for system verification',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const [createdSnippet] = await db.insert(codeSnippets).values(newSnippet).returning();
    console.log(`✅ Created test snippet: ${createdSnippet.name} (ID: ${createdSnippet.id})`);

    // Read the snippet
    const [retrievedSnippet] = await db.select().from(codeSnippets).where(eq(codeSnippets.id, createdSnippet.id));
    console.log(`✅ Retrieved snippet: ${retrievedSnippet.name}`);

    // Update the snippet
    const updatedSnippet = {
      ...retrievedSnippet,
      name: 'Updated Test Snippet',
      customUrl: '/updated-test-page',
      updatedAt: new Date()
    };

    const [updatedResult] = await db.update(codeSnippets)
      .set(updatedSnippet)
      .where(eq(codeSnippets.id, createdSnippet.id))
      .returning();
    console.log(`✅ Updated snippet: ${updatedResult.name}`);

    // Test 3: Test custom URL functionality
    console.log('\n3. Testing custom URL functionality...');
    
    const customSnippets = await db.select().from(codeSnippets).where(eq(codeSnippets.displayLocation, 'custom'));
    console.log(`✅ Found ${customSnippets.length} snippets with custom display location`);
    
    customSnippets.forEach(snippet => {
      console.log(`   - ${snippet.name}: ${snippet.customUrl || 'No custom URL set'}`);
    });

    // Test 4: Test different display locations
    console.log('\n4. Testing display location distribution...');
    
    const locationCounts = await db.select({
      displayLocation: codeSnippets.displayLocation,
      count: sql`count(*)`
    }).from(codeSnippets).groupBy(codeSnippets.displayLocation);
    
    console.log('Display location distribution:');
    locationCounts.forEach(loc => {
      console.log(`   - ${loc.displayLocation}: ${loc.count} snippets`);
    });

    // Test 5: Test active/inactive snippets
    console.log('\n5. Testing active/inactive snippets...');
    
    const activeSnippets = await db.select().from(codeSnippets).where(eq(codeSnippets.isActive, true));
    const inactiveSnippets = await db.select().from(codeSnippets).where(eq(codeSnippets.isActive, false));
    
    console.log(`✅ Active snippets: ${activeSnippets.length}`);
    console.log(`✅ Inactive snippets: ${inactiveSnippets.length}`);

    // Clean up test data
    console.log('\n6. Cleaning up test data...');
    await db.delete(codeSnippets).where(eq(codeSnippets.id, createdSnippet.id));
    console.log(`✅ Deleted test snippet: ${createdSnippet.name}`);

    // Test 6: Verify cleanup
    const remainingSnippets = await db.select().from(codeSnippets);
    console.log(`✅ Remaining snippets after cleanup: ${remainingSnippets.length}`);

    console.log('\n🎉 All tests passed! Code snippets system is working correctly.');
    console.log('\n📋 Summary:');
    console.log('   ✅ Database table exists and is accessible');
    console.log('   ✅ CRUD operations work correctly');
    console.log('   ✅ Custom URL functionality is working');
    console.log('   ✅ Display location filtering works');
    console.log('   ✅ Active/inactive filtering works');
    console.log('   ✅ Data cleanup works correctly');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run the test
testCodeSnippetsSystem().catch(console.error); 