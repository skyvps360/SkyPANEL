#!/usr/bin/env node

/**
 * @fileoverview Test script to list available Gemini models
 * @author SkyPANEL Development Team
 * @created 2025-06-15
 * @version 1.0.0
 */

// Load environment variables
require('dotenv').config();

// Import the Gemini service
const { geminiService } = require('./gemini-service');

/**
 * Main test function
 */
async function testModels() {
    console.log('🚀 Starting Gemini Models Test...\n');
    
    try {
        // Test if service is ready
        if (!geminiService.isReady()) {
            console.error('❌ Gemini service is not ready. Please check your API keys in .env file');
            console.log('Required: GOOGLE_AI_API_KEY or GEMINI_API_KEY');
            process.exit(1);
        }
        
        console.log('✅ Gemini service is ready\n');
        
        // List all available models
        await geminiService.testAvailableModels();
        
        console.log('\n🧪 Testing a simple request...');
        
        // Test a simple chat request
        const testResult = await geminiService.generateChatResponse(
            'Hello, can you tell me about VPS hosting?',
            'TestUser'
        );
        
        if (testResult.success) {
            console.log('✅ Test request successful!');
            console.log(`📝 Response: ${testResult.response.substring(0, 100)}...`);
        } else {
            console.error('❌ Test request failed:', testResult.response);
        }
        
    } catch (error) {
        console.error('💥 Error during testing:', error.message);
        
        if (error.message.includes('API_KEY')) {
            console.log('\n🔑 Make sure your Google AI API key is set in the .env file:');
            console.log('GOOGLE_AI_API_KEY=your_api_key_here');
        }
    }
    
    console.log('\n🏁 Test completed');
}

// Run the test
testModels().catch(console.error);
