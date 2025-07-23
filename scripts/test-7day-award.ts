import 'dotenv/config';

import { storage } from '../server/storage';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';
import { userLoginStreaks } from '../shared/schemas/awards-schema';

/**
 * Test script to simulate a 7-day login streak for user ID 1
 * and verify that an award is generated when the streak is completed
 */
async function test7DayAward() {
  try {
    console.log('Starting 7-day award test for user ID 1...');
    
    const userId = 1;
    
    // First, create a 7-day award setting if it doesn't exist
    console.log('Creating 7-day award setting...');
    const awardSetting = await storage.createAwardSetting({
      name: 'Weekly Login Reward',
      description: 'Reward for logging in 7 consecutive days',
      loginDaysRequired: 7,
      virtFusionTokens: 50,
      isActive: true
    });
    console.log('Award setting created:', awardSetting);
    
    // Clear any existing login streak for the user to start fresh
    console.log('Clearing existing login streak for user...');
    await db.execute(sql`DELETE FROM user_login_streaks WHERE user_id = ${userId}`);
    await db.execute(sql`DELETE FROM user_awards WHERE user_id = ${userId}`);
    
    // Simulate 7 consecutive days of login by directly manipulating the database
    console.log('Simulating 7 consecutive days of login...');
    
    // Create initial login streak record with yesterday as last login
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1); // Yesterday
    yesterday.setHours(0, 0, 0, 0);
    
    await db.insert(userLoginStreaks).values({
      userId,
      currentStreak: 6,
      longestStreak: 6,
      totalLoginDays: 6,
      lastLoginDate: yesterday
    });
    
    console.log('Created initial 6-day streak, now triggering 7th day...');
    
    // Now call updateUserLoginStreak to trigger the 7th day
    const result = await storage.updateUserLoginStreak(userId);
    console.log(`Final streak: ${result.loginStreak?.currentStreak}, New awards: ${result.newAwards.length}`);
    
    // Check final results
    console.log('\nFinal results:');
    const finalStreak = await storage.getUserLoginStreak(userId);
    console.log('Final login streak:', finalStreak);
    
    const userAwards = await storage.getUserAwards(10, 0, undefined, userId);
    console.log('User awards:', userAwards.awards);
    
    // Verify that a 7-day award was created
    const sevenDayAwards = userAwards.awards.filter(award => 
      award.awardSetting.loginDaysRequired === 7 && award.status === 'pending'
    );
    
    if (sevenDayAwards.length > 0) {
      console.log('\n✅ SUCCESS: 7-day award was successfully generated!');
      console.log('Award details:', sevenDayAwards[0]);
      
      // Test claiming the award
      console.log('\nTesting award claim...');
      const awardToClaim = sevenDayAwards.find(award => award.status === 'pending');
      
      if (awardToClaim) {
        console.log(`Attempting to claim award ID: ${awardToClaim.id}`);
        const claimResult = await storage.claimUserAward(userId, awardToClaim.id);
        console.log('Claim result:', claimResult);
        
        if (claimResult.success) {
          console.log('✅ Award successfully claimed!');
          console.log(`Tokens awarded: ${claimResult.tokensAwarded}`);
        } else {
          console.log(`❌ Award claim failed: ${claimResult.message}`);
        }
      } else {
        console.log('No pending awards found to claim.');
      }
    } else {
      console.log('❌ FAILURE: No 7-day award was generated');
    }
    
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    // Close database connection
    process.exit(0);
  }
}

// Run the test
test7DayAward();