import 'dotenv/config';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function updateSlaUptimeType() {
  try {
    console.log('Starting to update sla_plans table...');

    console.log('Altering uptime_guarantee_percentage column type to REAL...');
    await db.execute(sql`
      ALTER TABLE "sla_plans"
      ALTER COLUMN "uptime_guarantee_percentage" TYPE REAL;
    `);

    console.log('Verifying column type change...');
    const columnTypeResult = await db.execute(sql`
      SELECT data_type FROM information_schema.columns
      WHERE table_name = 'sla_plans' AND column_name = 'uptime_guarantee_percentage';
    `);

    if (columnTypeResult.rows.length > 0) {
        const newType = columnTypeResult.rows[0].data_type;
        console.log(`Successfully changed uptime_guarantee_percentage column type to: ${newType}`);
        if (newType.toLowerCase() !== 'real') {
            console.warn(`Warning: Expected column type to be 'real', but it is '${newType}'. Please verify.`);
        }
    } else {
        throw new Error('Could not verify the column type change for uptime_guarantee_percentage.');
    }

    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Error during SLA uptime type migration:', error);
    process.exit(1);
  }
}

updateSlaUptimeType();
