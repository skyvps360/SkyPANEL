import { Router } from 'express';
import { storage } from "../storage";
import { z } from 'zod';

const router = Router();

// Get all settings
router.get('/', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    const settings = await storage.getAllSettings();
    
    // Transform settings into a more usable format
    const formattedSettings = settings.reduce((obj, setting) => {
      obj[setting.key] = setting.value;
      return obj;
    }, {});
    
    return res.json(formattedSettings);
  } catch (error: any) {
    console.error('Error getting settings:', error);
    return res.status(500).json({ message: 'An error occurred while getting settings' });
  }
});

// Get award system status (no auth required for navigation)
router.get('/award-system-status', async (req, res) => {
  try {
    const { SettingsService } = await import('../settings-service');
    const enabled = await SettingsService.isAwardSystemEnabled();
    res.json({ enabled });
  } catch (error) {
    console.error('Error fetching award system status:', error);
    res.status(500).json({ error: 'Failed to fetch award system status' });
  }
});

// Get setting by key
router.get('/:key', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    const key = req.params.key;
    const setting = await storage.getSetting(key);
    
    if (!setting) {
      return res.status(404).json({ message: 'Setting not found' });
    }
    
    return res.json(setting);
  } catch (error: any) {
    console.error('Error getting setting:', error);
    return res.status(500).json({ message: 'An error occurred while getting setting' });
  }
});

// Update setting
router.put('/:key', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    const key = req.params.key;
    
    const schema = z.object({
      value: z.any()
    });
    
    const validationResult = schema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Invalid input',
        errors: validationResult.error.errors
      });
    }
    
    const { value } = validationResult.data;
    
    // Check if setting exists
    const existingSetting = await storage.getSetting(key);
    
    if (!existingSetting) {
      // Create new setting
      const newSetting = await storage.createSetting(key, value);
      return res.json(newSetting);
    }
    
    // Update existing setting
    const updatedSetting = await storage.updateSetting(key, value);
    return res.json(updatedSetting);
  } catch (error: any) {
    console.error('Error updating setting:', error);
    return res.status(500).json({ message: 'An error occurred while updating setting' });
  }
});

// Delete setting
router.delete('/:key', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    const key = req.params.key;
    
    // Check if setting exists
    const existingSetting = await storage.getSetting(key);
    
    if (!existingSetting) {
      return res.status(404).json({ message: 'Setting not found' });
    }
    
    // Delete setting
    await storage.deleteSetting(key);
    
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting setting:', error);
    return res.status(500).json({ message: 'An error occurred while deleting setting' });
  }
});

// Get branding settings
router.get('/branding/all', async (req, res) => {
  try {
    const brandingSettings = await storage.getBrandingSettings();
    return res.json(brandingSettings);
  } catch (error: any) {
    console.error('Error getting branding settings:', error);
    return res.status(500).json({ message: 'An error occurred while getting branding settings' });
  }
});

// Update branding settings
router.put('/branding/update', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    const schema = z.object({
      company_name: z.string().optional(),
      logo_url: z.string().optional(),
      favicon_url: z.string().optional(),
      primary_color: z.string().optional(),
      secondary_color: z.string().optional(),
      custom_css: z.string().optional(),
      custom_js: z.string().optional(),

    });
    
    const validationResult = schema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Invalid input',
        errors: validationResult.error.errors
      });
    }
    
    // Update branding settings
    await storage.updateBrandingSettings(validationResult.data);
    
    // Get updated settings
    const updatedSettings = await storage.getBrandingSettings();
    
    return res.json(updatedSettings);
  } catch (error: any) {
    console.error('Error updating branding settings:', error);
    return res.status(500).json({ message: 'An error occurred while updating branding settings' });
  }
});

// Get VirtFusion settings
router.get('/virtfusion/all', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    const virtFusionSettings = await storage.getVirtFusionSettings();
    
    // Remove sensitive information
    const { api_key, ...safeSettings } = virtFusionSettings;
    
    return res.json({
      ...safeSettings,
      api_key: api_key ? '********' : null
    });
  } catch (error: any) {
    console.error('Error getting VirtFusion settings:', error);
    return res.status(500).json({ message: 'An error occurred while getting VirtFusion settings' });
  }
});

// Update VirtFusion settings
router.put('/virtfusion/update', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    const schema = z.object({
      api_url: z.string().url('Invalid URL').optional(),
      api_key: z.string().optional()
    });
    
    const validationResult = schema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Invalid input',
        errors: validationResult.error.errors
      });
    }
    
    // Update VirtFusion settings
    await storage.updateVirtFusionSettings(validationResult.data);
    
    // Get updated settings
    const updatedSettings = await storage.getVirtFusionSettings();
    
    // Remove sensitive information
    const { api_key, ...safeSettings } = updatedSettings;
    
    return res.json({
      ...safeSettings,
      api_key: api_key ? '********' : null
    });
  } catch (error: any) {
    console.error('Error updating VirtFusion settings:', error);
    return res.status(500).json({ message: 'An error occurred while updating VirtFusion settings' });
  }
});

// Test VirtFusion connection
router.post('/virtfusion/test-connection', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    const schema = z.object({
      api_url: z.string().url('Invalid URL'),
      api_key: z.string()
    });
    
    const validationResult = schema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Invalid input',
        errors: validationResult.error.errors
      });
    }
    
    const { api_url, api_key } = validationResult.data;
    
    // Test connection
    const result = await storage.virtFusionService.testConnection(api_url, api_key);
    
    return res.json({ success: result });
  } catch (error: any) {
    console.error('Error testing VirtFusion connection:', error);
    return res.status(500).json({ 
      success: false,
      message: 'An error occurred while testing VirtFusion connection',
      error: error.message
    });
  }
});

// Get email settings
router.get('/email/all', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    const emailSettings = await storage.getEmailSettings();
    
    // Remove sensitive information
    const { smtp2go_api_key, ...safeSettings } = emailSettings;
    
    return res.json({
      ...safeSettings,
      smtp2go_api_key: smtp2go_api_key ? '********' : null
    });
  } catch (error: any) {
    console.error('Error getting email settings:', error);
    return res.status(500).json({ message: 'An error occurred while getting email settings' });
  }
});

// Update email settings
router.put('/email/update', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    const schema = z.object({
      smtp2go_api_key: z.string().optional(),
      smtp_from: z.string().email('Invalid email address').optional(),
      smtp_from_name: z.string().optional()
    });
    
    const validationResult = schema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Invalid input',
        errors: validationResult.error.errors
      });
    }
    
    // Update email settings
    await storage.updateEmailSettings(validationResult.data);
    
    // Get updated settings
    const updatedSettings = await storage.getEmailSettings();
    
    // Remove sensitive information
    const { smtp2go_api_key, ...safeSettings } = updatedSettings;
    
    return res.json({
      ...safeSettings,
      smtp2go_api_key: smtp2go_api_key ? '********' : null
    });
  } catch (error: any) {
    console.error('Error updating email settings:', error);
    return res.status(500).json({ message: 'An error occurred while updating email settings' });
  }
});

// Test email settings
router.post('/email/test', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    const schema = z.object({
      recipient: z.string().email('Invalid email address')
    });
    
    const validationResult = schema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Invalid input',
        errors: validationResult.error.errors
      });
    }
    
    const { recipient } = validationResult.data;
    
    // Send test email
    await storage.emailService.sendTestEmail(recipient);
    
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Error sending test email:', error);
    return res.status(500).json({ 
      success: false,
      message: 'An error occurred while sending test email',
      error: error.message
    });
  }
});

export default router;