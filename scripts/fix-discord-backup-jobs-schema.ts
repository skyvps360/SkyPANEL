import 'dotenv/config';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function fixDiscordBackupJobsSchema() {
    console.log('🔧 Fixing discord_backup_jobs table schema...');
    
    try {
        // Add missing columns to discord_backup_jobs table
        console.log('Adding missing columns to discord_backup_jobs table...');
        
        // Add progress column
        await db.execute(sql`
            ALTER TABLE "discord_backup_jobs" 
            ADD COLUMN IF NOT EXISTS "progress" integer DEFAULT 0;
        `);
        
        // Add current_step column
        await db.execute(sql`
            ALTER TABLE "discord_backup_jobs" 
            ADD COLUMN IF NOT EXISTS "current_step" text;
        `);
        
        // Add cron_expression column
        await db.execute(sql`
            ALTER TABLE "discord_backup_jobs" 
            ADD COLUMN IF NOT EXISTS "cron_expression" text;
        `);
        
        // Add is_active column
        await db.execute(sql`
            ALTER TABLE "discord_backup_jobs" 
            ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
        `);
        
        // Add backup_name column
        await db.execute(sql`
            ALTER TABLE "discord_backup_jobs" 
            ADD COLUMN IF NOT EXISTS "backup_name" text NOT NULL DEFAULT 'Backup';
        `);
        
        // Add include_messages column
        await db.execute(sql`
            ALTER TABLE "discord_backup_jobs" 
            ADD COLUMN IF NOT EXISTS "include_messages" boolean DEFAULT false NOT NULL;
        `);
        
        // Add next_run column
        await db.execute(sql`
            ALTER TABLE "discord_backup_jobs" 
            ADD COLUMN IF NOT EXISTS "next_run" timestamp;
        `);
        
        // Add metadata column
        await db.execute(sql`
            ALTER TABLE "discord_backup_jobs" 
            ADD COLUMN IF NOT EXISTS "metadata" json DEFAULT '{}';
        `);
        
        // Add updated_at column
        await db.execute(sql`
            ALTER TABLE "discord_backup_jobs" 
            ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;
        `);
        
        console.log('✅ Successfully added missing columns to discord_backup_jobs table');
        
        // Verify the schema
        console.log('🔍 Verifying table schema...');
        const result = await db.execute(sql`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'discord_backup_jobs'
            ORDER BY ordinal_position;
        `);
        
        console.log('Current discord_backup_jobs table schema:');
        result.rows.forEach((row: any) => {
            console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable}, default: ${row.column_default})`);
        });
        
        console.log('✅ Discord backup jobs schema fix completed successfully!');
        
    } catch (error) {
        console.error('❌ Error fixing discord backup jobs schema:', error);
        throw error;
    }
}

fixDiscordBackupJobsSchema()
    .then(() => {
        console.log('✅ Schema fix completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Schema fix failed:', error);
        process.exit(1);
    });