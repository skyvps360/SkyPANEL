import { Router } from 'express';
import { db } from '../db';
import { settings } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { SettingsService } from '../settings-service';
import { storage } from '../storage';
import { hubspotService } from '../services/communication/hubspot-service';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Function to check if user is admin
function isAdmin(req: any, res: any, next: any) {
  if (req.isAuthenticated && req.isAuthenticated() && req.user?.role === 'admin') {
    return next();
  }
  return res.status(403).json({ error: 'Admin access required' });
}

// Configure multer for logo uploads
const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Determine correct public directory (production build vs dev)
    const prodPublic = path.join(process.cwd(), 'dist/public');
    const devPublic = path.join(process.cwd(), 'client/public');
    const basePublicDir = fs.existsSync(prodPublic) ? prodPublic : devPublic;

    const uploadDir = path.join(basePublicDir, 'uploads/logos');
    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `logo-${uniqueSuffix}${extension}`);
  }
});

const logoUpload = multer({
  storage: logoStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

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

// HubSpot sync endpoint for live chat interactions
router.post('/settings/hubspot/sync-user', async (req, res) => {
  try {
    const { email, firstname, lastname } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    await hubspotService.initialize();

    if (await hubspotService.isEnabled()) {
      console.log(`Syncing user data to HubSpot from live chat: ${email}`);

      // Create or update contact in HubSpot
      await hubspotService.createOrUpdateContact({
        email,
        firstname: firstname || '',
        lastname: lastname || ''
      });

      console.log(`Successfully synced user data to HubSpot from live chat: ${email}`);
      return res.json({ success: true, message: 'User data synced to HubSpot' });
    } else {
      return res.status(400).json({ error: 'HubSpot integration is not enabled' });
    }
  } catch (error: any) {
    console.error('Error syncing user data to HubSpot:', error);
    return res.status(500).json({ error: 'Failed to sync user data to HubSpot' });
  }
});

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

// Get Google Analytics configuration for frontend
router.get('/settings/google-analytics/config', async (req, res) => {
  try {
    const { googleAnalyticsService } = await import('../services/communication/google-analytics-service');

    // Initialize the service
    await googleAnalyticsService.initialize();

    const enabled = await googleAnalyticsService.isEnabled();
    const measurementId = await googleAnalyticsService.getMeasurementId();
    const apiKey = await googleAnalyticsService.getApiKey();
    const customCode = await googleAnalyticsService.getCustomCode();
    const enhancedEcommerce = await googleAnalyticsService.isEnhancedEcommerceEnabled();
    const debugMode = await googleAnalyticsService.isDebugModeEnabled();

    return res.json({
      enabled,
      measurementId,
      apiKey,
      customCode,
      enhancedEcommerce,
      debugMode,
    });
  } catch (error) {
    console.error('Error getting Google Analytics config:', error);
    return res.status(500).json({
      success: false,
      message: `Failed to get Google Analytics config: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
});

// Test Google Analytics connection
router.post('/settings/google-analytics/test-connection', isAdmin, async (req, res) => {
  try {
    const { googleAnalyticsService } = await import('../services/communication/google-analytics-service');

    // Initialize the service
    await googleAnalyticsService.initialize();

    const result = await googleAnalyticsService.testConnection();

    return res.json({
      success: result.success,
      message: result.message,
    });
  } catch (error) {
    console.error('Error testing Google Analytics connection:', error);
    return res.status(500).json({
      success: false,
      message: `Failed to test Google Analytics connection: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
});

// Logo upload endpoint (file-based)
router.post('/settings/logo/upload', isAdmin, logoUpload.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No logo file provided' });
    }

    // Create the public URL path
    const logoUrl = `/uploads/logos/${req.file.filename}`;

    // Get the existing logo file to delete it
    const existingSetting = await db.select().from(settings).where(eq(settings.key, 'company_logo')).limit(1);
    
    if (existingSetting.length > 0 && existingSetting[0].value) {
      // Delete old logo file if it exists
      const oldLogoPath = existingSetting[0].value;
      if (oldLogoPath.startsWith('/uploads/logos/')) {
        const prodPublic = path.join(process.cwd(), 'dist/public');
        const devPublic = path.join(process.cwd(), 'client/public');
        const basePublicDir = fs.existsSync(prodPublic) ? prodPublic : devPublic;
        const oldFilePath = path.join(basePublicDir, oldLogoPath);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
      
      // Update existing setting
      await db.update(settings)
        .set({ value: logoUrl, updatedAt: new Date() })
        .where(eq(settings.key, 'company_logo'));
    } else {
      // Insert new setting
      await db.insert(settings).values({
        key: 'company_logo',
        value: logoUrl
      });
    }

    res.json({ 
      success: true, 
      message: 'Logo uploaded successfully',
      logoUrl: logoUrl
    });
  } catch (error) {
    console.error('Logo upload error:', error);
    
    // Clean up uploaded file if there was an error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      success: false, 
      message: (error as Error).message || 'Failed to upload logo' 
    });
  }
});

// Logo delete endpoint
router.delete('/settings/logo', isAdmin, async (req, res) => {
  try {
    // Get current logo to delete file
    const existingSetting = await db.select().from(settings).where(eq(settings.key, 'company_logo')).limit(1);
    
    if (existingSetting.length > 0 && existingSetting[0].value) {
      const logoPath = existingSetting[0].value;
      if (logoPath.startsWith('/uploads/logos/')) {
        const prodPublic = path.join(process.cwd(), 'dist/public');
        const devPublic = path.join(process.cwd(), 'client/public');
        const basePublicDir = fs.existsSync(prodPublic) ? prodPublic : devPublic;
        const filePath = path.join(basePublicDir, logoPath);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }
    
    // Remove from database
    await db.delete(settings).where(eq(settings.key, 'company_logo'));
    
    res.json({ 
      success: true, 
      message: 'Logo deleted successfully' 
    });
  } catch (error) {
    console.error('Logo delete error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete logo' 
    });
  }
});

export default router;