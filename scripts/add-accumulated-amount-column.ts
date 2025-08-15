#!/usr/bin/env tsx

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle(sql);

  try {
    console.log('🔧 Adding accumulated_amount column to virtfusion_hourly_billing table...');
    
    // Add the accumulated_amount column with default value 0.000000
    await sql`
      ALTER TABLE virtfusion_hourly_billing 
      ADD COLUMN IF NOT EXISTS accumulated_amount DECIMAL(10,6) NOT NULL DEFAULT '0.000000';
    `;
    
    console.log('✅ Successfully added accumulated_amount column');
    
    // Check if the column was added
    const result = await sql`
      SELECT column_name, data_type, numeric_precision, numeric_scale
      FROM information_schema.columns 
      WHERE table_name = 'virtfusion_hourly_billing' 
      AND column_name = 'accumulated_amount';
    `;
    
    if (result.length > 0) {
      console.log('📊 Column details:', result[0]);
    } else {
      console.error('❌ Column was not added successfully');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Error adding column:', error);
    process.exit(1);
  }
  
  console.log('🎉 Migration completed successfully');
  process.exit(0);
}

main().catch(console.error);