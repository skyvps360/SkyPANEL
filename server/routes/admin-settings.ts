import { Router } from 'express';
import { db } from '../db';
import { settings } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { SettingsService } from '../settings-service';
import { storage } from '../storage';

const router = Router();

// Function to check if user is admin
function isAdmin(req: any, res: any, next: any) {
  if (req.isAuthenticated && req.isAuthenticated() && req.user?.role === 'admin') {
    return next();
  }
  return res.status(403).json({ error: 'Admin access required' });
}

// Get all admin settings
router.get('/settings', isAdmin, async (req, res) => {
  try {
    const allSettings = await SettingsService.getAllSettings();
    return res.json(allSettings);
  } catch (error) {
    console.error('Error fetching admin settings:', error);
    return res.status(500).json({ error: 'Failed to fetch admin settings' });
  }
});

// Get a specific setting
router.get('/settings/:key', isAdmin, async (req, res) => {
  try {
    const { key } = req.params;
    const value = await SettingsService.getSetting(key);
    
    if (value === null) {
      return res.status(404).json({ error: 'Setting not found' });
    }
    
    return res.json({ key, value });
  } catch (error) {
    console.error('Error fetching setting:', error);
    return res.status(500).json({ error: 'Failed to fetch setting' });
  }
});

// Update a setting
router.post('/settings', isAdmin, async (req, res) => {
  try {
    const { key, value } = req.body;
    
    if (!key || value === undefined) {
      return res.status(400).json({ error: 'Key and value are required' });
    }
    
    const success = await SettingsService.updateSetting(key, String(value));
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to update setting' });
    }
    
    return res.json({ success: true, key, value });
  } catch (error) {
    console.error('Error updating setting:', error);
    return res.status(500).json({ error: 'Failed to update setting' });
  }
});

// Update a setting
router.put('/settings/:key', isAdmin, async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    
    if (!value) {
      return res.status(400).json({ error: 'Value is required' });
    }
    
    await SettingsService.setSetting(key, value);
    return res.json({ message: 'Setting updated successfully' });
  } catch (error) {
    console.error('Error updating setting:', error);
    return res.status(500).json({ error: 'Failed to update setting' });
  }
});

// Get award system status
router.get('/settings/award-system/status', isAdmin, async (req, res) => {
  try {
    const enabled = await SettingsService.isAwardSystemEnabled();
    return res.json({ enabled });
  } catch (error) {
    console.error('Error getting award system status:', error);
    return res.status(500).json({ error: 'Failed to get award system status' });
  }
});

// Toggle award system
router.put('/settings/award-system/toggle', isAdmin, async (req, res) => {
  try {
    const { enabled } = req.body;
    
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'Enabled must be a boolean value' });
    }
    
    await SettingsService.setAwardSystemEnabled(enabled);
    return res.json({ message: 'Award system status updated successfully', enabled });
  } catch (error) {
    console.error('Error toggling award system:', error);
    return res.status(500).json({ error: 'Failed to toggle award system' });
  }
});

// Test HubSpot connection
router.post('/settings/hubspot/test-connection', isAdmin, async (req, res) => {
  try {
    const { hubspotService } = await import('../services/communication/hubspot-service');
    
    // Initialize the service
    await hubspotService.initialize();
    
    // Test the connection
    const result = await hubspotService.testConnection();
    
    return res.json(result);
  } catch (error) {
    console.error('Error testing HubSpot connection:', error);
    return res.status(500).json({ 
      success: false, 
      message: `Failed to test HubSpot connection: ${error instanceof Error ? error.message : 'Unknown error'}` 
    });
  }
});

// Get HubSpot contacts
router.get('/settings/hubspot/contacts', isAdmin, async (req, res) => {
  try {
    const { hubspotService } = await import('../services/communication/hubspot-service');
    
    // Initialize the service
    await hubspotService.initialize();
    
    // Get contacts
    const contacts = await hubspotService.getAllContacts(50);
    
    return res.json({ success: true, contacts });
  } catch (error) {
    console.error('Error getting HubSpot contacts:', error);
    return res.status(500).json({ 
      success: false, 
      message: `Failed to get HubSpot contacts: ${error instanceof Error ? error.message : 'Unknown error'}` 
    });
  }
});

// Create HubSpot contact
router.post('/settings/hubspot/contacts', isAdmin, async (req, res) => {
  try {
    const { hubspotService } = await import('../services/communication/hubspot-service');
    const { email, firstname, lastname, company, phone } = req.body;
    
    // Initialize the service
    await hubspotService.initialize();
    
    // Create contact
    const contact = await hubspotService.createContact({
      email,
      firstname,
      lastname,
      company,
      phone,
    });
    
    return res.json({ success: true, contact });
  } catch (error) {
    console.error('Error creating HubSpot contact:', error);
    return res.status(500).json({ 
      success: false, 
      message: `Failed to create HubSpot contact: ${error instanceof Error ? error.message : 'Unknown error'}` 
    });
  }
});

// Get HubSpot configuration for frontend
router.get('/settings/hubspot/config', async (req, res) => {
  try {
    const { hubspotService } = await import('../services/communication/hubspot-service');
    
    // Initialize the service
    await hubspotService.initialize();
    
    const enabled = await hubspotService.isEnabled();
    const chatEnabled = await hubspotService.isChatEnabled();
    const portalId = await storage.getSetting('hubspot_portal_id');
    
    return res.json({
      enabled,
      chatEnabled,
      portalId: portalId?.value || '',
    });
  } catch (error) {
    console.error('Error getting HubSpot config:', error);
    return res.status(500).json({
      success: false,
      message: `Failed to get HubSpot config: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
});

export default router;