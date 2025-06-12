#!/usr/bin/env tsx

/**
 * Script to fix Discord avatar URLs for existing team members
 * This script updates team members who have incorrect default avatar URLs
 * to use proper Discord avatar URLs based on their Discord user ID
 */

import { db } from '../../server/db';
import { teamMembers } from '../../shared/schemas/team-schema';
import { eq } from 'drizzle-orm';
import { DiscordUtils } from '../../server/discord/discord-utils';

async function fixDiscordAvatars() {
  console.log('🔧 Starting Discord avatar URL fix...');

  try {
    // Get all team members
    const allTeamMembers = await db.select().from(teamMembers);
    console.log(`📋 Found ${allTeamMembers.length} team members`);

    if (allTeamMembers.length === 0) {
      console.log('✅ No team members found, nothing to fix');
      return;
    }

    let updatedCount = 0;

    for (const member of allTeamMembers) {
      console.log(`\n👤 Processing ${member.discordUsername} (ID: ${member.discordUserId})`);
      
      // Check if the current avatar URL is a default embed avatar (the old incorrect format)
      const isDefaultEmbedAvatar = member.discordAvatarUrl?.includes('cdn.discordapp.com/embed/avatars/');
      
      if (isDefaultEmbedAvatar || !member.discordAvatarUrl) {
        console.log(`   🔄 Current avatar URL needs fixing: ${member.discordAvatarUrl || 'null'}`);
        
        try {
          // Get the actual Discord user data
          const discordUser = await DiscordUtils.getDiscordUser(member.discordUserId);
          
          if (discordUser) {
            // Generate the proper Discord avatar URL
            const newAvatarUrl = DiscordUtils.getDiscordAvatarUrl(
              discordUser.id, 
              discordUser.avatar, 
              128
            );
            
            console.log(`   ✨ New avatar URL: ${newAvatarUrl}`);
            
            // Update the team member in the database
            await db.update(teamMembers)
              .set({ 
                discordAvatarUrl: newAvatarUrl,
                updatedAt: new Date()
              })
              .where(eq(teamMembers.id, member.id));
            
            updatedCount++;
            console.log(`   ✅ Updated successfully`);
          } else {
            console.log(`   ⚠️  Could not fetch Discord user data - user may have left the server`);
          }
        } catch (error) {
          console.error(`   ❌ Error updating ${member.discordUsername}:`, error);
        }
      } else {
        console.log(`   ✅ Avatar URL is already correct: ${member.discordAvatarUrl}`);
      }
    }

    console.log(`\n🎉 Fix completed! Updated ${updatedCount} out of ${allTeamMembers.length} team members`);

  } catch (error) {
    console.error('❌ Error during avatar fix:', error);
    process.exit(1);
  }
}

// Run the script
fixDiscordAvatars()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
