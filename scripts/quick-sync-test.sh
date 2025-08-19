#!/bin/bash

# SkyPANEL Server Synchronization Quick Test Script
# This script helps Linux users quickly test the server synchronization system

echo "🔄 SkyPANEL Server Synchronization Quick Test"
echo "============================================="
echo ""

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found!"
    echo "   Please create a .env file with DATABASE_URL and other required variables."
    echo "   Example .env content:"
    echo ""
    echo "   DATABASE_URL=\"postgresql://user:password@localhost:5432/skypanel\""
    echo "   VIRTFUSION_API_URL=\"https://your-panel.com/api/v1\""
    echo "   VIRTFUSION_API_TOKEN=\"your-api-token\""
    echo ""
    exit 1
fi

# Source environment variables
export $(cat .env | grep -v '^#' | xargs)

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL is not set in .env file"
    echo "   Please add DATABASE_URL to your .env file"
    exit 1
fi

echo "✅ Environment configuration found"
echo ""

# Check if application is built
if [ ! -d "dist" ]; then
    echo "📦 Building application..."
    npm run build
    if [ $? -ne 0 ]; then
        echo "❌ Build failed!"
        exit 1
    fi
    echo "✅ Build completed"
    echo ""
fi

# Test database connection
echo "🗄️  Testing database connection..."
npx tsx -e "
import { Pool } from '@neondatabase/serverless';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  const client = await pool.connect();
  await client.query('SELECT 1');
  console.log('✅ Database connection successful');
  client.release();
  await pool.end();
} catch (error) {
  console.log('❌ Database connection failed:', error.message);
  process.exit(1);
}
"

if [ $? -ne 0 ]; then
    exit 1
fi

echo ""

# Run server synchronization test
echo "🧪 Running server synchronization test..."
echo ""
npx tsx scripts/test-server-sync.ts

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 All tests passed! Server synchronization system is working correctly."
    echo ""
    echo "Next steps:"
    echo "1. Start the application: npm start"
    echo "2. Access the web interface: http://localhost:3333"
    echo "3. Navigate to Servers page and click 'Sync Servers'"
    echo "4. Configure VirtFusion API settings in Admin → Settings"
    echo ""
else
    echo ""
    echo "❌ Some tests failed. Please check the error messages above."
    echo ""
    echo "Common solutions:"
    echo "1. Ensure DATABASE_URL is correct"
    echo "2. Verify database is accessible"
    echo "3. Check VirtFusion API configuration"
    echo "4. Review application logs"
    echo ""
fi
