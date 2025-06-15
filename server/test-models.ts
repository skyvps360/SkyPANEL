/**
 * @fileoverview Test script for Gemini model availability and selection
 * @author SkyPANEL Development Team
 * @created 2025-06-15
 * @modified 2025-06-15
 * @version 1.0.0
 */

import { config } from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Load environment variables
config();

/**
 * Test script to list available Gemini models and test AI functionality
 */
async function testModels(): Promise<void> {
    try {
        console.log('🚀 Testing Gemini Model Availability...\n');

        // Prefer GOOGLE_AI_API_KEY; fallback to GEMINI_API_KEY if not set
        const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
        
        if (!apiKey) {
            console.log('❌ API key not found. Please set GOOGLE_AI_API_KEY or GEMINI_API_KEY in your .env file');
            return;
        }

        // Initialize Google AI directly
        const genAI = new GoogleGenerativeAI(apiKey);

        // Test 1: List all available models
        console.log('📋 Listing available models:');
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
        
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        const models = data.models || [];
        
        if (models.length === 0) {
            console.log('❌ No models available');
            return;
        }

        models.forEach((model: any, index: number) => {
            console.log(`  ${index + 1}. ${model.name}`);
            if (model.displayName) {
                console.log(`     Display Name: ${model.displayName}`);
            }
            if (model.supportedGenerationMethods) {
                console.log(`     Methods: ${model.supportedGenerationMethods.join(', ')}`);
            }
        });

        // Test 2: Get best available model (prioritize newest)        console.log('\n🎯 Getting best available model:');
        const geminiModels = models.filter((model: any) => 
            model.name.includes('gemini') && 
            model.supportedGenerationMethods?.includes('generateContent') &&
            !model.displayName?.toLowerCase().includes('vision') && // Skip vision models for text generation
            !model.displayName?.toLowerCase().includes('embedding') // Skip embedding models
        );
        
        // Priority order for model selection (newest and best first)
        const modelPriority = [
            'models/gemini-2.0-flash',
            'models/gemini-2.0-flash-001', 
            'models/gemini-2.0-flash-lite',
            'models/gemini-2.0-flash-lite-001',
            'models/gemini-1.5-pro',
            'models/gemini-1.5-pro-002',
            'models/gemini-1.5-flash',
            'models/gemini-1.5-flash-002',
            'models/gemini-1.5-flash-8b',
            'models/gemini-1.5-flash-8b-001'
        ];
        
        let bestModel = 'gemini-1.5-flash'; // fallback
        
        // Find the highest priority model that's available
        for (const priorityModel of modelPriority) {
            if (geminiModels.some((model: any) => model.name === priorityModel)) {
                bestModel = priorityModel;
                break;
            }
        }
        
        console.log(`  Selected: ${bestModel}`);
        console.log(`  Available Gemini models: ${geminiModels.length}`);

        // Test 3: Test AI functionality with a simple request
        console.log('\n🧠 Testing AI functionality:');
        const testPrompt = 'Hello! Please respond with a brief greeting and confirm you are working properly.';
        console.log(`  Prompt: "${testPrompt}"`);
        
        const modelName = bestModel.startsWith('models/') ? bestModel.replace('models/', '') : bestModel;
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(testPrompt);
        const responseText = result.response.text();
        
        console.log(`  Response: "${responseText}"`);

        console.log('\n✅ All tests completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error);
        
        if (error instanceof Error) {
            console.error('Error details:', {
                message: error.message,
                stack: error.stack?.split('\n').slice(0, 5).join('\n') // First 5 lines of stack
            });
        }

        // Provide helpful troubleshooting tips
        console.log('\n🔧 Troubleshooting tips:');
        console.log('  1. Check that GOOGLE_AI_API_KEY is set in your .env file');
        console.log('  2. Verify your API key has access to the Gemini API');
        console.log('  3. Ensure you have internet connectivity');
        console.log('  4. Check Google AI Studio for API quota and billing status');
        
        process.exit(1);
    }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    testModels();
}

export { testModels };
