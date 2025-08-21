import { Router } from 'express';
import { db } from '../db';
import { settings } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { SettingsService } from '../settings-service';
import { storage } from '../storage';
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

// Get DNS system status
router.get('/settings/dns-system/status', isAdmin, async (req, res) => {
  try {
    const enabled = await SettingsService.isDnsSystemEnabled();
    return res.json({ enabled });
  } catch (error) {
    console.error('Error getting DNS system status:', error);
    return res.status(500).json({ error: 'Failed to get DNS system status' });
  }
});

// Toggle DNS system
router.put('/settings/dns-system/toggle', isAdmin, async (req, res) => {
  try {
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'Enabled must be a boolean value' });
    }

    await SettingsService.setDnsSystemEnabled(enabled);
    return res.json({ message: 'DNS system status updated successfully', enabled });
  } catch (error) {
    console.error('Error toggling DNS system:', error);
    return res.status(500).json({ error: 'Failed to toggle DNS system' });
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