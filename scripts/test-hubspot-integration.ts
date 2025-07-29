#!/usr/bin/env tsx

import { hubspotService } from '../server/services/communication/hubspot-service';
import { storage } from '../server/storage';

async function testHubSpotIntegration() {
  try {
    console.log('🧪 Testing HubSpot Integration...\n');

    // Initialize the service
    console.log('1. Initializing HubSpot service...');
    await hubspotService.initialize();
    console.log('✅ HubSpot service initialized\n');

    // Check if HubSpot is enabled
    console.log('2. Checking if HubSpot is enabled...');
    const isEnabled = await hubspotService.isEnabled();
    console.log(`HubSpot enabled: ${isEnabled}`);
    
    if (!isEnabled) {
      console.log('❌ HubSpot is not enabled. Please enable it in the admin settings first.');
      return;
    }
    console.log('✅ HubSpot is enabled\n');

    // Test connection
    console.log('3. Testing HubSpot connection...');
    const connectionResult = await hubspotService.testConnection();
    console.log(`Connection result: ${connectionResult.success ? '✅ Success' : '❌ Failed'}`);
    console.log(`Message: ${connectionResult.message}\n`);

    if (!connectionResult.success) {
      console.log('❌ HubSpot connection failed. Please check your API key and portal ID.');
      return;
    }

    // Test contact creation
    console.log('4. Testing contact creation...');
    const testContact = {
      email: 'test@example.com',
      firstname: 'Test',
      lastname: 'User',
      company: 'Test Company',
      phone: '+1234567890'
    };

    try {
      const contact = await hubspotService.createOrUpdateContact(testContact);
      console.log('✅ Contact created/updated successfully');
      console.log(`Contact ID: ${contact.id}\n`);
    } catch (error) {
      console.log('❌ Failed to create contact:', error);
      console.log('This might be due to API permissions or invalid data\n');
    }

    // Test ticket creation
    console.log('5. Testing ticket creation...');
    const isTicketEnabled = await hubspotService.isTicketEnabled();
    console.log(`Ticket sync enabled: ${isTicketEnabled}`);

    if (isTicketEnabled) {
      try {
        const testTicket = {
          subject: 'Test Ticket from SkyPANEL',
          content: 'This is a test ticket created by the SkyPANEL integration test script.',
          email: 'test@example.com',
          priority: 'MEDIUM',
          category: 'general'
        };

        const ticket = await hubspotService.createTicket(testTicket);
        console.log('✅ Ticket created successfully');
        console.log(`Ticket ID: ${ticket.id}\n`);
      } catch (error) {
        console.log('❌ Failed to create ticket:', error);
        console.log('This might be due to API permissions or ticket sync not properly configured\n');
      }
    } else {
      console.log('ℹ️  Ticket sync is not enabled. Skipping ticket creation test.\n');
    }

    // Test chat configuration
    console.log('6. Testing chat configuration...');
    const isChatEnabled = await hubspotService.isChatEnabled();
    console.log(`Chat enabled: ${isChatEnabled}`);

    if (isChatEnabled) {
      const chatConfig = await hubspotService.getChatWidgetConfig();
      if (chatConfig) {
        console.log('✅ Chat widget configuration available');
        console.log(`Portal ID: ${chatConfig.portalId}\n`);
      } else {
        console.log('❌ Chat widget configuration not available\n');
      }
    } else {
      console.log('ℹ️  Chat is not enabled. Skipping chat configuration test.\n');
    }

    console.log('🎉 HubSpot integration test completed!');
    console.log('\n📋 Summary:');
    console.log(`- HubSpot enabled: ${isEnabled}`);
    console.log(`- Connection: ${connectionResult.success ? '✅ Working' : '❌ Failed'}`);
    console.log(`- Ticket sync: ${isTicketEnabled ? '✅ Enabled' : '❌ Disabled'}`);
    console.log(`- Chat widget: ${isChatEnabled ? '✅ Enabled' : '❌ Disabled'}`);

  } catch (error) {
    console.error('❌ Error during HubSpot integration test:', error);
  }
}

// Run the test
testHubSpotIntegration().catch(console.error); 