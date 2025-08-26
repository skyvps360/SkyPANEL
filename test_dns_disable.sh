#!/bin/bash

# Test DNS System Disable Functionality
echo "Testing DNS System Disable Functionality..."

# Start the server in the background
echo "Starting server..."
cd /home/runner/work/SkyPANEL/SkyPANEL
npm run dev &
SERVER_PID=$!

# Wait for server to start
echo "Waiting for server to start..."
sleep 15

# Function to test endpoint
test_endpoint() {
    local endpoint=$1
    local expected_status=$2
    local description=$3
    
    echo -n "Testing $description ($endpoint)... "
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:5000$endpoint" 2>/dev/null || echo "000")
    
    if [ "$response" = "$expected_status" ]; then
        echo "✅ PASS (Status: $response)"
    else
        echo "❌ FAIL (Expected: $expected_status, Got: $response)"
    fi
}

# Test DNS system status endpoint (should work)
test_endpoint "/api/settings/dns-system-status" "200" "DNS system status endpoint"

# Test DNS routes (should work by default since DNS is enabled by default)
test_endpoint "/api/dns-plans" "200" "DNS plans endpoint (should be accessible)"

echo ""
echo "Testing completed!"
echo "Note: Server is running on PID $SERVER_PID"
echo "Kill server with: kill $SERVER_PID"

# Don't kill server automatically so it can be tested manually
echo "Server left running for manual testing..."