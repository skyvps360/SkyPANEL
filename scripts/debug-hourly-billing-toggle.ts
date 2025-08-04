import 'dotenv/config';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function debugHourlyBillingToggle() {
  try {
    console.log('🔍 Debugging hourly billing toggle...');

    // Check the actual database value
    const setting = await db.execute(sql`
      SELECT "key", "value", "updated_at" 
      FROM "settings" 
      WHERE "key" = 'server_hourly_billing_enabled';
    `);

    console.log('\n📋 Database value:', setting.rows[0]);

    // Simulate the getSettingValue function
    const settings = setting.rows;
    const getSettingValue = (key: string, defaultValue: string = "") => {
      const setting = settings.find(s => s.key === key);
      return setting ? setting.value : defaultValue;
    };

    // Test the conversion
    const rawValue = getSettingValue("server_hourly_billing_enabled", "true");
    const convertedValue = rawValue === "true";
    
    console.log('\n🔧 Form value conversion:');
    console.log('Raw value from DB:', rawValue);
    console.log('Converted to boolean:', convertedValue);
    console.log('Type of raw value:', typeof rawValue);
    console.log('Type of converted value:', typeof convertedValue);

    // Test with different scenarios
    console.log('\n🧪 Testing different scenarios:');
    console.log('"true" === "true":', "true" === "true");
    console.log('"false" === "true":', "false" === "true");
    console.log('"1" === "true":', "1" === "true");
    console.log('"0" === "true":', "0" === "true");

  } catch (error) {
    console.error('❌ Error debugging hourly billing toggle:', error);
  }
}

debugHourlyBillingToggle(); 